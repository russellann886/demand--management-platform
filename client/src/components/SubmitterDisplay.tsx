import { UserDisplay } from "@/components/business-ui/user-display";

interface SubmitterDisplayProps {
  creator: string;
  submitterName: string | null;
  size?: "small" | "medium" | "large";
}

export const SubmitterDisplay = ({
  creator,
  submitterName,
  size = "small",
}: SubmitterDisplayProps) => {
  if (creator) {
    return <UserDisplay value={[creator]} size={size} />;
  }
  if (submitterName) {
    return (
      <span className="flex items-center gap-1.5">
        <span className="text-foreground">{submitterName}</span>
        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
          外部
        </span>
      </span>
    );
  }
  return <span className="text-muted-foreground">未知提交人</span>;
};
