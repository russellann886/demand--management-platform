import { useState, type ReactElement } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import {
  FileText,
  KeyRound,
  Layers,
  Lightbulb,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { CanRole } from '@/auth/guards';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const Layout = () => {
  const { user, logout } = useAuth();
  const [logoutOpen, setLogoutOpen] = useState(false);

  const displayName = user?.displayName || '用户';
  const avatarUrl = user?.avatarUrl ?? undefined;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="fixed top-0 inset-x-0 z-40 h-16 bg-card border-b border-border">
        <div className="mx-auto max-w-6xl h-full px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <NavLink to="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Lightbulb className="size-5" />
              </div>
              <span className="text-base font-semibold tracking-tight">
                需求广场
              </span>
            </NavLink>

            <nav className="hidden lg:flex items-center gap-1">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`
                }
              >
                广场概览
              </NavLink>
              <NavLink
                to="/my-demands"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`
                }
              >
                <FileText className="size-4" />
                我的需求
              </NavLink>
              <CanRole
                roles={[
                  'demand_admin',
                  'admin_goods',
                  'admin_coupon',
                  'admin_replenish',
                  'admin_content',
                  'admin_shelf',
                  'admin_campaign',
                ]}
              >
                <NavLink
                  to="/merged-demands"
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-accent text-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    }`
                  }
                >
                  <Layers className="size-4" />
                  需求管理
                </NavLink>
              </CanRole>
              <CanRole
                roles={[
                  'demand_admin',
                  'admin_goods',
                  'admin_coupon',
                  'admin_replenish',
                  'admin_content',
                  'admin_shelf',
                  'admin_campaign',
                ]}
              >
                <NavLink
                  to="/rule-management"
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-accent text-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    }`
                  }
                >
                  <ShieldCheck className="size-4" />
                  规则管理
                </NavLink>
              </CanRole>
            </nav>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar className="size-9 border border-border">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback>{displayName.slice(0, 1)}</AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline text-sm font-medium text-foreground max-w-[120px] truncate">
                {displayName}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem asChild>
                <Link to="/account/password">
                  <KeyRound className="size-4" />
                  修改密码
                </Link>
              </DropdownMenuItem>
              <CanRole roles={['super_admin']}>
                <DropdownMenuItem asChild>
                  <Link to="/admin/users">
                    <Users className="size-4" />
                    用户管理
                  </Link>
                </DropdownMenuItem>
              </CanRole>
              <DropdownMenuItem
                onClick={() => setLogoutOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 lg:pb-0">
        <div className="py-6">
          <Outlet />
        </div>
      </main>

      <nav
        aria-label="移动端主导航"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card px-[max(0.5rem,env(safe-area-inset-left))] pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <MobileNavLink to="/" end icon={<Lightbulb />} label="广场" />
        <MobileNavLink to="/my-demands" icon={<FileText />} label="我的" />
        <CanRole
          roles={[
            'demand_admin',
            'admin_goods',
            'admin_coupon',
            'admin_replenish',
            'admin_content',
            'admin_shelf',
            'admin_campaign',
          ]}
        >
          <MobileNavLink to="/merged-demands" icon={<Layers />} label="管理" />
          <MobileNavLink
            to="/rule-management"
            icon={<ShieldCheck />}
            label="规则"
          />
        </CanRole>
      </nav>

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认退出登录？</AlertDialogTitle>
            <AlertDialogDescription>
              退出后需要重新登录才能提交需求或投票。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => void logout()}>
              退出登录
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

function MobileNavLink({
  to,
  end,
  icon,
  label,
}: {
  to: string;
  end?: boolean;
  icon: ReactElement;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex min-h-14 flex-1 flex-col items-center justify-center gap-1 px-2 text-xs font-medium ${
          isActive ? 'text-primary' : 'text-muted-foreground'
        }`
      }
    >
      <span className="[&_svg]:size-5">{icon}</span>
      {label}
    </NavLink>
  );
}

export default Layout;
