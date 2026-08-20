import { useState, useCallback } from 'react';
import { CheckCircle2, CalendarIcon, Upload, X, Link as LinkIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import dayjs from 'dayjs';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { FileImage } from '@/components/FileImage';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';
import { createDemand } from '@/api/demand';
import { uploadFile } from '@/components/business-ui/api/files/service';
import type {
  FormFieldDefinition,
  CustomFieldValue,
  CustomFields,
} from '@shared/api.interface';

interface CustomDemandFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  formFields: FormFieldDefinition[];
  onSuccess: () => void;
}

export const CustomDemandForm = ({
  open,
  onOpenChange,
  categoryId,
  formFields,
  onSuccess,
}: CustomDemandFormProps) => {
  const [values, setValues] = useState<Record<string, CustomFieldValue>>({});
  const [submitting, setSubmitting] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const setValue = useCallback(
    (fieldId: string, value: CustomFieldValue) => {
      setValues((prev) => ({ ...prev, [fieldId]: value }));
    },
    [],
  );

  const handleImageUpload = async (fieldId: string, file: File) => {
    setUploadingField(fieldId);
    try {
      const result = await uploadFile(file);
      setValue(fieldId, { bucketId: result.bucketId, filePath: result.filePath });
    } catch (error) {
      logger.error('图片上传失败', error);
      toast.error('图片上传失败，请重试');
    } finally {
      setUploadingField(null);
    }
  };

  const resetForm = () => {
    setValues({});
  };

  const handleSubmit = async () => {
    for (const field of formFields) {
      if (field.required) {
        const val = values[field.id];
        if (val === undefined || val === null || val === '') {
          toast.error(`请填写「${field.label}」`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const firstTextField = formFields.find(
        (f) => f.type === 'text' || f.type === 'textarea',
      );
      const titleSource = firstTextField
        ? (values[firstTextField.id] as string) ?? ''
        : '';
      const title =
        titleSource.replace(/<[^>]*>/g, '').trim().slice(0, 50) || '未命名需求';

      const customFields: CustomFields = {};
      for (const field of formFields) {
        const val = values[field.id];
        if (val !== undefined && val !== null && val !== '') {
          customFields![field.id] = val;
        }
      }

      await createDemand({
        categoryId,
        title,
        background: '',
        department: '',
        image: null,
        valueType: null,
        gmvLevel: null,
        efficiencyAffected: null,
        efficiencySavedMinutes: null,
        expectedOnlineTime: null,
        demandType: null,
        isBlocking: null,
        priority: null,
        customFields,
      });

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        resetForm();
        onOpenChange(false);
        onSuccess();
      }, 1400);
    } catch (error) {
      logger.error('提交需求失败', error);
      toast.error('提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (submitting) return;
    if (!next) resetForm();
    onOpenChange(next);
  };

  const renderField = (field: FormFieldDefinition) => {
    const value = values[field.id] ?? '';

    switch (field.type) {
      case 'text':
        return (
          <Input
            value={value as string}
            onChange={(e) => setValue(field.id, e.target.value)}
            placeholder={`请输入${field.label}`}
          />
        );

      case 'textarea':
        return (
          <Textarea
            value={value as string}
            onChange={(e) => setValue(field.id, e.target.value)}
            placeholder={`请输入${field.label}`}
            rows={3}
          />
        );

      case 'date':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  'h-9 w-full justify-start bg-transparent text-left font-normal',
                  !value && 'text-muted-foreground',
                )}
              >
                <CalendarIcon className="mr-2 size-4" />
                {value
                  ? dayjs(value as string).format('YYYY-MM-DD')
                  : '请选择日期'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={value ? new Date(value as string) : undefined}
                onSelect={(date) =>
                  setValue(field.id, date ? date.toISOString() : null)
                }
              />
            </PopoverContent>
          </Popover>
        );

      case 'link':
        return (
          <Input
            type="url"
            value={value as string}
            onChange={(e) => setValue(field.id, e.target.value)}
            placeholder="https://..."
          />
        );

      case 'image':
        return (
          <div className="space-y-2">
            {value && typeof value === 'object' && (
              <div className="relative inline-block">
                <FileImage
                  filePath={(value as { bucketId: string; filePath: string }).filePath}
                  alt={field.label}
                  className="size-24 rounded-lg border border-border object-cover"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute -right-2 -top-2 size-5 rounded-full bg-destructive text-destructive-foreground"
                  onClick={() => setValue(field.id, null)}
                >
                  <X className="size-3" />
                </Button>
              </div>
            )}
            <label>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImageUpload(field.id, file);
                  e.target.value = '';
                }}
              />
              <div
                className={cn(
                  'flex h-24 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border/80 bg-muted/20 text-muted-foreground transition-colors hover:border-primary hover:text-primary hover:bg-accent/30',
                  uploadingField === field.id && 'pointer-events-none opacity-60',
                )}
              >
                <Upload className="size-4" />
                <span className="text-sm">
                  {uploadingField === field.id ? '上传中...' : '点击上传图片'}
                </span>
              </div>
            </label>
          </div>
        );

      case 'select':
        return (
          <Select
            value={(value as string) ?? ''}
            onValueChange={(v) => setValue(field.id, v)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`请选择${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[88vh] flex-col overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-3">
          <DialogTitle className="tracking-tight">提交新需求</DialogTitle>
          <DialogDescription className="text-[13px] leading-relaxed">请填写以下需求信息，标有 * 为必填项</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4 rounded-xl border border-border/60 bg-card p-4 shadow-sm">
          {formFields.map((field) => (
            <div key={field.id} className="space-y-1.5">
              <Label>
                {field.label}
                {field.required && (
                  <span className="ml-0.5 text-destructive/70">*</span>
                )}
              </Label>
              {renderField(field)}
            </div>
          ))}
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-3 border-t border-border/60 bg-card px-6 py-3.5">
          <Button
            type="button"
            variant="ghost"
            disabled={submitting}
            onClick={() => handleOpenChange(false)}
          >
            取消
          </Button>
          <Button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting ? '提交中...' : '提交需求'}
          </Button>
        </div>

        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-lg bg-card/95"
            >
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 240, damping: 16 }}
              >
                <CheckCircle2 className="size-14 text-success" />
              </motion.div>
              <p className="text-lg font-semibold tracking-tight text-foreground">
                需求已提交
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
