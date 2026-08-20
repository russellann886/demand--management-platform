import { Layers3, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDemandStore } from '@/store/useDemandStore'

const navItems = ['需求广场', '我的需求', '需求整合']

export default function AppHeader() {
  const { theme, toggleTheme, showToast } = useDemandStore()

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4 sm:px-5">
      <div className="flex min-w-0 items-center gap-4 xl:gap-7">
        <button
          type="button"
          className="flex items-center gap-2 rounded-md text-sm font-semibold text-foreground focus-visible-ring"
          aria-label="大促需求收集平台首页"
          onClick={() => showToast({ message: '已回到大促需求收集平台首页演示态', tone: 'info' })}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-primary text-primary-foreground">
            <Layers3 className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="hidden truncate sm:inline">大促需求收集平台</span>
        </button>
        <nav className="hidden items-center gap-1 md:flex" aria-label="主导航">
          {navItems.map((item) => (
            <button
              key={item}
              type="button"
              aria-current={item === '需求整合' ? 'page' : undefined}
              onClick={() => showToast({ message: `${item}为演示导航，当前停留在需求整合`, tone: 'info' })}
              className={cn(
                'rounded-md px-3 py-2 text-sm transition-colors focus-visible-ring',
                item === '需求整合'
                  ? 'bg-primary font-medium text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {item}
            </button>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-foreground hover:bg-muted focus-visible-ring"
          aria-label={theme === 'light' ? '切换暗色主题' : '切换浅色主题'}
          onClick={toggleTheme}
        >
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>
        <button
          type="button"
          className="flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-sm text-foreground hover:bg-muted focus-visible-ring"
          aria-label="当前用户 赵博安"
          onClick={() => showToast({ message: '当前用户：赵博安', tone: 'info' })}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border primary-tint text-xs font-semibold text-primary">
            赵
          </span>
          <span className="hidden sm:inline">赵博安</span>
        </button>
      </div>
    </header>
  )
}
