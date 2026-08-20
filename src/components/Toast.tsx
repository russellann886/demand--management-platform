import { useEffect } from 'react'
import { CheckCircle2, Info, TriangleAlert, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDemandStore } from '@/store/useDemandStore'

const iconMap = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  error: XCircle,
}

export default function Toast() {
  const { toast, clearToast } = useDemandStore()

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(clearToast, 2400)
    return () => window.clearTimeout(timer)
  }, [toast, clearToast])

  if (!toast) return null

  const Icon = iconMap[toast.tone]

  return (
    <div
      className={cn(
        'fixed right-4 top-16 z-50 flex max-w-sm items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm shadow-xl',
        toast.tone === 'success' && 'border-green-200 text-green-700 dark:border-green-900 dark:text-green-300',
        toast.tone === 'warning' && 'border-amber-200 text-amber-700 dark:border-amber-900 dark:text-amber-300',
        toast.tone === 'error' && 'border-red-200 text-red-700 dark:border-red-900 dark:text-red-300',
        toast.tone === 'info' && 'border-blue-200 text-blue-700 dark:border-blue-900 dark:text-blue-300',
      )}
      role="status"
      aria-live="polite"
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{toast.message}</span>
    </div>
  )
}
