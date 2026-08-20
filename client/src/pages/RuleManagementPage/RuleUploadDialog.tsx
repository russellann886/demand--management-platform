import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Spinner } from '@/components/ui/spinner';
import { rule as ruleApi } from '@/api';
import { uploadFile } from '@/components/business-ui/api/files/service';
import type { RuleListItem, FileAttachment } from '@shared/api.interface';

const schema = z.object({
  name: z.string().min(1, '请输入规则名称'),
  content: z.string().min(1, '请输入规则描述'),
  scope: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface RuleUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: string;
  editingRule?: RuleListItem | null;
  onSuccess?: () => void;
}

const RuleUploadDialog: React.FC<RuleUploadDialogProps> = ({
  open,
  onOpenChange,
  section,
  editingRule,
  onSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileData, setFileData] = useState<FileAttachment | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', content: '', scope: '' },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: editingRule?.name ?? '',
        content: editingRule?.content ?? '',
        scope: editingRule?.scope ?? '',
      });
      setFileData(editingRule?.file ?? null);
      setFileName(editingRule?.file ? '当前已上传文件' : '');
    }
  }, [open, editingRule, form]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadFile(file, 'rule');
      setFileData({ bucketId: result.bucketId, filePath: result.filePath });
      setFileName(file.name);
      toast.success('文件上传成功');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '文件上传失败');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onSubmit = async (data: FormValues) => {
    if (!editingRule && !fileData) {
      toast.error('请上传规则文件');
      return;
    }
    setSubmitting(true);
    try {
      if (editingRule) {
        await ruleApi.update(editingRule.id, {
          name: data.name,
          content: data.content,
          file: fileData,
          scope: data.scope || undefined,
        });
        toast.success('规则已更新');
      } else {
        await ruleApi.create({
          name: data.name,
          type: '规则',
          section,
          content: data.content,
          file: fileData,
          scope: data.scope || undefined,
        });
        toast.success('规则已上传');
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingRule ? '编辑规则' : '上传规则'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>规则名称</FormLabel>
                  <FormControl>
                    <Input placeholder="请输入规则名称" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>规则描述</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="请输入规则描述"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="scope"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>适用范围（可选）</FormLabel>
                  <FormControl>
                    <Input placeholder="请输入适用范围" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                规则文件
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.xlsx,.pptx,.csv,.txt,.md"
                className="hidden"
                onChange={handleFileSelect}
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Spinner className="size-4" />
                  ) : (
                    <Upload className="size-4" />
                  )}
                  {uploading ? '上传中...' : '选择文件'}
                </Button>
                {fileName && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <FileText className="size-4" />
                    {fileName}
                  </span>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                取消
              </Button>
              <Button type="submit" disabled={submitting || uploading}>
                {submitting ? '提交中...' : editingRule ? '保存' : '上传'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default RuleUploadDialog;
