import { useCallback, useEffect, useState } from 'react';
import { KeyRound, ShieldCheck, UserPlus, Users } from 'lucide-react';

import {
  createUser,
  getRoles,
  getUsers,
  resetUserPassword,
  updateUserRoles,
} from '@/auth/api';
import type { ManagedUser, RoleDefinition, SystemRole } from '@/auth/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function AdminUsersPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [drafts, setDrafts] = useState<Record<string, SystemRole[]>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<ManagedUser | null>(null);
  const [newUser, setNewUser] = useState({
    displayName: '',
    email: '',
    password: '',
    roles: [] as SystemRole[],
  });
  const [resetPassword, setResetPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextUsers, nextRoles] = await Promise.all([
        getUsers(),
        getRoles(),
      ]);
      setUsers(nextUsers);
      setRoles(nextRoles);
      setDrafts(
        Object.fromEntries(nextUsers.map((user) => [user.id, user.roles])),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '用户列表加载失败。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleRole = (userId: string, role: SystemRole, checked: boolean) => {
    setDrafts((current) => {
      const existing = current[userId] ?? [];
      return {
        ...current,
        [userId]: checked
          ? [...new Set([...existing, role])]
          : existing.filter((item) => item !== role),
      };
    });
  };

  const saveRoles = async (user: ManagedUser) => {
    setSavingId(user.id);
    setError(null);
    try {
      const nextRoles = drafts[user.id] ?? [];
      await updateUserRoles(user.id, nextRoles);
      setUsers((current) =>
        current.map((item) =>
          item.id === user.id ? { ...item, roles: nextRoles } : item,
        ),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '角色更新失败。');
    } finally {
      setSavingId(null);
    }
  };

  const submitNewUser = async () => {
    setSavingId('new-user');
    setError(null);
    try {
      await createUser(newUser);
      setCreateOpen(false);
      setNewUser({ displayName: '', email: '', password: '', roles: [] });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '账号创建失败。');
    } finally {
      setSavingId(null);
    }
  };

  const submitPasswordReset = async () => {
    if (!resetTarget) return;
    setSavingId(resetTarget.id);
    setError(null);
    try {
      await resetUserPassword(resetTarget.id, resetPassword);
      setResetTarget(null);
      setResetPassword('');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '密码重置失败。');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Users />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <CardTitle className="text-xl">用户角色管理</CardTitle>
            <CardDescription>
              创建平台账号、分配角色，并在需要时重置登录密码。
            </CardDescription>
          </div>
          <Button
            onClick={() => {
              setError(null);
              setCreateOpen(true);
            }}
          >
            <UserPlus className="size-4" />
            新建用户
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error && (
          <Alert variant="destructive">
            <ShieldCheck />
            <AlertTitle>操作失败</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>角色</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const selected = drafts[user.id] ?? [];
                const unchanged = sameRoles(selected, user.roles);
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage
                            src={user.avatarUrl ?? undefined}
                            alt={user.displayName}
                          />
                          <AvatarFallback>
                            {user.displayName.slice(0, 1).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex min-w-48 flex-col">
                          <span className="font-medium">
                            {user.displayName}
                          </span>
                          <span className="text-muted-foreground">
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.active ? 'secondary' : 'outline'}>
                        {user.active ? '启用' : '停用'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="grid min-w-[520px] grid-cols-2 gap-2">
                        {roles.map((role) => (
                          <label
                            key={role.code}
                            className="flex cursor-pointer items-start gap-2 rounded-md border p-2"
                            title={role.description}
                          >
                            <Checkbox
                              checked={selected.includes(role.code)}
                              onCheckedChange={(checked) =>
                                toggleRole(user.id, role.code, checked === true)
                              }
                              aria-label={`${user.displayName} - ${role.name}`}
                            />
                            <span className="leading-4">{role.name}</span>
                          </label>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          title="重置密码"
                          aria-label={`重置 ${user.displayName} 的密码`}
                          disabled={savingId === user.id}
                          onClick={() => {
                            setError(null);
                            setResetTarget(user);
                          }}
                        >
                          <KeyRound className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          disabled={unchanged || savingId === user.id}
                          onClick={() => void saveRoles(user)}
                        >
                          {savingId === user.id ? '保存中' : '保存角色'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建平台用户</DialogTitle>
            <DialogDescription>
              用户首次登录后必须修改初始密码。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="new-user-name">姓名</Label>
              <Input
                id="new-user-name"
                maxLength={100}
                value={newUser.displayName}
                onChange={(event) =>
                  setNewUser((current) => ({
                    ...current,
                    displayName: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-user-email">邮箱</Label>
              <Input
                id="new-user-email"
                type="email"
                autoComplete="off"
                value={newUser.email}
                onChange={(event) =>
                  setNewUser((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-user-password">初始密码</Label>
              <Input
                id="new-user-password"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                value={newUser.password}
                onChange={(event) =>
                  setNewUser((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
              />
              <p className="text-sm text-muted-foreground">
                至少 12 个字符，同时包含字母和数字。
              </p>
            </div>
            <fieldset className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <legend className="mb-2 text-sm font-medium">初始角色</legend>
              {roles.map((role) => (
                <label
                  key={role.code}
                  className="flex cursor-pointer items-start gap-2 rounded-md border p-2"
                  title={role.description}
                >
                  <Checkbox
                    checked={newUser.roles.includes(role.code)}
                    onCheckedChange={(checked) =>
                      setNewUser((current) => ({
                        ...current,
                        roles:
                          checked === true
                            ? [...new Set([...current.roles, role.code])]
                            : current.roles.filter(
                                (item) => item !== role.code,
                              ),
                      }))
                    }
                  />
                  <span className="text-sm leading-4">{role.name}</span>
                </label>
              ))}
            </fieldset>
            {error && (
              <Alert variant="destructive" aria-live="polite">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              取消
            </Button>
            <Button
              onClick={() => void submitNewUser()}
              disabled={
                savingId === 'new-user' ||
                !newUser.displayName.trim() ||
                !newUser.email.trim() ||
                newUser.password.length < 12
              }
            >
              {savingId === 'new-user' ? '创建中' : '创建用户'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(resetTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setResetTarget(null);
            setResetPassword('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重置登录密码</DialogTitle>
            <DialogDescription>
              为 {resetTarget?.displayName} 设置临时密码。该用户下次登录后必须修改。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="reset-password">临时密码</Label>
            <Input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              value={resetPassword}
              onChange={(event) => setResetPassword(event.target.value)}
            />
            {error && (
              <Alert variant="destructive" aria-live="polite">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)}>
              取消
            </Button>
            <Button
              onClick={() => void submitPasswordReset()}
              disabled={
                !resetTarget ||
                resetPassword.length < 12 ||
                savingId === resetTarget.id
              }
            >
              {resetTarget && savingId === resetTarget.id
                ? '重置中'
                : '重置密码'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function sameRoles(left: SystemRole[], right: SystemRole[]): boolean {
  return (
    left.length === right.length &&
    [...left].sort().every((role, index) => role === [...right].sort()[index])
  );
}
