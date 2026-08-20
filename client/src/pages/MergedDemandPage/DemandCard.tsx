import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trash2,
  Layers,
  FilePlus,
  ChevronRight,
  Check,
  Link as LinkIcon,
} from 'lucide-react';
import dayjs from 'dayjs';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { AssigneeButton } from './AssigneeButton';
import { SubmitterDisplay } from '@/components/SubmitterDisplay';

import { updateDemandAssignee, updateDemandStatus } from '@/api/demand';
import { mergedDemand as mergedDemandApi } from '@/api';

import type { UnifiedRow, ResolvedSource } from './unified-rows';
import type { FormFieldDefinition } from '@shared/api.interface';
import type { ScoreLevel } from './demand-scoring';
import { formatExpectedValue } from '@/pages/HomePage/demand-form-config';

import {
  ScoreCell,
  FeedbackCell,
  StatusCell,
  StackedCell,
  ExpandedSources,
  ImageThumbs,
  extractLinks,
  extractImages,
  extractTextFromHtml,
  renderCustomFieldValue,
} from './cell-renderers';

export interface DemandCardProps {
  record: UnifiedRow;
  level: ScoreLevel;
  selectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  expanded: boolean;
  onExpandToggle: () => void;
  onDeleteMerged: (id: string) => void;
  onReleaseSource: (mergedId: string, demandId: string) => void;
  onAddSource: (mergedId: string, mergedTitle: string) => void;
  onRefresh?: () => void;
  formFields?: FormFieldDefinition[] | null;
}

interface FieldItem {
  label: string;
  content: React.ReactNode;
}

interface FieldGroup {
  fields: FieldItem[];
}

