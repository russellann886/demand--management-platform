import React, { useEffect, useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { capabilityClient } from '@lark-apaas/client-toolkit';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { mergedDemand as mergedDemandApi } from '@/api';
import type {
  MergeSuggestion,
  SourceDemandItem,
} from '@shared/api.interface';
import type { DemandMergeAnalyzerOutput } from '@shared/plugin-types';

interface AIMergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  sources: SourceDemandItem[];
  onSaved: () => void | Promise<void>;
}

const MAX_FIELD_LEN = 500;

function truncate(text: string): string {
  if (!text) return '';
  return text.length > MAX_FIELD_LEN
    ? `${text.slice(0, MAX_FIELD_LEN)}...`
    : text;
}

function buildPrompt(sources: SourceDemandItem[]): string {
  const demandData = sources.map((s) => ({
    id: s.id,
    title: s.title,
    background: truncate(s.background),
    department: s.department,
  }));

  return [
    '你是一位资深的产品需求分析专家。下面是一组企业内部需求列表（JSON 数组）：',
    '',
    JSON.stringify(demandData, null, 2),
    '',
    '请判断其中哪些需求在目标、功能或场景上高度相似、可以整合合并。',
    '只输出确实可以整合的分组（每组至少包含 2 条原始需求）；如果没有任何可整合的需求，返回空数组 []。',
    '严格只返回一个 JSON 数组，不要输出任何解释性文字、不要使用 markdown 代码块标记。',
    '数组中每个元素格式为：',
    '{"title": "整合后的需求标题", "reason": "整合说明与合并理由", "demandIds": ["关联的原始需求id", ...]}',
    'demandIds 中只能使用上面列表里出现过的 id。',
  ].join('\n');
}

function parseSuggestions(
  raw: string,
  validIds: Set<string>,
): MergeSuggestion[] {
  let text = raw.trim();
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1 || end < start) {
    throw new Error('AI 返回内容无法解析为整合建议');
  }
  const parsed: unknown = JSON.parse(text.slice(start, end + 1));
  if (!Array.isArray(parsed)) {
    throw new Error('AI 返回内容格式不正确');
  }

  const result: MergeSuggestion[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    const title = typeof obj.title === 'string' ? obj.title : '';
    const reason = typeof obj.reason === 'string' ? obj.reason : '';
    const ids = Array.isArray(obj.demandIds)
      ? obj.demandIds.filter(
          (id): id is string => typeof id === 'string' && validIds.has(id),
        )
      : [];
    if (title && ids.length >= 2) {
      result.push({ title, reason, demandIds: ids });
    }
  }
  return result;
}

const AIMergeDialog: React.FC<AIMergeDialogProps> = ({
  open,
  onOpenChange,
  categoryId,
  sources,
  onSaved,
}) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<MergeSuggestion[] | null>(null);
  const [checked, setChecked] = useState<boolean[]>([]);

  const titleMap = new Map(sources.map((s) => [s.id, s.title]));

  const reset = () => {
    setSuggestions(null);
    setChecked([]);
  };

  useEffect(() => {
    if (!open) reset();
  }, [open]);

  const handleAnalyze = async () => {
    if (sources.length < 2) {
      toast.error('现有原始需求不足 2 条，无法进行整合分析');
      return;
    }
    setAnalyzing(true);
    reset();
    try {
      const prompt = buildPrompt(sources);
      const stream = await capabilityClient
        .load('demand_merge_analyzer')
        .callStream('textGenerate', { prompt });

      let fullText = '';
      for await (const chunk of stream as AsyncIterable<DemandMergeAnalyzerOutput>) {
        fullText += chunk.content || '';
      }

      const validIds = new Set(sources.map((s) => s.id));
      const parsed = parseSuggestions(fullText, validIds);
      setSuggestions(parsed);
      setChecked(parsed.map(() => true));
      if (parsed.length === 0) {
        toast.info('AI 未发现可整合的需求');
      }
    } catch (err) {
      logger.error(
        'AI 整合分析失败',
        err instanceof Error ? err.message : String(err),
      );
      toast.error(
        err instanceof Error
          ? `AI 整合分析失败：${err.message}`
          : 'AI 整合分析失败，请重试',
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const toggle = (index: number) => {
    setChecked((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const handleSave = async () => {
    if (!suggestions) return;
    const adopted = suggestions.filter((_, i) => checked[i]);
    if (adopted.length === 0) {
      toast.error('请至少勾选一个整合分组');
      return;
    }
    setSaving(true);
    try {
      for (const s of adopted) {
        await mergedDemandApi.createMergedDemand({
          categoryId,
          title: s.title,
          reason: s.reason,
          demandIds: s.demandIds,
        });
      }
      toast.success(`已保存 ${adopted.length} 个整合需求`);
      onOpenChange(false);
      await onSaved();
    } catch (err) {
      logger.error('保存整合需求失败', err instanceof Error ? err.message : String(err));
      toast.error(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const checkedCount = checked.filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>AI 智能整合</DialogTitle>
          <DialogDescription>
            AI 将读取全部 {sources.length} 条原始需求并给出整合分组建议，勾选后一次性保存
          </DialogDescription>
        </DialogHeader>

        {suggestions === null ? (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <div className="flex size-14 items-center justify-center rounded-full bg-accent text-primary">
              <Sparkles className="size-7" />
            </div>
            <p className="text-sm text-muted-foreground">
              点击下方按钮，让 AI 分析现有原始需求中的可整合项
            </p>
            <Button onClick={handleAnalyze} disabled={analyzing}>
              {analyzing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  分析中...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  开始分析
                </>
              )}
            </Button>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              AI 未发现可整合的需求，当前需求相对独立
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={handleAnalyze}
              disabled={analyzing}
            >
              重新分析
            </Button>
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3 pr-3">
              {suggestions.map((s, index) => (
                <label
                  key={index}
                  className="flex cursor-pointer gap-3 rounded-xl border border-border bg-card p-4 hover:bg-accent/50"
                >
                  <Checkbox
                    checked={checked[index]}
                    onCheckedChange={() => toggle(index)}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-foreground break-words">
                      {s.title}
                    </h4>
                    <p className="mt-1.5 text-sm text-muted-foreground whitespace-pre-wrap break-words">
                      {s.reason}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {s.demandIds.map((id) => (
                        <Badge key={id} variant="secondary" className="font-normal">
                          {titleMap.get(id) ?? id}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          {suggestions !== null && suggestions.length > 0 && (
            <>
              <Button
                variant="outline"
                onClick={handleAnalyze}
                disabled={analyzing || saving}
              >
                重新分析
              </Button>
              <Button onClick={handleSave} disabled={saving || checkedCount === 0}>
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    保存中
                  </>
                ) : (
                  `保存所选（${checkedCount}）`
                )}
              </Button>
            </>
          )}
          {(suggestions === null || suggestions.length === 0) && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              关闭
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AIMergeDialog;
