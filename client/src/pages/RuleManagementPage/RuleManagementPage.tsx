import React, { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ArrowLeft, Inbox, Upload, Edit, Trash2, FileText } from 'lucide-react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import BoardCard from '../CategoryListPage/BoardCard';
import { useUserSections } from '@/hooks/useUserSections';
import { useFileUrl } from '@/hooks/useFileUrl';
import { rule as ruleApi } from '@/api';
import {
  RULE_SECTIONS,
  type RuleSectionDef,
  type RuleListItem,
} from '@shared/api.interface';
import RuleUploadDialog from './RuleUploadDialog';
import ApplicationReviewCard from './ApplicationReviewCard';

function getAccessibleRuleSections(
  isSuperAdmin: boolean,
  sections: string[] | null,
): RuleSectionDef[] {
  if (isSuperAdmin) return RULE_SECTIONS;
  if (!sections) return [];
  return RULE_SECTIONS.filter((s) => {
    if (s.key === 'coupon' || s.key === 'goods') {
      return sections.includes('消费券&货品板块');
    }
    if (s.key === 'replenish') {
      return sections.includes('追补板块');
    }
    return false;
  });
}

const FileDownloadLink: React.FC<{ filePath: string }> = ({ filePath }) => {
  const url = useFileUrl(filePath, true);
  if (!url)
    return <span className="text-xs text-muted-foreground">加载中...</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
    >
      <FileText className="size-3.5" />
      下载文件
    </a>
  );
};

const RuleManagementPage: React.FC = () => {
  const { sections, isSuperAdmin, isLoading: authLoading } = useUserSections();
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'rules' | 'applications'>('rules');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RuleListItem | null>(null);
  const [rules, setRules] = useState<RuleListItem[]>([]);
  const [applications, setApplications] = useState<RuleListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RuleListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canAccess = isSuperAdmin || (sections !== null && sections.length > 0);

  const refreshData = useCallback(async () => {
    if (!selectedSection) return;
    setLoading(true);
    try {
      const [ruleRes, appRes] = await Promise.all([
        ruleApi.list({
          section: selectedSection,
          type: '规则',
          page: 1,
          pageSize: 50,
        }),
        ruleApi.list({ section: selectedSection, page: 1, pageSize: 50 }),
      ]);
      setRules(ruleRes.items);
      setApplications(
        appRes.items.filter((item: RuleListItem) => item.type !== '规则'),
      );
    } catch (err) {
      logger.error('Failed to load rules', JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  }, [selectedSection]);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (!canAccess) {
    return <Navigate to="/" replace />;
  }

  const accessibleSections = getAccessibleRuleSections(isSuperAdmin, sections);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await ruleApi.remove(deleteTarget.id);
      toast.success('规则已删除');
      setDeleteTarget(null);
      await refreshData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败');
    } finally {
      setDeleting(false);
    }
  };

  // 无选中板块：板块选择
  if (!selectedSection) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">规则管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理各板块规则与商品加白加黑申请审核
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {accessibleSections.map((s) => (
            <BoardCard
              key={s.key}
              name={s.name}
              description={s.description}
              icon={s.icon}
              count={0}
              onClick={() => setSelectedSection(s.key)}
            />
          ))}
        </div>
      </div>
    );
  }

  const currentSection = RULE_SECTIONS.find((s) => s.key === selectedSection);
  const sectionName = currentSection?.name ?? selectedSection;

  const tabButtonClass = (isActive: boolean): string =>
    `relative px-4 py-2 text-sm font-medium transition-colors ${
      isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
    }`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setSelectedSection(null);
            setActiveTab('rules');
          }}
        >
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">{sectionName}</h1>
      </div>

      {/* Tab 切换 */}
      <div className="mb-6 flex gap-1 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab('rules')}
          className={tabButtonClass(activeTab === 'rules')}
        >
          规则管理
          {activeTab === 'rules' && (
            <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('applications')}
          className={tabButtonClass(activeTab === 'applications')}
        >
          申请审核
          {activeTab === 'applications' && (
            <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />
          )}
        </button>
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner className="size-6" />
        </div>
      ) : activeTab === 'rules' ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setEditingRule(null);
                setUploadDialogOpen(true);
              }}
            >
              <Upload className="size-4" />
              上传规则
            </Button>
          </div>
          {rules.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
              <Inbox className="size-12" />
              <p className="text-sm">暂无规则</p>
            </div>
          ) : (
            rules.map((rule: RuleListItem) => (
              <div
                key={rule.id}
                className="rounded-xl border border-border/60 bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-foreground">{rule.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {rule.content}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {rule.file && (
                        <FileDownloadLink filePath={rule.file.filePath} />
                      )}
                      {rule.effectiveTime && (
                        <span>
                          生效时间：
                          {dayjs(rule.effectiveTime).format('YYYY-MM-DD')}
                        </span>
                      )}
                      <span>
                        创建：{dayjs(rule.createdAt).format('YYYY-MM-DD')}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setEditingRule(rule);
                        setUploadDialogOpen(true);
                      }}
                    >
                      <Edit className="size-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setDeleteTarget(rule)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {applications.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
              <Inbox className="size-12" />
              <p className="text-sm">暂无申请</p>
            </div>
          ) : (
            applications.map((app: RuleListItem) => (
              <ApplicationReviewCard
                key={app.id}
                item={app}
                onReviewed={() => void refreshData()}
              />
            ))
          )}
        </div>
      )}

      <RuleUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        section={selectedSection}
        editingRule={editingRule}
        onSuccess={() => void refreshData()}
      />

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open: boolean) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            确定要删除规则「{deleteTarget?.name}」吗？此操作不可撤销。
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RuleManagementPage;
