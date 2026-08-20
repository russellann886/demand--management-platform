import { useAuth } from '@/auth/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function UserIdentity({ userId }: { userId: string }) {
  const { user } = useAuth();
  const isCurrentUser = user?.id === userId;
  const label = isCurrentUser ? user.displayName : '内部用户';

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <Avatar className="size-5 shrink-0">
        {isCurrentUser && (
          <AvatarImage src={user.avatarUrl ?? undefined} alt={label} />
        )}
        <AvatarFallback>{label.slice(0, 1)}</AvatarFallback>
      </Avatar>
      <span className="truncate text-foreground">{label}</span>
    </span>
  );
}
