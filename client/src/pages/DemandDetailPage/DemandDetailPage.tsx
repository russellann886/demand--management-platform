import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Loader2, Image as ImageIcon, CalendarClock, TrendingUp, CalendarDays, Link as LinkIcon } from "lucide-react";
import dayjs from "dayjs";
import { useCurrentUserProfile } from "@lark-apaas/client-toolkit/hooks/useCurrentUserProfile";
import { logger } from "@lark-apaas/client-toolkit/logger";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubmitterDisplay } from "@/components/SubmitterDisplay";
import { TiptapEditorComplete } from "@/components/business-ui/tiptap-editor";
import { formatExpectedValue } from "@/pages/HomePage/demand-form-config";

import { getDemandDetail } from "@/api/demand";
import type { DemandDetail, FormFieldDefinition, CustomFieldValue } from "@shared/api.interface";
import { FileImage } from '@/components/FileImage';
import { useFileUrl } from '@/hooks/useFileUrl';
import { CommentSection } from "./CommentSection";
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

const DemandImageLink = ({ filePath }: { filePath: string }) => {
  const url = useFileUrl(filePath);
  if (!url) {
    return (
      <div className="border-t border-border pt-4">
        <div className="inline-flex items-center gap-2 rounded-lg border border-border p-2">
          <ImageIcon className="size-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">加载中...</span>
        </div>
      </div>
    );
  }
  return (
    <div className="border-t border-border pt-4">
      <p className="mb-2 text-sm font-medium text-muted-foreground">附件图片</p>
      <UniversalLink
        to={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-lg border border-border p-2 hover:bg-accent"
      >
        <ImageIcon className="size-5 text-primary" />
        <span className="text-sm text-foreground">查看图片</span>
      </UniversalLink>
    </div>
  );
};

const DemandDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const userInfo = useCurrentUserProfile();
  const isLoggedIn = Boolean(userInfo?.user_id);

  const [demand, setDemand] = useState<DemandDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await getDemandDetail(id);
      setDemand(res);
    } catch (error) {
      logger.error("获取需求详情失败", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!demand) {
    return (
      <div className="flex flex-col items-center gap-4 py-24">
        <p className="text-muted-foreground">需求不存在或已被删除</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          返回
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        返回
      </button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm">
            <h1 className="text-2xl font-semibold leading-snug text-foreground">
              {demand.title}
            </h1>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <SubmitterDisplay
                creator={demand.creator}
                submitterName={demand.submitterName}
                size="small"
              />
              <span className="flex items-center gap-1.5">
                <Building2 className="size-4" />
                {demand.department || "未填写部门"}
              </span>
            </div>

            {demand.formFields && demand.customFields ? (
              <div className="space-y-4 border-t border-border pt-4">
                {demand.formFields.map((field: FormFieldDefinition) => {
                  const value = demand.customFields![field.id] as CustomFieldValue;
                  if (value === null || value === undefined || value === '') return null;
                  return (
                    <div key={field.id} className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">{field.label}</p>
                      <div className="text-sm text-foreground">
                        {field.type === 'date' && typeof value === 'string' && (
                          <span className="flex items-center gap-1.5">
                            <CalendarDays className="size-4 text-muted-foreground" />
                            {dayjs(value).format('YYYY-MM-DD')}
                          </span>
                        )}
                        {field.type === 'link' && typeof value === 'string' && (
                          <UniversalLink
                            to={value}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-primary hover:underline"
                          >
                            <LinkIcon className="size-4" />
                            <span className="break-all">{value}</span>
                          </UniversalLink>
                        )}
                        {field.type === 'image' && typeof value === 'object' && value !== null && (
                          <FileImage
                            filePath={(value as { bucketId: string; filePath: string }).filePath}
                            alt={field.label}
                            className="max-w-xs rounded-lg border border-border"
                          />
                        )}
                        {field.type === 'select' && typeof value === 'string' && (
                          <Badge variant="secondary" className="font-normal">{value}</Badge>
                        )}
                        {field.type === 'text' && typeof value === 'string' && (
                          <span className="whitespace-pre-wrap">{value}</span>
                        )}
                        {field.type === 'textarea' && typeof value === 'string' && (
                          <span className="whitespace-pre-wrap">{value}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
            <>
            <div className="flex flex-wrap items-center gap-2">
              {demand.demandType && (
                <Badge variant="secondary" className="font-normal">
                  {demand.demandType}
                </Badge>
              )}
              {demand.priority && (
                <Badge variant="secondary" className="font-normal">
                  优先级：{demand.priority}
                </Badge>
              )}
              {demand.isBlocking !== null && (
                <Badge
                  variant={demand.isBlocking ? "destructive" : "secondary"}
                  className="font-normal"
                >
                  {demand.isBlocking ? "阻塞需求" : "非阻塞"}
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="size-4" />
                预期价值：
                {formatExpectedValue(
                  demand.valueType,
                  demand.gmvLevel,
                  demand.efficiencyAffected,
                  demand.efficiencySavedMinutes,
                )}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarClock className="size-4" />
                预期上线：
                {demand.expectedOnlineTime
                  ? dayjs(demand.expectedOnlineTime).format("YYYY-MM-DD")
                  : "—"}
              </span>
            </div>

            <div className="border-t border-border pt-4">
              <TiptapEditorComplete
                value={demand.background}
                onValueChange={() => {}}
                placeholder=""
                readOnly
                className="min-h-[120px]"
              />
            </div>

            {demand.image && (
              <DemandImageLink filePath={demand.image.filePath} />
            )}
            </>
            )}
          </div>

          <CommentSection demandId={demand.id} canComment={isLoggedIn} />
        </div>
      </div>
    </div>
  );
};

export default DemandDetailPage;
