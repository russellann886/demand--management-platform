import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Inbox, ArrowLeft } from 'lucide-react';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { demandCategory as categoryApi } from '@/api';
import { BOARD_SECTIONS, type DemandCategory } from '@shared/api.interface';
import { useUserSections } from '@/hooks/useUserSections';
import CategoryCard from './CategoryCard';
import BoardCard from './BoardCard';
import CategoryFormDialog from './CategoryFormDialog';

const CategoryListPage: React.FC = () => {
  const navigate = useNavigate();
  const { sections, isSuperAdmin, isLoading: authLoading } = useUserSections();
  const isAdmin = isSuperAdmin || (sections !== null && sections.length > 0);

  const [categories, setCategories] = useState<DemandCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DemandCategory | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedBoard = searchParams.get('board');

  const loadData = useCallback(async (admin: boolean) => {
    setLoading(true);
    try {
      const res = admin
        ? await categoryApi.getAllCategories()
        : await categoryApi.getCategories();
      setCategories(res.items);
    } catch (err) {
      logger.error('加载栏目失败', err instanceof Error ? err.message : String(err));
      toast.error(err instanceof Error ? err.message : '加载栏目失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      loadData(isAdmin);
    }
  }, [authLoading, isAdmin, loadData]);

  useEffect(() => {
    if (!authLoading && sections !== null && sections.length === 1 && !selectedBoard) {
      setSearchParams({ board: sections[0] });
    }
  }, [authLoading, sections, selectedBoard, setSearchParams]);

  const canManageBoard = useMemo(
    () =>
      isSuperAdmin ||
      (sections !== null && selectedBoard !== null && sections.includes(selectedBoard)),
    [isSuperAdmin, sections, selectedBoard],
  );

  const boards = useMemo(() => {
    const usedSections = categories
      .map((c) => c.section)
      .filter((s): s is string => Boolean(s));
    const allBoards = new Set([
      ...BOARD_SECTIONS.map((b) => b.name),
      ...usedSections,
    ]);
    let boardList = Array.from(allBoards);
    if (sections !== null && sections.length > 0) {
      boardList = boardList.filter((b) => sections.includes(b));
    }
    return boardList;
  }, [categories, sections]);

  const boardInfo = useMemo(() => {
    const map = new Map(BOARD_SECTIONS.map((b) => [b.name, b]));
    return map;
  }, []);

  const getBoardCount = (boardName: string) =>
    categories.filter((c) => c.section === boardName).length;

  const filteredCategories = useMemo(
    () =>
      selectedBoard
        ? categories.filter((c) => c.section === selectedBoard)
        : [],
    [categories, selectedBoard],
  );

  const handleOpen = (category: DemandCategory) => {
    navigate(`/category/${category.id}`);
  };

  const handleCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const handleEdit = (category: DemandCategory) => {
    setEditing(category);
    setDialogOpen(true);
  };

  const handleToggleEnabled = async (
    category: DemandCategory,
    next: boolean,
  ) => {
    try {
      await categoryApi.updateCategory(category.id, { enabled: next });
      setCategories((prev) =>
        prev.map((c) => (c.id === category.id ? { ...c, enabled: next } : c)),
      );
      toast.success(next ? '已启用栏目' : '已停用栏目');
    } catch (err) {
      logger.error('切换栏目状态失败', err instanceof Error ? err.message : String(err));
      toast.error(err instanceof Error ? err.message : '操作失败');
    }
  };

  const effectiveSection = selectedBoard ?? (sections?.length === 1 ? sections[0] : undefined);

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {isAdmin && (
          <div className="flex justify-end">
            <Button onClick={handleCreate} className="gap-1.5">
              <Plus className="size-4" />
              新建栏目
            </Button>
          </div>
        )}
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 bg-card py-16">
          <div className="flex size-14 items-center justify-center rounded-full bg-accent">
            <Inbox className="size-7 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? '还没有栏目，创建第一个工具需求栏目吧' : '管理员还未创建任何栏目'}
          </p>
          {isAdmin && (
            <Button onClick={handleCreate} className="gap-1.5">
              <Plus className="size-4" />
              创建第一个栏目
            </Button>
          )}
        </div>
        <CategoryFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          category={editing}
          defaultSection={effectiveSection}
          onSaved={() => loadData(isAdmin)}
        />
      </div>
    );
  }

  if (!selectedBoard) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {boards.map((boardName) => {
            const info = boardInfo.get(boardName);
            return (
              <BoardCard
                key={boardName}
                name={boardName}
                description={info?.description ?? '自定义板块'}
                icon={info?.icon ?? 'LayoutGrid'}
                count={getBoardCount(boardName)}
                onClick={() => setSearchParams({ board: boardName })}
              />
            );
          })}
        </div>
        <CategoryFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          category={editing}
          defaultSection={effectiveSection}
          onSaved={() => loadData(isAdmin)}
        />
      </div>
    );
  }

  const currentBoardInfo = boardInfo.get(selectedBoard);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => setSearchParams({})}
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{selectedBoard}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {currentBoardInfo?.description ?? '选择一个工具栏目，查看并提交对它的需求'}
            </p>
          </div>
        </div>
        {canManageBoard && (
          <Button onClick={handleCreate} className="gap-1.5">
            <Plus className="size-4" />
            新建栏目
          </Button>
        )}
      </div>

      {filteredCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 bg-card py-16">
          <div className="flex size-14 items-center justify-center rounded-full bg-accent">
            <Inbox className="size-7 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">该板块暂无栏目</p>
          {canManageBoard && (
            <Button onClick={handleCreate} className="gap-1.5">
              <Plus className="size-4" />
              创建第一个栏目
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredCategories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              manageMode={canManageBoard}
              onOpen={handleOpen}
              onEdit={handleEdit}
              onToggleEnabled={handleToggleEnabled}
            />
          ))}
        </div>
      )}

      <CategoryFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={editing}
        defaultSection={selectedBoard}
        onSaved={() => loadData(isAdmin)}
      />
    </div>
  );
};

export default CategoryListPage;
