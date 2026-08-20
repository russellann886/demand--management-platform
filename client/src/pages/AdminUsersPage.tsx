import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, Users } from 'lucide-react';

import { getRoles, getUsers, updateUserRoles } from '@/auth/api';
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Users />
          </div>
          <div className="flex flex-col gap-1">
            <CardTitle className="text-xl">用户角色管理</CardTitle>
            <CardDescription>
              角色保存在 D1，只有超级管理员可以修改。
            </CardDescription>
          </div>
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
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        disabled={unchanged || savingId === user.id}
                        onClick={() => void saveRoles(user)}
                      >
                        {savingId === user.id ? '保存中' : '保存'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function sameRoles(left: SystemRole[], right: SystemRole[]): boolean {
  return (
    left.length === right.length &&
    [...left].sort().every((role, index) => role === [...right].sort()[index])
  );
}
