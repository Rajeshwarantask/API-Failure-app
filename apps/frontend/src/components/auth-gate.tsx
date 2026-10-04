import { FormEvent, useEffect, useState, type ReactNode } from 'react';
import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { setAuthTokenGetter } from '@workspace/api-client-react';

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Awaited<ReturnType<NonNullable<typeof supabase>['auth']['getSession']>>['data']['session']>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    const result = mode === 'sign-in' ? await supabase!.auth.signInWithPassword({ email, password }) : await supabase!.auth.signUp({ email, password, options: { data: { display_name: name.trim() } } });
    if (result.error) setError(result.error.message);
    else if (mode === 'sign-up' && !result.data.session) setMessage('Check your email to confirm your account.');
  }

  return <main className="flex min-h-screen items-center justify-center bg-background px-5 py-12">
    <form onSubmit={submit} className="w-full max-w-[430px] rounded-2xl border border-border bg-card p-8 shadow-xl shadow-foreground/[.04]">
      <div className="mb-8"><p className="eyebrow text-primary">FaultLine API</p><h1 className="mt-3 text-[28px] font-bold tracking-[-.04em]">{mode === 'sign-in' ? 'Sign in to your workspace' : 'Create your workspace account'}</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Keep simulations and execution history isolated to your account.</p></div>
      {mode === 'sign-up' && <label className="mb-4 block text-xs font-semibold">Name<div className="relative mt-2"><UserRound className="absolute left-3 top-3 text-muted-foreground" size={16} /><input required value={name} onChange={event => setName(event.target.value)} className="h-11 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" placeholder="Your name" /></div></label>}
      <label className="block text-xs font-semibold">Email<div className="relative mt-2"><Mail className="absolute left-3 top-3 text-muted-foreground" size={16} /><input required type="email" value={email} onChange={event => setEmail(event.target.value)} className="h-11 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" placeholder="you@company.com" /></div></label>
      <label className="mt-4 block text-xs font-semibold">Password<div className="relative mt-2"><LockKeyhole className="absolute left-3 top-3 text-muted-foreground" size={16} /><input required minLength={8} type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} className="h-11 w-full rounded-lg border border-border bg-background pl-10 pr-11 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" placeholder="At least 8 characters" /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(value => !value)} className="absolute right-2 top-1.5 rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
      {error && <p className="mt-4 text-xs text-destructive">{error}</p>}{message && <p className="mt-4 text-xs text-primary">{message}</p>}
      <button type="submit" className="mt-7 h-11 w-full rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/85">{mode === 'sign-in' ? 'Sign in' : 'Create account'}</button>
      <button type="button" onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setShowPassword(false); }} className="mt-5 w-full text-xs text-muted-foreground hover:text-foreground">{mode === 'sign-in' ? 'Need an account? Create one' : 'Already have an account? Sign in'}</button>
    </form>
  </main>;
}
