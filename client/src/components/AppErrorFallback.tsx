import { AlertTriangle, RotateCcw } from 'lucide-react';
import type { FallbackProps } from 'react-error-boundary';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { logger } from '@/lib/logger';

export function AppErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  logger.error('应用渲染失败', error);

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <AlertTriangle className="size-8 text-destructive" aria-hidden />
          <CardTitle>页面暂时无法显示</CardTitle>
          <CardDescription>
            页面遇到了意外错误。你可以重试，已填写但未提交的内容可能需要重新输入。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={resetErrorBoundary}>
            <RotateCcw className="size-4" />
            重新加载页面
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
