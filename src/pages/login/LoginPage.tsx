import { useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiPost, extractErrorMessages } from '@/lib/api';
import { getToken, setToken } from '@/lib/auth';

type TLoginResponse = { accessToken: string; expiresIn: number };

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [pending, setPending] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If a request is taking a while, say why rather than looking frozen. Driven
  // from the submit handler, not an effect — an effect here would setState on
  // every pending transition and cascade renders.
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (getToken()) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from ?? '/calendar'} replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;

    setPending(true);
    setError(null);
    setSlow(false);
    slowTimer.current = setTimeout(() => setSlow(true), 3000);
    try {
      const res = await apiPost<TLoginResponse>('/api/v1/auth/login', {
        password,
      });
      setToken(res.accessToken);
      // Clear BEFORE navigating so no stale pre-auth cache is rendered.
      queryClient.clear();
      toast.success('Welcome back');
      void navigate('/calendar', { replace: true });
    } catch (err) {
      setError(extractErrorMessages(err)[0] ?? 'Could not sign in');
    } finally {
      if (slowTimer.current) clearTimeout(slowTimer.current);
      setSlow(false);
      setPending(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-background p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground shadow">
            <Wallet className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl">Kwenta</h1>
            <p className="mt-1 text-sm text-text-muted">
              Enter your password to continue
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex flex-col gap-4 rounded-lg border bg-card p-5 shadow-sm"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={reveal ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus
                placeholder="••••••••"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'password-error' : undefined}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setReveal((v) => !v)}
                aria-label={reveal ? 'Hide password' : 'Show password'}
                className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-foreground"
              >
                {reveal ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
            {error ? (
              <p id="password-error" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>

          <Button type="submit" disabled={pending || !password}>
            {pending && slow ? 'Signing in… waking the server' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-text-faint">
          Single-user tracker. Nothing here is shared.
        </p>
      </div>
    </main>
  );
}
