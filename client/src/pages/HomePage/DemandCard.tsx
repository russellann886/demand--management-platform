import { NavLink } from "react-router-dom";
import { Building2, Clock } from "lucide-react";
import { SubmitterDisplay } from "@/components/SubmitterDisplay";
import type { DemandListItem } from "@shared/api.interface";

interface DemandCardProps {
  demand: DemandListItem;
}

export const DemandCard = ({ demand }: DemandCardProps) => {
  return (
    <NavLink
      to={`/demand/${demand.id}`}
      className="group relative block overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-150 hover:-translate-y-1 hover:shadow-md"
    >
      <div className="flex flex-col gap-4">
        <h3 className="line-clamp-2 text-base font-semibold leading-snug text-foreground">
          {demand.title}
        </h3>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <SubmitterDisplay
            creator={demand.creator}
            submitterName={demand.submitterName}
            size="small"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 rounded-md bg-muted px-2 py-1">
            <Building2 className="size-3.5" />
            {demand.department || "未填写部门"}
          </span>
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
