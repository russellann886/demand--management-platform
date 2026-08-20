import { NavLink } from "react-router-dom";
import {
  Clock,
  Package,
  Ticket,
  LayoutGrid,
  Rocket,
  RefreshCw,
  Store,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BOARD_SECTIONS, type MyDemandItem } from "@shared/api.interface";

const SECTION_ICON_MAP: Record<string, LucideIcon> = {
  Package,
  Ticket,
  LayoutGrid,
  Rocket,
  RefreshCw,
  Store,
};

interface MyDemandCardProps {
  demand: MyDemandItem;
}

const STATUS_STYLES: Record<string, string> = {
  待处理: "border-transparent bg-muted text-muted-foreground",
  跟进中: "border-transparent bg-primary text-primary-foreground",
  已完成: "border-transparent bg-emerald-500 text-white",
  已关闭: "border-transparent bg-slate-400 text-white",
};

export const MyDemandCard = ({ demand }: MyDemandCardProps) => {
  const status = demand.status || "待处理";
  const statusClass =
    STATUS_STYLES[status] ?? "border-transparent bg-muted text-muted-foreground";

  return (
    <NavLink
      to={`/demand/${demand.id}`}
      className="group relative block overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-150 hover:-translate-y-1 hover:shadow-md"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-base font-semibold leading-snug text-foreground">
            {demand.title}
          </h3>
          <Badge className={statusClass}>{status}</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {demand.section &&
            (() => {
              const sectionMeta = BOARD_SECTIONS.find(
                (s) => s.name === demand.section,
              );
              const SectionIcon = sectionMeta
                ? (SECTION_ICON_MAP[sectionMeta.icon] ?? LayoutGrid)
                : LayoutGrid;
              return (
                <span className="flex items-center gap-1.5 rounded-md bg-accent px-2 py-1 text-primary">
                  <SectionIcon className="size-3.5" />
                  {demand.section}
                </span>
              );
            })()}
          <span className="flex items-center gap-1.5 rounded-md bg-muted px-2 py-1">
            <Clock className="size-3.5" />
            {demand.createdAt
              ? new Date(demand.createdAt).toLocaleDateString()
              : "—"}
          </span>
        </div>
      </div>
    </NavLink>
  );
};
