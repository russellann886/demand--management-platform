import { useAuth } from '@/auth/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface SubmitterDisplayProps {
  creator: string;
  submitterName: string | null;
  size?: 'small' | 'medium' | 'large';
}

export const SubmitterDisplay = ({
  creator,
  submitterName,
  size = 'small',
}: SubmitterDisplayProps) => {
  const { user } = useAuth();

  if (creator) {
    const isCurrentUser = creator === user?.id;
    const displayName = isCurrentUser ? user.displayName : '内部用户';
    return (
      <span className="inline-flex min-w-0 items-center gap-1.5">
        <Avatar
          className={cn(
            'shrink-0',
            size === 'small'
              ? 'size-5'
              : size === 'medium'
                ? 'size-7'
                : 'size-9',
          )}
        >
          {isCurrentUser && (
            <AvatarImage src={user.avatarUrl ?? undefined} alt={displayName} />
          )}
          <AvatarFallback>{displayName.slice(0, 1)}</AvatarFallback>
        </Avatar>
        <span className="truncate text-foreground">{displayName}</span>
      </span>
    );
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
