import { useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { Lightbulb, Layers, FileText, ShieldCheck } from "lucide-react";
import { useAppInfo } from "@lark-apaas/client-toolkit/hooks/useAppInfo";
import { useCurrentUserProfile } from "@lark-apaas/client-toolkit/hooks/useCurrentUserProfile";
import { CanRole } from "@lark-apaas/client-toolkit/auth";
import { getDataloom } from "@lark-apaas/client-toolkit/dataloom";
import { logger } from "@lark-apaas/client-toolkit/logger";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const GUEST_AVATAR =
  "https://lf3-static.bytednsdoc.com/obj/eden-cn/LMfspH/ljhwZthlaukjlkulzlp/miao/no-person.svg";

const Layout = () => {
  const { appName } = useAppInfo();
  const userInfo = useCurrentUserProfile();
  const [logoutOpen, setLogoutOpen] = useState(false);

  const isLoggedIn = Boolean(userInfo?.user_id);
  const displayName = isLoggedIn ? userInfo?.name || "用户" : "游客";
  const avatarUrl = isLoggedIn ? userInfo?.avatar : GUEST_AVATAR;

  const handleLogout = async () => {
    const dataloom = await getDataloom();
    const result = await dataloom.service.session.signOut();
    if (result.error) {
      logger.error("退出登录失败:", result.error.message);
      return;
    }
    window.location.reload();
  };

  const handleLogin = async () => {
    const dataloom = await getDataloom();
    dataloom.service.session.redirectToLogin();
  };

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
                {appName || "需求广场"}
              </span>
            </NavLink>

            <nav className="hidden sm:flex items-center gap-1">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
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
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`
                }
              >
                <FileText className="size-4" />
                我的需求
              </NavLink>
              <CanRole roles={["demand_admin", "admin_goods", "admin_coupon", "admin_replenish", "admin_content", "admin_shelf", "admin_campaign"]}>
                <NavLink
                  to="/merged-demands"
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`
                  }
                >
                  <Layers className="size-4" />
                  需求管理
                </NavLink>
              </CanRole>
              <CanRole roles={["demand_admin", "admin_goods", "admin_coupon", "admin_replenish", "admin_content", "admin_shelf", "admin_campaign"]}>
                <NavLink
                  to="/rule-management"
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
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
              {isLoggedIn ? (
                <DropdownMenuItem
                  onClick={() => setLogoutOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  退出登录
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={handleLogin}>登录</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-16">
        <div className="py-6">
          <Outlet />
        </div>
      </main>

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
            <AlertDialogAction onClick={handleLogout}>
              退出登录
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Layout;
