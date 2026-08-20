import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { rule as ruleApi } from '@/api';
import type { CreateRuleRequest, RuleType } from '@shared/api.interface';

const schema = z.object({
  name: z.string().min(1, '请输入商品名称'),
  type: z.string().min(1, '请选择类型'),
  reason: z.string().min(1, '请填写申请理由'),
});

type FormData = z.infer<typeof schema>;

const TYPE_OPTIONS: { value: RuleType; label: string }[] = [
  { value: '加白', label: '加白' },
  { value: '加黑', label: '加黑' },
];

interface SubmitRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: string;
  onSuccess?: () => void;
}

const SubmitRuleDialog: React.FC<SubmitRuleDialogProps> = ({
  open,
  onOpenChange,
  section,
  onSuccess,
}) => {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      type: '',
      reason: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const body: CreateRuleRequest = {
        name: data.name,
        type: data.type as RuleType,
        section,
        content: data.name,
        reason: data.reason,
      };
      await ruleApi.create(body);
      toast.success('申请已提交');
      onSuccess?.();
      onOpenChange(false);
      form.reset();
    } catch (err) {
      logger.error('提交申请失败', err instanceof Error ? err.message : String(err));
      toast.error(err instanceof Error ? err.message : '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>申请商品加白/加黑</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>商品名称</FormLabel>
                  <FormControl>
                    <Input placeholder="请输入商品名称" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>类型</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="请选择类型" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>申请理由</FormLabel>
                  <FormControl>
                    <Textarea placeholder="请填写申请理由" rows={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting ? '提交中...' : '提交申请'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default SubmitRuleDialog;
