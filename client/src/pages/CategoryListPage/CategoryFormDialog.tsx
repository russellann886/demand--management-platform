import React, { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';

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
import { Switch } from '@/components/ui/switch';
import { demandCategory as categoryApi } from '@/api';
import type { DemandCategory, FormFieldDefinition } from '@shared/api.interface';
import FormFieldEditor from './FormFieldEditor';

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: DemandCategory | null;
  defaultSection?: string;
  onSaved: () => void | Promise<void>;
}

const CategoryFormDialog: React.FC<CategoryFormDialogProps> = ({
  open,
  onOpenChange,
  category,
  defaultSection,
  onSaved,
}) => {
  const isEdit = Boolean(category);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [departments, setDepartments] = useState<string[]>([]);
  const [section, setSection] = useState('');
  const [formFields, setFormFields] = useState<FormFieldDefinition[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(category?.name ?? '');
      setDescription(category?.description ?? '');
      setEnabled(category?.enabled ?? true);
      setDepartments(category?.departments ?? []);
      setSection(category?.section ?? defaultSection ?? '');
      setFormFields(category?.formFields ?? []);
    }
  }, [open, category, defaultSection]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('请填写栏目名称');
      return;
    }
    setSubmitting(true);
    try {
      const isContentSection = section === '内容场板块';
      const cleanedDepartments = isContentSection
        ? []
        : departments
            .map((d) => d.trim())
            .filter((d) => d.length > 0);
      const cleanedFormFields = isContentSection
        ? formFields.filter((f) => f.label.trim().length > 0)
        : null;
      if (isEdit && category) {
        await categoryApi.updateCategory(category.id, {
          name: name.trim(),
          description: description.trim(),
          enabled,
          departments: cleanedDepartments,
          section: section || undefined,
          formFields: cleanedFormFields,
        });
        toast.success('已更新栏目');
      } else {
        await categoryApi.createCategory({
          name: name.trim(),
          description: description.trim(),
          departments: cleanedDepartments,
          section: section || undefined,
          formFields: cleanedFormFields,
        });
        toast.success('已创建栏目');
      }
      onOpenChange(false);
      await onSaved();
    } catch (err) {
      logger.error('保存栏目失败', err instanceof Error ? err.message : String(err));
      toast.error(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] flex-col overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-3">
          <DialogTitle className="tracking-tight">{isEdit ? '编辑栏目' : '新建栏目'}</DialogTitle>
          <DialogDescription className="text-[13px] leading-relaxed">
            栏目用于收集用户对某一类工具的需求，仅管理员可创建与管理
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="category-name">栏目名称</Label>
            <Input
              id="category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：数据分析工具"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category-desc">栏目描述</Label>
            <Textarea
              id="category-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简要说明这个栏目用于收集哪一类工具的需求"
              rows={3}
            />
          </div>

          {section !== '内容场板块' && (
            <div className="space-y-2">
              <div>
                <Label>提出部门选项</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  用户在本栏目提交需求时可选择的部门；未配置时使用系统默认列表
                </p>
              </div>
              <div className="space-y-2">
                {departments.map((dep, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={dep}
                      onChange={(e) =>
                        setDepartments((prev) =>
                          prev.map((d, i) => (i === index ? e.target.value : d)),
                        )
                      }
                      placeholder="例如：电商-平台策略与运营"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground"
                      onClick={() =>
                        setDepartments((prev) => prev.filter((_, i) => i !== index))
                      }
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setDepartments((prev) => [...prev, ''])}
                >
                  <Plus className="size-4" />
                  添加部门
                </Button>
              </div>
            </div>
          )}

          {section === '内容场板块' && (
            <FormFieldEditor fields={formFields} onChange={setFormFields} />
          )}

          {isEdit && (
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-4 shadow-sm">
              <div>
                <p className="text-sm font-medium text-foreground">启用栏目</p>
                <p className="text-xs text-muted-foreground">
                  停用后普通用户将无法看到该栏目
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-3 border-t border-border/60 bg-card px-6 py-3.5">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? '保存中...' : '保存'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryFormDialog;
