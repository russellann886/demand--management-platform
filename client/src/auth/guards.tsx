import type { ReactNode } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChangePasswordPage } from '@/pages/ChangePasswordPage';
import { LoginPage } from '@/pages/LoginPage';
import { useAuth } from './AuthContext';
import type { SystemRole } from './types';

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading, error, refresh } = useAuth();

  if (loading) {
    return (
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-4 px-6 py-10">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl items-center px-6">
        <Alert variant="destructive">
          <ShieldAlert />
          <AlertTitle>无法验证身份</AlertTitle>
          <AlertDescription>
            <p>{error.message}</p>
            <Button variant="outline" size="sm" onClick={() => void refresh()}>
              重试
            </Button>
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  if (!user) return <LoginPage />;
  if (user.mustChangePassword) return <ChangePasswordPage />;

  return children;
}

export function CanRole({
  roles,
  children,
  fallback = null,
}: {
  roles: SystemRole[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { hasRole } = useAuth();
  return hasRole(...roles) ? children : fallback;
}

export function RequireRole({ roles }: { roles: SystemRole[] }) {
  const { hasRole } = useAuth();
  if (hasRole(...roles)) return <Outlet />;

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl items-center px-4">
      <Alert>
        <ShieldAlert />
        <AlertTitle>没有访问权限</AlertTitle>
        <AlertDescription>
          <p>当前账号没有查看此页面所需的角色，请联系超级管理员。</p>
          <Button asChild variant="outline" size="sm">
            <Link to="/">返回需求广场</Link>
          </Button>
        </AlertDescription>
      </Alert>
    </main>
  );
}
