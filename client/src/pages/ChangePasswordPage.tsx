import { useState, type FormEvent } from 'react';
import { KeyRound, LoaderCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ChangePasswordPage({
  mode = 'forced',
}: {
  mode?: 'forced' | 'account';
}) {
  const { changePassword, user } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    if (newPassword !== confirmation) {
      setError('两次输入的新密码不一致。');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await changePassword(currentPassword, newPassword);
      if (mode === 'account') {
        toast.success('密码已更新，其他登录会话已退出。');
        navigate('/');
      }
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : '密码更新失败，请稍后重试。',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const content = (
      <section className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <KeyRound className="size-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold">设置新密码</h1>
            <p className="mt-1 break-all text-sm text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </div>

        <p className="mb-6 text-sm leading-6 text-muted-foreground">
          首次登录或管理员重置密码后，需要先设置新密码。新密码至少 12
          个字符，并同时包含字母和数字。
        </p>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <PasswordField
            id="current-password"
            label="当前密码"
            value={currentPassword}
            autoComplete="current-password"
            onChange={setCurrentPassword}
            disabled={submitting}
          />
          <PasswordField
            id="new-password"
            label="新密码"
            value={newPassword}
            autoComplete="new-password"
            onChange={setNewPassword}
            disabled={submitting}
          />
          <PasswordField
            id="confirm-password"
            label="确认新密码"
            value={confirmation}
            autoComplete="new-password"
            onChange={setConfirmation}
            disabled={submitting}
          />

          {error && (
            <Alert variant="destructive" aria-live="polite">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button className="w-full" type="submit" disabled={submitting}>
            {submitting && <LoaderCircle className="size-4 animate-spin" />}
            {submitting ? '正在保存' : '保存新密码'}
          </Button>
        </form>
      </section>
  );

  if (mode === 'account') {
    return <div className="mx-auto flex max-w-md py-6">{content}</div>;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      {content}
    </main>
  );
}

function PasswordField({
  id,
  label,
  value,
  autoComplete,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  autoComplete: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="password"
        value={value}
        autoComplete={autoComplete}
        minLength={12}
        maxLength={128}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        required
      />
    </div>
  );
}
