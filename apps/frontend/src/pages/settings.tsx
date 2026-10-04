import { useEffect, useState } from 'react';
import { Clock3, LogOut, Users, UserRound } from 'lucide-react';
import { supabase } from '@/lib/supabase';

function dateLabel(value: string) { return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(value)); }
const inputClass = 'mt-2 h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15';

export default function SettingsPage() {
  const [workspace, setWorkspace] = useState<any>(null);
  const [weeks, setWeeks] = useState(2);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [teamName, setTeamName] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [message, setMessage] = useState('');
  const load = async () => { const response = await fetch('/api/workspace'); if (response.ok) { const data = await response.json(); setWorkspace(data); setWeeks(data.retentionWeeks); setTeamId(data.teams?.[0]?.id ?? null); } };
  useEffect(() => { void load(); }, []);
  const saveRetention = async () => { const response = await fetch('/api/workspace/retention', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ weeks, teamId }) }); setMessage(response.ok ? 'Retention policy saved.' : (await response.json()).error); await load(); };
  const createTeam = async () => { const response = await fetch('/api/teams', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: teamName, code: teamCode }) }); setMessage(response.ok ? 'Team created.' : (await response.json()).error); setTeamName(''); setTeamCode(''); await load(); };
  const joinTeam = async () => { const response = await fetch('/api/teams/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: joinCode }) }); setMessage(response.ok ? 'Joined team.' : (await response.json()).error); setJoinCode(''); await load(); };
  const currentTeam = workspace?.teams?.find((team: any) => team.id === teamId);
  return <div className="mx-auto max-w-4xl space-y-8 pb-8">
    <header className="border-b border-border/80 pb-7"><p className="eyebrow text-primary">Workspace</p><h1 className="page-title mt-2 text-[32px] font-bold tracking-[-.045em]">Settings</h1><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Manage your profile, workspace access, and data lifecycle.</p></header>
    {message && <div className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-primary">{message}</div>}
    <section className="surface-panel overflow-hidden rounded-2xl">
      <div className="flex items-center gap-3 border-b border-border px-6 py-5"><span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><UserRound size={17} /></span><div><h2 className="text-sm font-bold">Profile</h2><p className="mt-0.5 text-xs text-muted-foreground">Your account identity and workspace context.</p></div></div>
      <div className="grid gap-6 p-6 sm:grid-cols-2"><div><p className="eyebrow text-muted-foreground">Name</p><p className="mt-2 text-sm font-semibold">{workspace?.name || '—'}</p></div><div><p className="eyebrow text-muted-foreground">Email</p><p className="mt-2 break-all text-sm font-semibold">{workspace?.email || '—'}</p></div></div>
      <div className="border-t border-border px-6 py-6"><label className="eyebrow text-muted-foreground">Team / workspace<select value={teamId ?? ''} onChange={event => setTeamId(event.target.value ? Number(event.target.value) : null)} className={inputClass}><option value="">Personal workspace</option>{workspace?.teams?.map((team: any) => <option value={team.id} key={team.id}>{team.name}</option>)}</select></label>{currentTeam && <p className="mt-3 text-xs text-muted-foreground">Team key: <span className="font-mono text-foreground">{currentTeam.teamCode}</span></p>}
        <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_1fr_auto]"><input value={teamName} onChange={event => setTeamName(event.target.value)} placeholder="New team name" className={`${inputClass} mt-0`} /><input value={teamCode} onChange={event => setTeamCode(event.target.value)} placeholder="Team key (6+ chars)" className={`${inputClass} mt-0`} /><button onClick={createTeam} className="h-11 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/85">Create team</button></div>
        <div className="mt-3 flex gap-3"><input value={joinCode} onChange={event => setJoinCode(event.target.value)} placeholder="Existing team key" className={`${inputClass} mt-0 flex-1`} /><button onClick={joinTeam} className="h-11 rounded-lg border border-border bg-card px-4 text-xs font-semibold text-foreground hover:bg-secondary">Join team</button></div>
      </div>
    </section>
    <section className="surface-panel overflow-hidden rounded-2xl"><div className="flex items-center gap-3 border-b border-border px-6 py-5"><span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Clock3 size={17} /></span><div><h2 className="text-sm font-bold">Data retention</h2><p className="mt-0.5 text-xs text-muted-foreground">Personal data uses your policy. Shared data uses the team owner&apos;s policy.</p></div></div><div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-end sm:justify-between"><label className="block text-xs font-semibold">Policy<select value={weeks} onChange={event => setWeeks(Number(event.target.value))} className="mt-2 h-11 rounded-lg border border-input bg-background px-3.5 text-sm outline-none focus:border-primary"><option value={1}>1 week</option><option value={2}>2 weeks</option></select></label><button onClick={saveRetention} className="h-11 rounded-lg bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/85">Save policy</button></div><p className="border-t border-border px-6 py-4 text-xs text-muted-foreground">Next deletion date: <span className="font-semibold text-foreground">{dateLabel(new Date(Date.now() + weeks * 7 * 86400000).toISOString())}</span></p></section>
    <button onClick={() => void supabase?.auth.signOut()} className="inline-flex items-center gap-2 rounded-lg border border-destructive/30 px-4 py-2.5 text-xs font-semibold text-destructive hover:bg-destructive/10"><LogOut size={14} /> Log out</button>
  </div>;
}
