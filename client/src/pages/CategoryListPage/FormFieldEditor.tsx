import React from 'react';
import { Plus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FormFieldDefinition, FormFieldType } from '@shared/api.interface';

const FIELD_TYPE_OPTIONS: { value: FormFieldType; label: string }[] = [
  { value: 'text', label: '单行文本' },
  { value: 'textarea', label: '多行文本' },
  { value: 'date', label: '日期' },
  { value: 'link', label: '链接' },
  { value: 'image', label: '图片' },
  { value: 'select', label: '下拉单选' },
];

interface FormFieldEditorProps {
  fields: FormFieldDefinition[];
  onChange: (fields: FormFieldDefinition[]) => void;
}

const FormFieldEditor: React.FC<FormFieldEditorProps> = ({
  fields,
  onChange,
}) => {
  const addField = () => {
    const newField: FormFieldDefinition = {
      id: Date.now().toString(36),
      label: '',
      type: 'text',
      required: false,
    };
    onChange([...fields, newField]);
  };

  const removeField = (id: string) => {
    onChange(fields.filter((f) => f.id !== id));
  };

  const updateField = (id: string, patch: Partial<FormFieldDefinition>) => {
    onChange(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const addOption = (fieldId: string) => {
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;
    updateField(fieldId, {
      options: [...(field.options ?? []), ''],
    });
  };

  const updateOption = (
    fieldId: string,
    index: number,
    value: string,
  ) => {
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;
    const newOptions = [...(field.options ?? [])];
    newOptions[index] = value;
    updateField(fieldId, { options: newOptions });
  };

  const removeOption = (fieldId: string, index: number) => {
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;
    updateField(fieldId, {
      options: (field.options ?? []).filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-2">
      <div>
        <Label>表单字段设计</Label>
        <p className="mt-1 text-xs text-muted-foreground">
          自定义本栏目需求表单的字段，用户提交需求时按此配置填写
        </p>
      </div>

      {fields.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            尚未添加任何字段
          </p>
        </div>
      )}

      {fields.map((field, index) => (
        <div
          key={field.id}
          className="space-y-3 rounded-xl border border-border/60 bg-card p-4 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              字段 {index + 1}
            </span>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">必填</Label>
              <Switch
                checked={field.required}
                onCheckedChange={(checked) =>
                  updateField(field.id, { required: checked })
                }
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => removeField(field.id)}
            >
              <X className="size-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Input
              value={field.label}
              onChange={(e) =>
                updateField(field.id, { label: e.target.value })
              }
              placeholder="字段名称，如：需求标题"
            />
            <Select
              value={field.type}
              onValueChange={(value) =>
                updateField(field.id, { type: value as FormFieldType })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {field.type === 'select' && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                下拉选项
              </p>
              {(field.options ?? []).map((opt, optIndex) => (
                <div key={optIndex} className="flex items-center gap-2">
                  <Input
                    value={opt}
                    onChange={(e) =>
                      updateOption(field.id, optIndex, e.target.value)
                    }
                    placeholder={`选项 ${optIndex + 1}`}
                    className="h-8"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeOption(field.id, optIndex)}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => addOption(field.id)}
              >
                <Plus className="size-3" />
                添加选项
              </Button>
            </div>
          )}
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full gap-1.5"
        onClick={addField}
      >
        <Plus className="size-4" />
        添加字段
      </Button>
    </div>
  );
};

export default FormFieldEditor;
