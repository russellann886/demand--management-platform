import React, { useState } from 'react';
import CategoryListPage from '../CategoryListPage/CategoryListPage';
import RulePlazaPage from '../RulePlazaPage/RulePlazaPage';

const PlazaOverviewPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'demands' | 'rules'>('demands');

  const tabClass = (isActive: boolean) =>
    `border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
      isActive
        ? 'border-primary text-foreground'
        : 'border-transparent text-muted-foreground hover:text-foreground'
    }`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          广场概览
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          查看工具需求栏目与平台规则
        </p>
      </div>
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab('demands')}
          className={tabClass(activeTab === 'demands')}
        >
          需求栏目
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('rules')}
          className={tabClass(activeTab === 'rules')}
        >
          规则
        </button>
      </div>
      <div className={activeTab === 'demands' ? '' : 'hidden'}>
        <CategoryListPage />
      </div>
      <div className={activeTab === 'rules' ? '' : 'hidden'}>
        <RulePlazaPage />
      </div>
    </div>
  );
};

export default PlazaOverviewPage;
