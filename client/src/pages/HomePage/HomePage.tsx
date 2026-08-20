import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Plus, Inbox, Loader2, ArrowLeft } from "lucide-react";
import { logger } from "@/lib/logger";

import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { getDemands } from "@/api/demand";
import { demandCategory as categoryApi } from "@/api";
import type { DemandListItem, DemandCategory } from "@shared/api.interface";
import { DemandCard } from "./DemandCard";
import { SubmitDemandDialog } from "./SubmitDemandDialog";
import { CustomDemandForm } from "./CustomDemandForm";
import type { FormFieldDefinition } from "@shared/api.interface";

const PAGE_SIZE = 12;

const HomePage = () => {
  const { categoryId = "" } = useParams();
  const navigate = useNavigate();
  const { hasRole, loading: authLoading } = useAuth();
  const isAdmin = hasRole("demand_admin");

  const [category, setCategory] = useState<DemandCategory | null>(null);
  const [items, setItems] = useState<DemandListItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const customFormFields: FormFieldDefinition[] | null =
    category?.formFields && category.formFields.length > 0
      ? category.formFields
      : null;
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const hasMore = items.length < total;

  const loadCategory = useCallback(async () => {
    try {
      const res = isAdmin
        ? await categoryApi.getAllCategories()
        : await categoryApi.getCategories();
      setCategory(res.items.find((c) => c.id === categoryId) ?? null);
    } catch (error) {
      logger.error("获取栏目信息失败", error);
    }
  }, [categoryId, isAdmin]);

  const loadPage = useCallback(
    async (targetPage: number, reset: boolean) => {
      if (!categoryId) return;
      setLoading(true);
      try {
        const res = await getDemands(categoryId, targetPage, PAGE_SIZE);
        setTotal(res.total);
        setItems((prev) => (reset ? res.items : [...prev, ...res.items]));
        setPage(targetPage);
      } catch (error) {
        logger.error("获取需求列表失败", error);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    },
    [categoryId],
  );

  useEffect(() => {
    if (!authLoading) {
      loadCategory();
      loadPage(1, true);
    }
  }, [authLoading, loadCategory, loadPage]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadPage(page + 1, false);
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, page, loadPage]);

  const handleSuccess = useCallback(() => {
    loadPage(1, true);
    loadCategory();
  }, [loadPage, loadCategory]);

  if (authLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
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
            <h1 className="text-xl font-semibold text-foreground">
              {category?.name ?? "需求广场"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {category?.description || "浏览全员提议，共建需求池"}
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-1.5">
            <Plus className="size-4" />
            提交新需求
          </Button>
        </div>
      </div>

      {initialized && items.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-card py-20">
          <div className="flex size-16 items-center justify-center rounded-full bg-accent">
            <Inbox className="size-8 text-primary" />
          </div>
          <p className="text-base text-muted-foreground">
            还没有人提出需求，来做第一个吧
          </p>
          <Button onClick={() => setDialogOpen(true)} className="gap-1.5">
            <Plus className="size-4" />
            提交新需求
          </Button>
        </div>
      )}

      {items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((demand) => (
            <DemandCard key={demand.id} demand={demand} />
          ))}
        </div>
      )}

      <div ref={sentinelRef} className="flex justify-center py-4">
        {loading && (
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        )}
        {!loading && !hasMore && items.length > 0 && (
          <span className="text-sm text-muted-foreground">没有更多了</span>
        )}
      </div>

      {customFormFields ? (
        <CustomDemandForm
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          categoryId={categoryId}
          formFields={customFormFields}
          onSuccess={handleSuccess}
        />
      ) : (
        <SubmitDemandDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          categoryId={categoryId}
          departments={category?.departments ?? []}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
};

export default HomePage;
