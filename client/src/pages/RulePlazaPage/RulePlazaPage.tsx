import React, { useState, useEffect } from 'react';
import { ArrowLeft, Inbox, ExternalLink } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import BoardCard from '../CategoryListPage/BoardCard';
import RuleCard from './RuleCard';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { rule as ruleApi } from '@/api';
import {
  RULE_SECTIONS,
  type RuleListItem,
} from '@shared/api.interface';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

const RulePlazaPage: React.FC = () => {
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [items, setItems] = useState<RuleListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [ruleCounts, setRuleCounts] = useState<Record<string, number>>({});

  const sectionDef = RULE_SECTIONS.find((s) => s.key === selectedSection);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      RULE_SECTIONS.map((section) =>
        ruleApi.list({
          section: section.key,
          type: '规则',
          page: 1,
          pageSize: 1,
        }),
      ),
    )
      .then((results) => {
        if (!cancelled) {
          const counts: Record<string, number> = {};
          RULE_SECTIONS.forEach((section, i) => {
            counts[section.key] = results[i].total;
          });
          setRuleCounts(counts);
        }
      })
      .catch((err: unknown) => {
        logger.error(
          '加载规则数量失败',
          err instanceof Error ? err.message : String(err),
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedSection) return;
    let cancelled = false;
    setLoading(true);

    ruleApi
      .list({
        section: selectedSection,
        type: '规则',
        page: 1,
        pageSize: 50,
      })
      .then((res) => {
        if (!cancelled) {
          setItems(res.items);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          logger.error(
            '加载数据失败',
            err instanceof Error ? err.message : String(err),
          );
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedSection]);

  const handleBack = () => {
    setSelectedSection(null);
    setItems([]);
  };

  if (!selectedSection) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {RULE_SECTIONS.map((section) => (
            <BoardCard
              key={section.key}
              name={section.name}
              description={section.description}
              icon={section.icon}
              count={ruleCounts[section.key] ?? 0}
              countLabel="条规则"
              onClick={() => setSelectedSection(section.key)}
            />
          ))}
        </div>
        <div className="flex justify-center pt-2">
          <UniversalLink
            to="https://bytedance.feishuapp.com/app/app_179r1c43mzr"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full sm:w-auto"
          >
            <Button size="lg" className="w-full gap-2 text-base">
              前往申请加白
              <ExternalLink className="size-4" />
            </Button>
          </UniversalLink>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={handleBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        返回
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          {sectionDef?.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {sectionDef?.description}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner className="size-6 text-primary" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
          <Inbox className="size-10" />
          <p className="text-sm">暂无规则文件</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((rule) => (
            <RuleCard key={rule.id} rule={rule} />
          ))}
        </div>
      )}
    </div>
  );
};

export default RulePlazaPage;
