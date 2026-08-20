import { UserPlus } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AssigneeButtonProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

export function AssigneeButton({ value, onChange }: AssigneeButtonProps) {
  const { user } = useAuth();
  const label = value
    ? value === user?.id
      ? '负责人：我'
      : '已指定负责人'
    : '指定负责人';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-muted-foreground"
          title="指定负责人"
        >
          <UserPlus className="size-3.5" />
          <span className="text-xs">{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {user && (
          <DropdownMenuItem onSelect={() => onChange(user.id)}>
            分配给我（{user.displayName}）
          </DropdownMenuItem>
        )}
        {value && (
          <DropdownMenuItem onSelect={() => onChange(null)}>
            清除负责人
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default AssigneeButton;
