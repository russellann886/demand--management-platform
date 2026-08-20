import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useParams, useNavigate } from 'react-router-dom';
import { Sparkles, CheckSquare, X, ArrowLeft, Download } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { useUserSections } from '@/hooks/useUserSections';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { mergedDemand as mergedDemandApi, demand, demandCategory as categoryApi } from '@/api';
import type {
  DemandCategory,
  MergedDemand,
  SourceDemandItem,
} from '@shared/api.interface';

import UnifiedDemandTable from './UnifiedDemandTable';
import ManualMergeDialog from './ManualMergeDialog';
import AIMergeDialog from './AIMergeDialog';
import AddSourcesDialog from './AddSourcesDialog';
import { buildUnifiedRows, getMergedDemandIds } from './unified-rows';
import { collectImagePaths, downloadFilesAsZip } from '@/utils/batch-download';

const MergedDemandPage: React.FC = () => {
  const { categoryId = '' } = useParams();
  const navigate = useNavigate();
  const { sections, isSuperAdmin, isLoading: authLoading } = useUserSections();
  const canAccess = isSuperAdmin || (sections !== null && sections.length > 0);

  const [category, setCategory] = useState<DemandCategory | null>(null);
  const [merged, setMerged] = useState<MergedDemand[]>([]);
  const [sources, setSources] = useState<SourceDemandItem[]>([]);
  const [rawDemands, setRawDemands] = useState<SourceDemandItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [manualOpen, setManualOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addTarget, setAddTarget] = useState<{ id: string; title: string } | null>(
    null,
  );
  const [downloading, setDownloading] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    if (!categoryId) return;
    if (!silent) setLoading(true);
    try {
      const [listRes, sourceRes, catRes] = await Promise.all([
        mergedDemandApi.getMergedDemands(categoryId),
        mergedDemandApi.getSourceDemands(categoryId),
        categoryApi.getAllCategories(),
      ]);
      setMerged(listRes.items);
      setSources(sourceRes.items);
      setRawDemands(sourceRes.items);
      setCategory(catRes.items.find((c) => c.id === categoryId) ?? null);
    } catch (err) {
      logger.error('加载整合需求失败', err instanceof Error ? err.message : String(err));
      toast.error(err instanceof Error ? err.message : '加载整合需求失败');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    if (canAccess) {
      loadData();
    }
  }, [canAccess, loadData]);

  const rows = useMemo(
    () => buildUnifiedRows(merged, rawDemands),
    [merged, rawDemands],
  );

  // AI 候选：仅未整合的原始需求
  const availableSources = useMemo(() => {
    const mergedIds = getMergedDemandIds(merged);
    return sources.filter((s) => !mergedIds.has(s.id));
  }, [sources, merged]);

  const selectedDemandIds = useMemo(
    () => selectedKeys.map((k) => k.replace(/^raw-/, '')),
    [selectedKeys],
  );

  const rawTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of rawDemands) map.set(d.id, d.title);
    return map;
  }, [rawDemands]);

  const selectedTitles = useMemo(
    () => selectedDemandIds.map((id) => rawTitleMap.get(id) ?? id),
    [selectedDemandIds, rawTitleMap],
  );

  if (authLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  if (!canAccess) {
    return <Navigate to="/" replace />;
  }

  if (!loading && !category) {
    return <Navigate to="/merged-demands" replace />;
  }

  const enterSelectionMode = () => {
    setSelectionMode(true);
    setSelectedKeys([]);
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedKeys([]);
  };

  const handleManualMerge = () => {
    if (selectedDemandIds.length < 2) {
      toast.error('请至少勾选 2 条原始需求');
      return;
    }
    setManualOpen(true);
  };

  const handleManualSaved = async () => {
    exitSelectionMode();
    await loadData(true);
  };

  const handleDeleteMerged = async (id: string) => {
    try {
      await mergedDemandApi.deleteMergedDemand(id);
      toast.success('已删除整合需求');
      await loadData(true);
    } catch (err) {
      logger.error('删除失败', err instanceof Error ? err.message : String(err));
      toast.error(err instanceof Error ? err.message : '删除失败');
    }
  };

  const handleAddSource = (mergedId: string, mergedTitle: string) => {
    setAddTarget({ id: mergedId, title: mergedTitle });
    setAddOpen(true);
  };

  const handleBatchDownload = async () => {
    setDownloading(true);
    try {
      const items = collectImagePaths(rawDemands, category?.formFields ?? null);
      const dateStr = new Date().toISOString().slice(0, 10);
      const zipName = `需求图片_${category?.name ?? '导出'}_${dateStr}.zip`;
      await downloadFilesAsZip(items, zipName);
    } catch (err) {
      logger.error('批量下载失败', err instanceof Error ? err.message : String(err));
      toast.error('批量下载失败');
    } finally {
      setDownloading(false);
    }
  };

  const handleReleaseSource = async (mergedId: string, demandId: string) => {
    try {
      const res = await mergedDemandApi.releaseSource(mergedId, demandId);
      toast.success(res.dissolved ? '已释放，整合需求已自动解散' : '已释放该原始需求');
      await loadData(true);
    } catch (err) {
      logger.error('释放失败', err instanceof Error ? err.message : String(err));
      toast.error(err instanceof Error ? err.message : '释放失败');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          返回栏目列表
        </button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              需求整合 · {category?.name ?? ''}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              统一管理原始需求与已整合需求，可手动勾选整合或由 AI 智能识别可合并项
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectionMode ? (
              <>
                <Button onClick={handleManualMerge} disabled={selectedDemandIds.length < 2}>
                  <CheckSquare className="size-4" />
                  整合所选（{selectedDemandIds.length}）
                </Button>
                <Button variant="outline" onClick={exitSelectionMode}>
                  <X className="size-4" />
                  取消
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={enterSelectionMode}>
                  <CheckSquare className="size-4" />
                  手动整合
                </Button>
                <Button onClick={() => setAiOpen(true)}>
                  <Sparkles className="size-4" />
                  AI 智能整合
                </Button>
                <Button variant="outline" onClick={handleBatchDownload} disabled={downloading}>
                  <Download className="size-4" />
                  {downloading ? '打包中...' : '批量下载图片'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {selectionMode && (
        <div className="rounded-lg border border-border bg-accent/40 px-4 py-2.5 text-sm text-muted-foreground">
          请勾选 2 条及以上的原始需求，然后点击「整合所选」填写整合信息（已整合需求行不可勾选）
        </div>
      )}

      <UnifiedDemandTable
        rows={rows}
        loading={loading}
        selectionMode={selectionMode}
        selectedKeys={selectedKeys}
        onSelectedKeysChange={setSelectedKeys}
        onDeleteMerged={handleDeleteMerged}
        onReleaseSource={handleReleaseSource}
        onAddSource={handleAddSource}
        onRefresh={() => loadData(true)}
        formFields={category?.formFields}
      />

      <ManualMergeDialog
        open={manualOpen}
        onOpenChange={setManualOpen}
        categoryId={categoryId}
        selectedDemandIds={selectedDemandIds}
        selectedTitles={selectedTitles}
        onSaved={handleManualSaved}
      />

      <AIMergeDialog
        open={aiOpen}
        onOpenChange={setAiOpen}
        categoryId={categoryId}
        sources={availableSources}
        onSaved={loadData}
      />

      <AddSourcesDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        mergedDemandId={addTarget?.id ?? ''}
        mergedTitle={addTarget?.title ?? ''}
        candidates={availableSources}
        onSaved={loadData}
      />
    </div>
  );
};

export default MergedDemandPage;
