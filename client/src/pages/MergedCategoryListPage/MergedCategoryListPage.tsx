import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Layers, Inbox, ArrowLeft } from 'lucide-react';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { demandCategory as categoryApi } from '@/api';
import { BOARD_SECTIONS, type DemandCategory, type BoardAdmins } from '@shared/api.interface';
import { useUserSections } from '@/hooks/useUserSections';
import CategoryCard from '../CategoryListPage/CategoryCard';
import BoardCard from '../CategoryListPage/BoardCard';

const MergedCategoryListPage: React.FC = () => {
  const navigate = useNavigate();
  const { sections, isSuperAdmin, isLoading: authLoading } = useUserSections();
  const canAccess = isSuperAdmin || (sections !== null && sections.length > 0);

  const [categories, setCategories] = useState<DemandCategory[]>([]);
  const [boardAdmins, setBoardAdmins] = useState<BoardAdmins | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedBoard = searchParams.get('board');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, admins] = await Promise.all([
        categoryApi.getAllCategories(),
        categoryApi.getBoardAdmins().catch(() => ({} as BoardAdmins)),
      ]);
      setCategories(cats.items);
      setBoardAdmins(admins);
    } catch (err) {
      logger.error('加载栏目失败', err instanceof Error ? err.message : String(err));
      toast.error(err instanceof Error ? err.message : '加载栏目失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canAccess) {
      loadData();
    }
  }, [canAccess, loadData]);

  useEffect(() => {
    if (!authLoading && sections !== null && sections.length === 1 && !selectedBoard) {
      setSearchParams({ board: sections[0] });
    }
  }, [authLoading, sections, selectedBoard, setSearchParams]);

  const boards = useMemo(() => {
    const usedSections = categories
      .map((c) => c.section)
      .filter((s): s is string => Boolean(s));
    const allBoards = new Set([
      ...BOARD_SECTIONS.map((b) => b.name),
      ...usedSections,
    ]);
    let boardList = Array.from(allBoards);
    if (sections !== null) {
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

  const getBoardStatusCounts = (boardName: string): Record<string, number> => {
    const acc: Record<string, number> = { '待处理': 0, '跟进中': 0, '已完成': 0, '已关闭': 0 };
    for (const c of categories) {
      if (c.section === boardName && c.statusCounts) {
        for (const [status, count] of Object.entries(c.statusCounts)) {
          acc[status] = (acc[status] ?? 0) + count;
        }
      }
    }
    return acc;
  };

  const getBoardTotalDemand = (boardName: string): number =>
    categories
      .filter((c) => c.section === boardName)
      .reduce((sum, c) => sum + (c.demandCount ?? 0), 0);

  const filteredCategories = useMemo(
    () =>
      selectedBoard
        ? categories.filter((c) => c.section === selectedBoard)
        : [],
    [categories, selectedBoard],
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

  const handleOpen = (category: DemandCategory) => {
    navigate(`/merged-demands/${category.id}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <Layers className="size-5 text-primary" />
          <div>
            <h1 className="text-xl font-semibold text-foreground">需求整合</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              选择一个工具栏目，进入后管理或整合该栏目下的需求
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-card py-20">
          <div className="flex size-16 items-center justify-center rounded-full bg-accent">
            <Inbox className="size-8 text-primary" />
          </div>
          <p className="text-base text-muted-foreground">
            还没有栏目，请先在需求广场创建工具需求栏目
          </p>
        </div>
      </div>
    );
  }

  if (!selectedBoard) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <Layers className="size-5 text-primary" />
          <div>
            <h1 className="text-xl font-semibold text-foreground">需求整合</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              选择一个板块，查看该板块下的工具需求栏目
            </p>
          </div>
        </div>
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
                statusCounts={getBoardStatusCounts(boardName)}
                totalDemand={getBoardTotalDemand(boardName)}
                admins={boardAdmins?.[boardName]}
                onClick={() => setSearchParams({ board: boardName })}
              />
            );
          })}
        </div>
      </div>
    );
  }

  const currentBoardInfo = boardInfo.get(selectedBoard);

  return (
    <div className="flex flex-col gap-6">
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
          <h1 className="text-xl font-semibold text-foreground">{selectedBoard}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {currentBoardInfo?.description ?? '选择一个工具栏目，进入后管理或整合该栏目下的需求'}
          </p>
        </div>
      </div>

      {filteredCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-card py-20">
          <div className="flex size-16 items-center justify-center rounded-full bg-accent">
            <Inbox className="size-8 text-primary" />
          </div>
          <p className="text-base text-muted-foreground">该板块暂无栏目</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredCategories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              countLabel="条原始需求"
              showStatusProgress
              onOpen={handleOpen}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MergedCategoryListPage;
