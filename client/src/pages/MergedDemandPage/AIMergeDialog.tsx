import React, { useEffect, useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
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

interface AIMergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  sources: SourceDemandItem[];
  onSaved: () => void | Promise<void>;
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
      const { suggestions: parsed } =
        await mergedDemandApi.getMergeSuggestions(categoryId);
      setSuggestions(parsed);
      setChecked(parsed.map(() => true));
      if (parsed.length === 0) {
        toast.info('AI 未发现可整合的需求');
      }
    } catch (err) {
      console.error('AI 整合分析失败', err);
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
      console.error('保存整合需求失败', err);
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
