import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { UserSelect } from '@/components/business-ui/user-select';

interface AssigneeButtonProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

export function AssigneeButton({ value, onChange }: AssigneeButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-muted-foreground"
          title="指定负责人"
        >
          <UserPlus className="size-3.5" />
          <span className="text-xs">指定负责人</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="end">
        <UserSelect
          value={value}
          onChange={(val: string | null) => {
            onChange(val);
            setOpen(false);
          }}
          triggerType="search"
          placeholder="搜索用户..."
          size="small"
          defaultOpen
        />
      </PopoverContent>
    </Popover>
  );
}

export default AssigneeButton;
