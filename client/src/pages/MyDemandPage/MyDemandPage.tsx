import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { FileText } from "lucide-react";
import { demand as demandApi } from "@/api";
import { logger } from "@/lib/logger";
import type { MyDemandItem } from "@shared/api.interface";
import { MyDemandCard } from "./MyDemandCard";

const MyDemandPage = () => {
  const [items, setItems] = useState<MyDemandItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await demandApi.getMyDemands();
        if (active) setItems(res.items);
      } catch (error) {
        logger.error(
          "加载我的需求失败:",
          error instanceof Error ? error.message : "unknown",
        );
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          我的需求
        </h1>
        <p className="text-sm text-muted-foreground">
          查看你提交过的需求及其当前处理状态
        </p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          加载中...
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-card py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-accent text-primary">
            <FileText className="size-6" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-foreground">
              你还没有提交过需求
            </p>
            <p className="text-xs text-muted-foreground">
              前往需求广场，提交你的第一个需求吧
            </p>
          </div>
          <NavLink
            to="/"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            去需求广场
          </NavLink>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <MyDemandCard key={item.id} demand={item} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MyDemandPage;