const SourceField: React.FC<{ record: UnifiedRow }> = ({ record }) => {
  const sources = record.sources ?? [];
  const showSources = record.type === 'merged' && sources.length > 0;

  if (showSources) {
    return (
      <div className="flex flex-col gap-1">
        {sources.map((s: ResolvedSource) => (
          <div key={s.demandId} className="flex items-center gap-2 text-xs">
            <span className="truncate text-muted-foreground max-w-[100px]">
              {s.department || '—'}
            </span>
            <span className="text-border">|</span>
            {s.creator || s.submitterName ? (
              <SubmitterDisplay
                creator={s.creator ?? ''}
                submitterName={s.submitterName}
                size="small"
              />
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="truncate text-muted-foreground max-w-[100px]">
        {record.department || '—'}
      </span>
      <span className="text-border">|</span>
      {record.creator || record.submitterName ? (
        <SubmitterDisplay
          creator={record.creator ?? ''}
          submitterName={record.submitterName}
          size="small"
        />
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
    </div>
  );
};

const DemandCard: React.FC<DemandCardProps> = ({
  record,
  level,
  selectionMode,
  isSelected,
  onToggleSelect,
  expanded,
  onExpandToggle,
  onDeleteMerged,
  onReleaseSource,
  onAddSource,
  onRefresh,
  formFields,
}) => {
  const hasFormFields = Boolean(formFields && formFields.length > 0);
  const isMerged = record.type === 'merged';
  const plainText = extractTextFromHtml(
    record.background || record.title || '',
  );

  const updateAssignee = async (newAssignee: string | null) => {
    try {
      if (record.type === 'merged') {
        await mergedDemandApi.updateMergedDemand(record.id, {
          assignee: newAssignee,
          ...(newAssignee === null ? { status: '待处理' } : {}),
        });
      } else {
        await updateDemandAssignee(record.id, { assignee: newAssignee });
        if (newAssignee === null) {
          await updateDemandStatus(record.id, '待处理');
        }
      }
      onRefresh?.();
    } catch {
      // error handled by api layer
    }
  };

  const detailGroups: FieldGroup[] = hasFormFields
    ? buildCustomDetailFields(record, formFields!, onRefresh)
    : buildStandardDetailFields(record, onRefresh);

  return (
    <div
      className={`rounded-lg border border-border transition-colors hover:bg-accent/30 ${
        isMerged ? 'bg-primary/5' : 'bg-card'
      }`}
    >
      {/* Compact row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2.5">
        {/* Left: checkbox, expand, score, type, title, inline badges */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {selectionMode && (
            <button
              type="button"
              onClick={onToggleSelect}
              disabled={isMerged}
              className={`flex size-5 shrink-0 items-center justify-center rounded border transition ${
                isSelected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background'
              } ${isMerged ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-primary'}`}
              aria-label={isSelected ? '取消选择' : '选择'}
            >
              {isSelected && <Check className="size-3" />}
            </button>
          )}
          <button
            type="button"
            onClick={onExpandToggle}
            className="inline-flex shrink-0 items-center justify-center text-muted-foreground transition hover:text-foreground"
            aria-label={expanded ? '收起' : '展开'}
          >
            <motion.div
              animate={{ rotate: expanded ? 90 : 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="inline-flex"
            >
              <ChevronRight className="size-4" />
            </motion.div>
          </button>
          <div className="flex shrink-0 items-center gap-1">
            <span className="text-xs text-muted-foreground">重要度</span>
            <ScoreCell record={record} level={level} onRefresh={onRefresh} />
          </div>
          {isMerged ? (
            <Badge className="shrink-0 gap-1">
              <Layers className="size-3" />
              已整合
            </Badge>
          ) : (
            <Badge variant="secondary" className="shrink-0 font-normal">
              原始需求
            </Badge>
          )}
          <span
            className={`truncate text-sm ${
              isMerged ? 'font-semibold text-foreground' : 'text-foreground'
            }`}
          >
            {plainText || '—'}
          </span>
          {!hasFormFields && record.priority && (
            <Badge variant="secondary" className="shrink-0 font-normal">
              {record.priority}
            </Badge>
          )}
          {!hasFormFields && record.isBlocking && (
            <Badge variant="destructive" className="shrink-0">
              阻塞
            </Badge>
          )}
        </div>

        {/* Right: status, assignee, actions */}
        <div className="flex shrink-0 items-center gap-2">
          <StatusCell record={record} onRefresh={onRefresh} />
          <AssigneeButton value={record.assignee} onChange={updateAssignee} />
          {isMerged && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2"
                onClick={() => onAddSource(record.id, record.title)}
                title="添加需求来源"
              >
                <FilePlus className="size-3.5" />
                <span className="text-xs">添加</span>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-destructive hover:text-destructive"
                    title="删除整合需求"
                  >
                    <Trash2 className="size-3.5" />
                    <span className="text-xs">删除</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>删除整合需求？</AlertDialogTitle>
                    <AlertDialogDescription>
                      删除后「{record.title}
                      」将被移除，其关联的所有原始需求会回到原始需求列表。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDeleteMerged(record.id)}
                    >
                      确认删除
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      {/* Expandable detail section */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-4 pb-4 pt-3">
              {detailGroups.map((group, gi) => (
                <div
                  key={gi}
                  className={
                    gi > 0 ? 'mt-3 pt-3 border-t border-border/40' : ''
                  }
                >
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
                    {group.fields.map((field, i) => (
                      <div key={i} className="min-w-0">
                        <dt className="text-xs font-medium text-muted-foreground">
                          {field.label}
                        </dt>
                        <dd className="mt-0.5">{field.content}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
              {isMerged && (
                <div className="mt-4">
                  <ExpandedSources
                    mergedId={record.id}
                    sources={record.sources ?? []}
                    onReleaseSource={onReleaseSource}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

function buildStandardDetailFields(
  record: UnifiedRow,
  onRefresh: (() => void) | undefined,
): FieldGroup[] {
  const primary: FieldItem[] = [
    {
      label: '需求来源',
      content: <SourceField record={record} />,
    },
    {
      label: '需求类型',
      content: (
        <StackedCell
          record={record}
          renderValue={(item) =>
            item.demandType ? (
              <Badge variant="secondary" className="font-normal">
                {item.demandType}
              </Badge>
            ) : (
              <span className="text-muted-foreground">—</span>
            )
          }
        />
      ),
    },
    {
      label: '优先级',
      content: (
        <StackedCell
          record={record}
          renderValue={(item) =>
            item.priority ? (
              <span className="text-foreground">{item.priority}</span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )
          }
        />
      ),
    },
    {
      label: '是否阻塞',
      content: (
        <StackedCell
          record={record}
          renderValue={(item) =>
            item.isBlocking === null ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              <Badge
                variant={item.isBlocking ? 'destructive' : 'secondary'}
                className="font-normal"
              >
                {item.isBlocking ? '阻塞' : '否'}
              </Badge>
            )
          }
        />
      ),
    },
    {
      label: '预期价值',
      content: (
        <StackedCell
          record={record}
          renderValue={(item) => (
            <span className="text-foreground">
              {formatExpectedValue(
                item.valueType,
                item.gmvLevel,
                item.efficiencyAffected,
                item.efficiencySavedMinutes,
              )}
            </span>
          )}
        />
      ),
    },
    {
      label: '期望上线时间',
      content: (
        <StackedCell
          record={record}
          renderValue={(item) =>
            item.expectedOnlineTime ? (
              <span className="text-foreground">
                {dayjs(item.expectedOnlineTime).format('YYYY-MM-DD')}
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )
          }
        />
      ),
    },
  ];
  const secondary: FieldItem[] = [
    {
      label: '预计排期',
      content: record.plannedSchedule ? (
        <span className="text-xs text-foreground">
          {dayjs(record.plannedSchedule).format('YYYY-MM-DD')}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
    },
    {
      label: '跟进反馈',
      content: (
        <FeedbackCell
          feedback={record.followUpFeedback}
          record={record}
          onRefresh={onRefresh}
        />
      ),
    },
    {
      label: '更新时间',
      content: record.updatedAt ? (
        <span className="text-xs text-foreground">
          {dayjs(record.updatedAt).format('MM-DD HH:mm')}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
    },
    {
      label: '链接',
      content: (() => {
        const links = extractLinks(record.background);
        if (links.length === 0) {
          return <span className="text-sm text-muted-foreground">—</span>;
        }
        return (
          <div className="flex flex-col gap-1">
            {links.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                title={url}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <LinkIcon className="size-3 shrink-0" />
                <span className="max-w-[150px] truncate">{url}</span>
              </a>
            ))}
          </div>
        );
      })(),
    },
    {
      label: '示意',
      content: <ImageThumbs images={extractImages(record.background)} />,
    },
  ];
  return [{ fields: primary }, { fields: secondary }];
}

function buildCustomDetailFields(
  record: UnifiedRow,
  formFields: FormFieldDefinition[],
  onRefresh: (() => void) | undefined,
): FieldGroup[] {
  const dynamicFields: FieldItem[] = formFields.map((field) => ({
    label: field.label,
    content: (
      <StackedCell
        record={record}
        renderValue={(item) => renderCustomFieldValue(field, item.customFields)}
      />
    ),
  }));

  const primary: FieldItem[] = [
    { label: '需求来源', content: <SourceField record={record} /> },
    ...dynamicFields,
  ];
  const secondary: FieldItem[] = [
    {
      label: '预计排期',
      content: record.plannedSchedule ? (
        <span className="text-xs text-foreground">
          {dayjs(record.plannedSchedule).format('YYYY-MM-DD')}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
    },
    {
      label: '跟进反馈',
      content: (
        <FeedbackCell
          feedback={record.followUpFeedback}
          record={record}
          onRefresh={onRefresh}
        />
      ),
    },
    {
      label: '更新时间',
      content: record.updatedAt ? (
        <span className="text-xs text-foreground">
          {dayjs(record.updatedAt).format('MM-DD HH:mm')}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
    },
  ];
  return [{ fields: primary }, { fields: secondary }];
}

export default DemandCard;
