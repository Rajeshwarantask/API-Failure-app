import { FormEvent, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { setAuthTokenGetter } from '@workspace/api-client-react';

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Awaited<ReturnType<NonNullable<typeof supabase>['auth']['getSession']>>['data']['session']>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!supabase) return;
    setAuthTokenGetter(async () => (await supabase!.auth.getSession()).data.session?.access_token ?? null);
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!supabase) return <>{children}</>;
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">Loading workspace…</div>;
  if (session) return <>{children}</>;

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setMessage('');
    const result = mode === 'sign-in' ? await supabase!.auth.signInWithPassword({ email, password }) : await supabase!.auth.signUp({ email, password });
    if (result.error) setError(result.error.message);
    else if (mode === 'sign-up' && !result.data.session) setMessage('Check your email to confirm your account.');
  }

  return <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
    <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-border bg-card p-7 shadow-lg">
      <div className="mb-7"><p className="eyebrow text-primary">FaultLine API</p><h1 className="mt-2 text-2xl font-bold">{mode === 'sign-in' ? 'Sign in to your workspace' : 'Create your workspace account'}</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Keep simulations and execution history isolated to your account.</p></div>
      <label className="block text-xs font-semibold">Email<input required type="email" value={email} onChange={event => setEmail(event.target.value)} className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm" /></label>
      <label className="mt-4 block text-xs font-semibold">Password<input required minLength={8} type="password" value={password} onChange={event => setPassword(event.target.value)} className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm" /></label>
      {error && <p className="mt-4 text-xs text-destructive">{error}</p>}{message && <p className="mt-4 text-xs text-primary">{message}</p>}
      <button type="submit" className="mt-6 w-full rounded-md bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground">{mode === 'sign-in' ? 'Sign in' : 'Create account'}</button>
      <button type="button" onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')} className="mt-4 w-full text-xs text-muted-foreground hover:text-foreground">{mode === 'sign-in' ? 'Need an account? Create one' : 'Already have an account? Sign in'}</button>
    </form>
  </main>;
}
