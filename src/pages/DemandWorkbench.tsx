import { ArrowLeft, Filter, Merge, Sparkles } from 'lucide-react'
import ActionModals from '@/components/ActionModals'
import AppHeader from '@/components/AppHeader'
import DemandList from '@/components/DemandList'
import MetricCards from '@/components/MetricCards'
import Sidebar from '@/components/Sidebar'
import Toast from '@/components/Toast'
import { useDemandStore, filterGroups } from '@/store/useDemandStore'

export default function DemandWorkbench() {
  const { groups, filters, isAiRunning, openModal, runAiMerge, showToast } = useDemandStore()
  const visibleGroups = filterGroups(groups, filters)

  return (
    <main data-viewport-mode="app-shell" className="h-screen min-h-0 overflow-hidden bg-background text-foreground">
      <div className="workbench flex h-full min-h-0 flex-col">
        <AppHeader />
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-3 sm:p-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          <Sidebar />
          <section className="flex min-h-0 flex-col rounded-md border border-border bg-card" aria-labelledby="page-title">
            <div className="shrink-0 border-b border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 id="page-title" className="text-lg font-semibold">
                    需求整合 · 默认栏目
                  </h1>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">统一管理原始需求与已整合需求，可手动勾选整合或由 AI 智能识别可合并项</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm text-foreground hover:bg-muted focus-visible-ring"
                    onClick={() => showToast({ message: '返回栏目列表为演示操作', tone: 'info' })}
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    返回栏目列表
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm text-foreground hover:bg-muted focus-visible-ring xl:hidden"
                    onClick={() => openModal({ type: 'filters' })}
                  >
                    <Filter className="h-4 w-4" aria-hidden="true" />
                    筛选
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-primary bg-card px-3 text-sm font-medium text-primary hover:bg-muted focus-visible-ring"
                    onClick={() => openModal({ type: 'manual' })}
                  >
                    <Merge className="h-4 w-4" aria-hidden="true" />
                    手动整合
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-primary bg-primary px-3 text-sm font-semibold text-primary-foreground hover:opacity-95 focus-visible-ring disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={isAiRunning}
                    onClick={runAiMerge}
                  >
                    <Sparkles className={`h-4 w-4 ${isAiRunning ? 'animate-pulse' : ''}`} aria-hidden="true" />
                    {isAiRunning ? 'AI 识别中' : 'AI 智能整合'}
                  </button>
                </div>
              </div>
            </div>
            <MetricCards groups={visibleGroups} />
            <DemandList groups={visibleGroups} />
          </section>
        </div>
      </div>
      <ActionModals />
      <Toast />
    </main>
  )
}
