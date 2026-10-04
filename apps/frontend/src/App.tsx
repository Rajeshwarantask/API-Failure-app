import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { AuthGate } from '@/components/auth-gate';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import SettingsPage from '@/pages/settings';
import { DeveloperActions } from '@/components/developer-actions';
import { RegressionTestGenerator } from '@/components/regression-test-generator';
import { SimulationRecipes } from '@/components/simulation-recipes';
import type { FormState } from '@/simulation-form-types';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Circle,
  Clock3,
  Code2,
  Copy,
  Database,
  ExternalLink,
  GitBranch,
  GitCompare,
  Globe2,
  History,
  Menu,
  Pencil,
  Play,
  Plus,
  Radar,
  RefreshCw,
  Search,
  Server,
  Settings2,
  ShieldAlert,
  SlidersHorizontal,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import {
  getGetDashboardSummaryQueryKey,
  getGetExecutionQueryKey,
  getGetSimulationQueryKey,
  getHealthCheckQueryKey,
  getListExecutionsQueryKey,
  getListSimulationsQueryKey,
  useCompareExecutions,
  useCreateRecoveryWorkflow,
  useCreateSimulation,
  useDeleteSimulation,
  useGetDashboardSummary,
  useGetExecution,
  useGetSimulation,
  useHealthCheck,
  useListExecutions,
  useListSimulations,
  useReplayExecution,
  useRunSimulation,
  useUpdateSimulation,
} from '@workspace/api-client-react';
import {
  Route,
  Switch,
  Link,
  useLocation,
  useParams,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

type KV = Record<string, string>;

const failureOptions = [
  ['none', 'No failure'], ['http_400', '400 Bad Request'], ['http_401', '401 Unauthorized'], ['http_403', '403 Forbidden'],
  ['http_404', '404 Not Found'], ['http_429', '429 Rate Limited'], ['http_500', '500 Internal Error'], ['http_502', '502 Bad Gateway'],
  ['http_503', '503 Service Unavailable'], ['timeout', 'Timeout'], ['latency', 'Added latency'], ['connection_failure', 'Connection failure'],
  ['malformed_json', 'Malformed JSON'], ['empty_response', 'Empty response'], ['duplicate_response', 'Duplicate response'],
] as const;
const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const initialForm: FormState = {
  name: '', description: '', targetUrl: '', method: 'GET', headers: '{}', queryParams: '{}', requestBody: '',
  failureType: 'http_503', statusCode: '503', responseBody: '{\n  "error": "service_unavailable",\n  "message": "upstream dependency failed"\n}',
  latencyMs: '0', timeoutMs: '30000', probability: '100', conditionMethod: '', conditionPath: '', conditionHeaders: '{}', conditionQueryParams: '{}', conditionBodyContains: '', forwardRequest: false, forwardTimeoutMs: '10000', preserveHeaders: true, enabled: true,
};

function parseMap(value: string): KV {
  try { return parseJsonMap(value); } catch { return {}; }
}
function parseJsonMap(value: string): KV {
  const parsed = JSON.parse(value || '{}');
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Expected a JSON object');
  return parsed as KV;
}
function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
}
function formatNumber(value = 0) { return new Intl.NumberFormat('en-US').format(value); }
function pct(failed: number, total: number) { return total ? `${((failed / total) * 100).toFixed(1)}%` : '0.0%'; }
function errorText(error: unknown) { return error instanceof Error ? error.message : 'The API returned an unexpected response.'; }
function toForm(simulation: any): FormState {
  return {
    name: simulation.name ?? '', description: simulation.description ?? '', targetUrl: simulation.targetUrl ?? '', method: simulation.method ?? 'GET',
    headers: JSON.stringify(simulation.headers ?? {}, null, 2), queryParams: JSON.stringify(simulation.queryParams ?? {}, null, 2),
    requestBody: simulation.requestBody ?? '', failureType: simulation.failureType ?? 'none', statusCode: String(simulation.statusCode ?? ''),
    responseBody: simulation.responseBody ?? '', latencyMs: String(simulation.latencyMs ?? 0), timeoutMs: String(simulation.timeoutMs ?? 30000),
    probability: String(simulation.probability ?? 100), conditionMethod: simulation.conditions?.method ?? '', conditionPath: simulation.conditions?.path ?? '', conditionHeaders: JSON.stringify(simulation.conditions?.headers ?? {}, null, 2), conditionQueryParams: JSON.stringify(simulation.conditions?.queryParams ?? {}, null, 2), conditionBodyContains: simulation.conditions?.bodyContains ?? '', forwardRequest: Boolean(simulation.forwardRequest), forwardTimeoutMs: String(simulation.forwardTimeoutMs ?? 10000),
    preserveHeaders: simulation.preserveHeaders !== false, enabled: simulation.enabled !== false,
  };
}

function Logo({ compact = false }: { compact?: boolean }) {
  return <Link href="/" data-testid="link-home" className="group flex items-center gap-3">
    <img
      src="/faultline-api-logo.png"
      alt="FaultLine API logo"
      className="size-9 rounded-xl object-cover shadow-sm"
    />
    {!compact && <span className="text-[13px] font-semibold tracking-[.08em] text-foreground">FaultLine API</span>}
  </Link>;
}

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { data: health } = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), refetchInterval: 30000 } });
  const nav = [
    { href: '/', label: 'Overview', icon: Activity },
    { href: '/simulations', label: 'Simulations', icon: SlidersHorizontal },
    { href: '/recovery', label: 'Recovery', icon: GitBranch },
    { href: '/settings', label: 'Settings', icon: Settings2 },
  ];
  return <div className="min-h-[100dvh] bg-background text-foreground">
    <header className="fixed inset-x-0 top-0 z-50 flex h-[64px] items-center justify-between border-b border-border bg-background/95 px-5 shadow-sm backdrop-blur md:px-8">
      <div className="flex items-center gap-3">
        <button aria-label="Toggle workspace navigation" data-testid="button-toggle-sidebar-mobile" onClick={() => setMobileOpen(value => !value)} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:hidden"><Menu size={17} /></button>
        <Logo />
      </div>
      <div className="flex size-7 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-secondary-foreground">OP</div>
    </header>
    <aside className={`${mobileOpen ? 'translate-x-0' : '-translate-x-full'} ${sidebarCollapsed ? 'md:w-[68px]' : 'md:w-[240px]'} fixed inset-y-0 left-0 top-[64px] z-40 flex w-[240px] flex-col border-r border-sidebar-border bg-sidebar transition-[width,transform] duration-200 md:translate-x-0`}>
      <div className="flex h-[58px] shrink-0 items-center justify-between border-b border-sidebar-border px-4">
        {!sidebarCollapsed && <span className="text-[11px] font-semibold text-sidebar-foreground/45">Workspace</span>}
        <button aria-label="Toggle workspace navigation" data-testid="button-toggle-sidebar" onClick={() => { if (window.innerWidth < 768) setMobileOpen(value => !value); else setSidebarCollapsed(value => !value); }} className={`rounded-lg p-2 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground ${sidebarCollapsed ? 'mx-auto' : ''}`}><Menu size={17} /></button>
      </div>
      <div className="flex-1 px-3 py-5">
        <nav className="flex flex-col gap-1">
          {nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} title={sidebarCollapsed ? label : undefined} onClick={() => setMobileOpen(false)} data-testid={`link-nav-${label.toLowerCase()}`} className={`group flex items-center gap-3 rounded-lg py-2.5 text-sm ${sidebarCollapsed ? 'justify-center px-2' : 'px-3'} ${location === href ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground' : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'}`}>
            <Icon size={15} strokeWidth={1.8} />{!sidebarCollapsed && <span>{label}</span>}{!sidebarCollapsed && href === '/simulations' && <span className="ml-auto text-[10px] text-sidebar-foreground/35">Library</span>}
          </Link>)}
        </nav>
      </div>
      <div className={`mt-auto ${sidebarCollapsed ? 'p-3' : 'p-4'}`}>
        <div className={`rounded-xl border border-sidebar-border bg-sidebar-accent/35 ${sidebarCollapsed ? 'flex justify-center p-3' : 'p-3'}`} title={sidebarCollapsed ? 'Simulator gateway operational' : undefined}>
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-2'}`}><span className={`size-2 shrink-0 rounded-full ${health?.status === 'ok' ? 'bg-primary pulse-dot' : 'bg-sidebar-foreground/30'}`} />{!sidebarCollapsed && <span className="text-xs text-sidebar-foreground/70">Simulator gateway</span>}</div>
          {!sidebarCollapsed && <div className="mt-2 flex items-center justify-between"><span className="eyebrow text-sidebar-foreground/35">Status</span><span className="mono-data text-[10px] text-primary">{health?.status === 'ok' ? 'OPERATIONAL' : 'CHECKING'}</span></div>}
        </div>
        {!sidebarCollapsed && <div className="mt-4 flex items-center gap-2 px-2 text-[10px] text-sidebar-foreground/35"><Code2 size={13} /> v0.1.0 / local environment</div>}
      </div>
    </aside>
    {mobileOpen && <button aria-label="Close menu" data-testid="button-close-menu" onClick={() => setMobileOpen(false)} className="fixed inset-0 top-[64px] z-30 bg-slate-950/40 md:hidden" />}
    <main className={`min-h-[100dvh] pt-[64px] transition-[padding] duration-200 ${sidebarCollapsed ? 'md:pl-[68px]' : 'md:pl-[240px]'}`}>
      <div className="app-grid min-h-[calc(100dvh-64px)]"><div className="page-enter mx-auto max-w-[1480px] px-5 py-8 md:px-10 md:py-9">{children}</div></div>
    </main>
  </div>;
}

type BreadcrumbItem = { label: string; href?: string };
function PageHeading({ breadcrumbs, title, description, actions }: { breadcrumbs: BreadcrumbItem[]; title: string; description?: string; actions?: ReactNode }) {
  return <div className="mb-7 flex flex-col justify-between gap-5 border-b border-border/80 pb-7 lg:flex-row lg:items-end"><div>
    <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      {breadcrumbs.map((crumb, index) => <span key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
        {index > 0 && <ChevronRight size={13} className="text-muted-foreground/40" />}
        {crumb.href ? <Link href={crumb.href} className="transition-colors hover:text-primary">{crumb.label}</Link> : <span className={index === breadcrumbs.length - 1 ? 'font-medium text-foreground/75' : ''}>{crumb.label}</span>}
      </span>)}
    </nav>
    <h1 className="page-title text-[32px] font-bold tracking-[-.045em] text-foreground md:text-[40px]">{title}</h1>
    {description && <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-foreground">{description}</p>}
  </div>{actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}</div>;
}

function Button({ children, variant = 'primary', className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  const variants = { primary: 'border border-primary bg-primary text-primary-foreground hover:bg-primary/85', secondary: 'border border-border bg-card text-foreground hover:bg-secondary', ghost: 'border border-transparent text-muted-foreground hover:border-border hover:bg-secondary hover:text-foreground', danger: 'border border-destructive/40 text-destructive hover:bg-destructive/10' };
  return <button {...props} className={`inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold tracking-wide shadow-sm disabled:cursor-not-allowed disabled:opacity-45 ${variants[variant]} ${className}`}>{children}</button>;
}
function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'good' | 'warn' | 'bad' }) {
  const tones = { neutral: 'border-border bg-secondary text-muted-foreground', good: 'border-primary/25 bg-primary/10 text-primary', warn: 'border-accent/35 bg-accent/15 text-accent-foreground', bad: 'border-destructive/25 bg-destructive/10 text-destructive' };
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[.1em] ${tones[tone]}`}><span className={`size-1.5 rounded-full ${tone === 'good' ? 'bg-primary' : tone === 'bad' ? 'bg-destructive' : tone === 'warn' ? 'bg-accent' : 'bg-muted-foreground/50'}`} />{children}</span>;
}
function Panel({ children, className = '' }: { children: ReactNode; className?: string }) { return <section className={`surface-panel rounded-xl border border-border bg-card shadow-sm ${className}`}>{children}</section>; }
function PanelTitle({ icon: Icon, title, meta }: { icon?: any; title: string; meta?: ReactNode }) { return <div className="panel-title flex items-center justify-between px-5 py-3.5"><div className="flex items-center gap-2.5">{Icon && <Icon size={14} className="text-primary" />}<h2>{title}</h2></div>{meta && <div className="eyebrow text-muted-foreground">{meta}</div>}</div>; }
function LoadingBlocks() { return <div className="space-y-4" aria-label="Loading"><div className="surface-panel p-5"><div className="loading-line w-24" /><div className="mt-5 loading-line w-2/3" /><div className="mt-3 loading-line w-1/2" /></div>{[1, 2].map(i => <div key={i} className="surface-panel h-20 p-5"><div className="loading-line w-1/3" /><div className="mt-3 loading-line w-4/5" /></div>)}</div>; }
function QueryError({ message, retry }: { message?: string; retry: () => void }) { return <div className="hazard-strip p-7"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 text-destructive" size={20} /><div><p className="text-sm font-semibold">Control plane unavailable</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{message || 'Could not load this surface.'}</p><Button variant="danger" onClick={retry} data-testid="button-retry" className="mt-4"><RefreshCw size={13} /> Retry request</Button></div></div></div>; }
function ConfirmDialog({ name, pending, onCancel, onConfirm }: { name: string; pending: boolean; onCancel: () => void; onConfirm: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-5 backdrop-blur-sm" role="presentation">
    <button aria-label="Close delete dialog" className="absolute inset-0 cursor-default" onClick={onCancel} />
    <div role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title" className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
      <div className="flex items-start gap-4"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive"><Trash2 size={18} /></span><div><h2 id="delete-dialog-title" className="text-base font-bold">Delete simulation?</h2><p className="mt-1.5 text-sm leading-6 text-muted-foreground">This will permanently remove <span className="font-semibold text-foreground">“{name}”</span> and its execution history.</p></div></div>
      <div className="mt-6 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onCancel} data-testid="button-cancel-delete">Cancel</Button><Button type="button" variant="danger" disabled={pending} onClick={onConfirm} data-testid="button-confirm-delete">{pending ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />} {pending ? 'Deleting…' : 'Delete simulation'}</Button></div>
    </div>
  </div>;
}

function Stat({ label, value, detail, tone = 'default', icon: Icon }: { label: string; value: ReactNode; detail?: string; tone?: 'default' | 'teal' | 'amber' | 'red'; icon?: any }) {
  const toneMap = { default: 'text-foreground', teal: 'text-primary', amber: 'text-accent-foreground', red: 'text-destructive' };
  return <div className={`metric-tile rounded-xl border border-border bg-card px-5 py-5 shadow-sm ${tone === 'red' ? 'border-t-2 border-t-destructive' : tone === 'teal' ? 'border-t-2 border-t-primary' : ''}`}><div className="flex items-start justify-between"><span className="eyebrow font-semibold text-muted-foreground">{label}</span>{Icon && <Icon size={15} className="text-muted-foreground/50" />}</div><div className={`mono-data mt-3 text-3xl font-semibold tracking-[-.05em] ${toneMap[tone]}`}>{value}</div>{detail && <div className="mt-2 text-[11px] text-muted-foreground">{detail}</div>}</div>;
}

function Dashboard() {
  const { data, isLoading, isError, error, refetch } = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } });
  const { data: simulationData } = useListSimulations({ query: { queryKey: getListSimulationsQueryKey() } });
  const simulations = Array.isArray(simulationData)
    ? simulationData
    : Array.isArray((simulationData as any)?.data)
      ? (simulationData as any).data
      : Array.isArray((simulationData as any)?.simulations)
        ? (simulationData as any).simulations
        : [];
  const runs = Array.isArray(data?.recentRuns) ? data.recentRuns : [];
  return <><PageHeading breadcrumbs={[{ label: 'Workspace' }, { label: 'Overview' }]} title="Break it. Observe recovery." description="Inject controlled faults into known request paths, then inspect what your software actually does under pressure." actions={<Link href="/simulations/new" data-testid="link-create-simulation" className="inline-flex items-center gap-2 rounded-md border border-primary bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/85"><Plus size={15} /> New simulation</Link>} />
    {isLoading ? <LoadingBlocks /> : isError ? <QueryError message={errorText(error)} retry={() => refetch()} /> : <div className="space-y-6">
       <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.3fr_1fr_1fr_1fr]"><Stat label="Total simulations" value={formatNumber(data?.totalSimulations)} detail={`${data?.activeSimulations ?? 0} enabled now`} icon={SlidersHorizontal} /><Stat label="Requests executed" value={formatNumber(data?.requestsExecuted)} detail="across all scenarios" tone="teal" icon={Zap} /><Stat label="Injected failures" value={formatNumber(data?.failedRequests)} detail={`${pct(data?.failedRequests ?? 0, data?.requestsExecuted ?? 0)} of traffic`} tone="red" icon={ShieldAlert} /><Stat label="Pass-through requests" value={formatNumber(data?.successfulRequests)} detail="returned without injection" tone="teal" icon={Check} /></div>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_.9fr]">
        <Panel><PanelTitle icon={Activity} title="Recent test runs" meta={`${runs.length} latest`} />{runs.length === 0 ? <EmptyState icon={Activity} title="No executions yet" description="Run a simulation to begin building an observable failure history." action={<Link href="/simulations" className="text-xs font-semibold text-primary" data-testid="link-browse-simulations">Browse simulations <ArrowRight size={13} className="inline" /></Link>} /> : <div className="divide-y divide-border">{runs.slice(0, 7).map(run => <ExecutionRow key={run.id} execution={run} />)}</div>}</Panel>
        <Panel><PanelTitle icon={Radar} title="Simulation fleet" meta={`${simulations.length} configured`} /><div className="p-5"><div className="mb-5 flex items-end justify-between"><div><div className="mono-data text-4xl font-semibold">{data?.activeSimulations ?? 0}<span className="text-lg text-muted-foreground">/{data?.totalSimulations ?? 0}</span></div><div className="mt-1 text-xs text-muted-foreground">active scenarios</div></div><Badge tone="good">nominal</Badge></div><div className="h-2 bg-secondary"><div className="h-full bg-primary" style={{ width: `${data?.totalSimulations ? ((data.activeSimulations / data.totalSimulations) * 100) : 0}%` }} /></div><div className="mt-5 space-y-3">{simulations.slice(0, 4).map((sim: any) => <Link href={`/simulations/${sim.id}`} key={sim.id} data-testid={`link-fleet-${sim.id}`} className="flex items-center justify-between border-b border-border/70 pb-3 text-xs last:border-0 last:pb-0"><span className="flex min-w-0 items-center gap-2"><span className={`size-1.5 shrink-0 rounded-full ${sim.enabled ? 'bg-primary pulse-dot' : 'bg-muted-foreground/40'}`} /><span className="truncate">{sim.name}</span></span><span className="mono-data text-muted-foreground">{formatNumber(sim.requestCount)}</span></Link>)}</div></div></Panel>
      </div>
       <Panel><PanelTitle icon={History} title="Recent simulations" meta="configured scenarios" /><div className="divide-y divide-border">{simulations.slice(0, 3).map((sim: any) => <Link href={`/simulations/${sim.id}`} key={sim.id} data-testid={`card-recent-simulation-${sim.id}`} className="group grid gap-3 px-5 py-4 hover:bg-secondary/45 md:grid-cols-[120px_minmax(0,1fr)_170px_120px] md:items-center"><Badge tone={sim.enabled ? 'good' : 'neutral'}>{sim.enabled ? 'enabled' : 'paused'}</Badge><div className="min-w-0"><h3 className="truncate text-sm font-semibold">{sim.name}</h3><p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{sim.method} {sim.targetUrl}</p></div><span className="mono-data text-[10px] text-muted-foreground">#{String(sim.id).padStart(4, '0')} / {formatDate(sim.updatedAt)}</span><span className="text-right text-[11px] font-semibold text-primary opacity-70 transition-opacity group-hover:opacity-100">Inspect <ChevronRight className="inline" size={13} /></span></Link>)}{simulations.length === 0 && <EmptyState icon={Database} title="No scenarios configured" description="Create the first controlled failure path." action={<Link href="/simulations/new" data-testid="link-empty-create" className="text-xs font-semibold text-primary">Create simulation</Link>} />}</div></Panel>
    </div>}
  </>;
}

function EmptyState({ icon: Icon, title, description, action }: { icon: any; title: string; description: string; action?: ReactNode }) { return <div className="px-6 py-14 text-center"><Icon size={22} className="mx-auto text-muted-foreground/50" /><h3 className="mt-3 text-sm font-semibold">{title}</h3><p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted-foreground">{description}</p>{action && <div className="mt-4">{action}</div>}</div>; }
function ExecutionRow({ execution, compact = false }: { execution: any; compact?: boolean }) {
  const statusCode = typeof execution.simulatedStatus === 'number' ? execution.simulatedStatus : Number(execution.simulatedStatus);
  const statusTone = Number.isFinite(statusCode) && statusCode >= 200 && statusCode < 300 ? 'success' : Number.isFinite(statusCode) && statusCode >= 400 ? 'failure' : execution.status === 'timeout' ? 'timeout' : execution.status === 'success' ? 'success' : 'failure';
  const statusClasses = statusTone === 'success' ? 'border-[hsl(var(--chart-5)/.3)] bg-[hsl(var(--chart-5)/.1)] text-[hsl(var(--chart-5))]' : statusTone === 'timeout' ? 'border-accent/35 bg-accent/10 text-accent-foreground' : 'border-destructive/30 bg-destructive/10 text-destructive';
  const statusTextClass = statusTone === 'success' ? 'text-[hsl(var(--chart-5))]' : statusTone === 'timeout' ? 'text-accent-foreground' : 'text-destructive';
  return <Link href={`/executions/${execution.id}`} data-testid={`link-execution-${execution.id}`} className="group flex items-center gap-4 px-5 py-4 hover:bg-secondary/45"><span className={`flex size-7 shrink-0 items-center justify-center rounded-lg border ${statusClasses}`}>{statusTone === 'success' ? <Check size={14} /> : statusTone === 'timeout' ? <Clock3 size={14} /> : <X size={14} />}</span><span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className="mono-data text-[11px] font-semibold">{execution.method}</span><span className="truncate font-mono text-xs text-muted-foreground">{execution.url}</span></span><span className="mt-1 block text-[11px] text-muted-foreground">{formatDate(execution.createdAt)} <span className="mx-1 text-border">/</span> {execution.failureType === 'none' ? 'pass-through' : execution.failureType.replaceAll('_', ' ')}</span></span><span className="hidden text-right sm:block"><span className={`mono-data block text-xs font-semibold ${statusTextClass}`}>{execution.simulatedStatus ?? '—'}</span><span className="mono-data text-[10px] text-muted-foreground">{execution.actualLatencyMs}ms</span></span><ChevronRight size={15} className="text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" /></Link>;
}

function Simulations() {
  const { data, isLoading, isError, error, refetch } = useListSimulations({ query: { queryKey: getListSimulationsQueryKey() } });
  const simulations = Array.isArray(data)
    ? data
    : Array.isArray((data as any)?.data)
      ? (data as any).data
      : Array.isArray((data as any)?.simulations)
        ? (data as any).simulations
        : [];
  const del = useDeleteSimulation();
  const run = useRunSimulation();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const filtered = useMemo(() => simulations.filter((sim: any) => `${sim.name} ${sim.targetUrl} ${sim.failureType}`.toLowerCase().includes(search.toLowerCase())), [simulations, search]);
  const remove = () => { if (!deleteTarget) return; del.mutate({ id: deleteTarget.id }, { onSuccess: () => { setNotice('Simulation deleted'); setDeleteTarget(null); queryClient.invalidateQueries({ queryKey: getListSimulationsQueryKey() }); } }); };
  const execute = (id: number, replay = false) => run.mutate({ id, data: undefined }, { onSuccess: (execution) => { setNotice(`Run #${execution.id} completed`); queryClient.invalidateQueries({ queryKey: getListSimulationsQueryKey() }); if (replay) setLocation(`/executions/${execution.id}/replay`); } });
  return <><PageHeading breadcrumbs={[{ label: 'Workspace' }, { label: 'Simulations', href: '/simulations' }]} title="Failure scenarios" description="Configure repeatable failure behavior and run it against a known request shape." actions={<Link href="/simulations/new" data-testid="link-new-simulation" className="inline-flex items-center gap-2 rounded-md border border-primary bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/85"><Plus size={15} /> New simulation</Link>} />
     {notice && <div className="mb-4 flex items-center justify-between rounded-lg border border-primary/25 bg-primary/10 px-4 py-3 text-xs text-primary"><span className="flex items-center gap-2"><Check size={14} /> {notice}</span><button className="rounded-md p-1 hover:bg-primary/10" data-testid="button-dismiss-notice" onClick={() => setNotice('')}><X size={14} /></button></div>}
     <Panel><div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between"><label className="relative block w-full sm:max-w-sm"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input data-testid="input-search-simulations" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, URL, failure type…" className="w-full rounded-md border border-border bg-background py-2.5 pl-9 pr-3 text-xs outline-none placeholder:text-muted-foreground/60 focus:border-primary" /></label><div className="flex items-center gap-3 text-[11px] text-muted-foreground"><span className="mono-data">{filtered.length} shown</span><span className="h-4 w-px bg-border" /><span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-primary" /> enabled</span></div></div>
       {isLoading ? <div className="p-4"><LoadingBlocks /></div> : isError ? <div className="p-5"><QueryError message={errorText(error)} retry={() => refetch()} /></div> : filtered.length === 0 ? <EmptyState icon={Search} title={search ? 'No matching simulations' : 'No simulations yet'} description={search ? 'Try a different search term.' : 'Create a scenario to make failure behavior observable.'} action={!search && <Link href="/simulations/new" data-testid="link-list-empty-create" className="text-xs font-semibold text-primary">Create your first simulation <ArrowRight size={13} className="inline" /></Link>} /> : <div className="divide-y divide-border">{filtered.map((sim: any) => <div key={sim.id} data-testid={`row-simulation-${sim.id}`} className="group grid gap-4 px-5 py-5 hover:bg-secondary/30 lg:grid-cols-[minmax(240px,1.3fr)_minmax(220px,1fr)_130px_165px] lg:items-center"><div className="flex min-w-0 items-start gap-3"><span className={`mt-1.5 size-2 shrink-0 rounded-full ${sim.enabled ? 'bg-primary pulse-dot' : 'bg-muted-foreground/35'}`} /><div className="min-w-0"><Link href={`/simulations/${sim.id}`} data-testid={`link-simulation-${sim.id}`} className="truncate text-sm font-semibold hover:text-primary">{sim.name}</Link><div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{sim.method} {sim.targetUrl}</div></div></div><div className="flex items-center gap-2"><Badge tone={sim.failureType === 'none' ? 'neutral' : 'bad'}>{sim.failureType.replaceAll('_', ' ')}</Badge>{sim.probability < 100 && <span className="mono-data text-[10px] text-muted-foreground">{sim.probability}%</span>}</div><div className="flex items-center gap-5 text-[11px] lg:block"><div className="mono-data font-semibold">{formatNumber(sim.requestCount)} <span className="font-sans font-normal text-muted-foreground">runs</span></div><div className="mt-1 text-muted-foreground">{formatNumber(sim.failedCount)} failures</div></div><div className="flex items-center justify-end gap-1"><Button variant="ghost" title="Run simulation" disabled={run.isPending} onClick={() => execute(sim.id)} data-testid={`button-run-simulation-${sim.id}`}><Play size={14} /> <span className="hidden xl:inline">Run</span></Button><Button variant="ghost" title="Run and open replay" disabled={run.isPending} onClick={() => execute(sim.id, true)} data-testid={`button-replay-simulation-${sim.id}`}><History size={14} /><span className="hidden xl:inline">Replay</span></Button><Link href={`/simulations/${sim.id}/edit`} data-testid={`link-edit-simulation-${sim.id}`} className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"><Pencil size={14} /></Link><button onClick={() => setDeleteTarget({ id: sim.id, name: sim.name })} data-testid={`button-delete-simulation-${sim.id}`} className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 size={14} /></button></div></div>)}</div>}
     </Panel>
     {deleteTarget && <ConfirmDialog name={deleteTarget.name} pending={del.isPending} onCancel={() => setDeleteTarget(null)} onConfirm={remove} />}
  </>;
}

function Field({ label, hint, children, className = '' }: { label: string; hint?: string; children: ReactNode; className?: string }) { return <label className={`block ${className}`}><span className="mb-2 flex items-center justify-between text-xs font-semibold"><span>{label}</span>{hint && <span className="font-mono text-[10px] font-normal text-muted-foreground">{hint}</span>}</span>{children}</label>; }
function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) { return <input {...props} className={`w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground/55 focus:border-primary focus:ring-2 focus:ring-primary/10 ${className}`} />; }
function Textarea({ className = '', ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea {...props} className={`w-full resize-y rounded-md border border-input bg-background px-3 py-2.5 font-mono text-xs leading-5 outline-none placeholder:text-muted-foreground/55 focus:border-primary focus:ring-2 focus:ring-primary/10 ${className}`} />; }
function Toggle({ checked, onChange, label, testId }: { checked: boolean; onChange: (value: boolean) => void; label: string; testId: string }) { return <button type="button" data-testid={testId} onClick={() => onChange(!checked)} className="flex items-center gap-3 text-left"><span className={`relative h-5 w-9 rounded-full border ${checked ? 'border-primary bg-primary' : 'border-input bg-secondary'}`}><span className={`absolute top-0.5 size-3.5 rounded-full bg-card shadow-sm transition-transform ${checked ? 'translate-x-[17px]' : 'translate-x-0.5'}`} /></span><span className="text-xs">{label}</span></button>; }

function SimulationForm({ id, existing }: { id?: number; existing?: any }) {
  const [form, setForm] = useState<FormState>(existing ? toForm(existing) : initialForm);
  const [error, setError] = useState('');
  const [, setLocation] = useLocation();
  const create = useCreateSimulation();
  const update = useUpdateSimulation();
  const isPending = create.isPending || update.isPending;
  useEffect(() => { if (existing) setForm(toForm(existing)); }, [existing]);
  const set = (key: keyof FormState, value: string | boolean) => setForm(prev => ({ ...prev, [key]: value }));
  const applyRecipe = (patch: Partial<FormState>) => setForm(prev => ({ ...prev, ...patch }));
  const submit = (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    let target: URL;
    try { target = new URL(form.targetUrl.trim()); if (!['http:', 'https:'].includes(target.protocol)) throw new Error(); } catch { setError('Enter a valid HTTP or HTTPS target URL.'); return; }
    if (!form.name.trim()) { setError('A simulation name is required.'); return; }
    const probability = Number(form.probability);
    const latencyMs = Number(form.latencyMs);
    const timeoutMs = Number(form.timeoutMs);
    if (!Number.isFinite(probability) || probability < 0 || probability > 100) { setError('Probability must be between 0 and 100.'); return; }
    if (!Number.isFinite(latencyMs) || latencyMs < 0 || !Number.isFinite(timeoutMs) || timeoutMs < 0) { setError('Latency and timeout must be non-negative.'); return; }
  let headers: KV; let queryParams: KV; let conditionHeaders: KV; let conditionQueryParams: KV;
  try { headers = parseJsonMap(form.headers); queryParams = parseJsonMap(form.queryParams); conditionHeaders = parseJsonMap(form.conditionHeaders); conditionQueryParams = parseJsonMap(form.conditionQueryParams); if (form.requestBody.trim()) JSON.parse(form.requestBody); if (form.responseBody.trim() && form.failureType !== 'malformed_json') JSON.parse(form.responseBody); } catch { setError('Headers, query parameters, request body, and response body must contain valid JSON.'); return; }
    const payload = {
      name: form.name.trim(), description: form.description, targetUrl: target.toString(), method: form.method,
  headers, queryParams, requestBody: form.requestBody,
  conditions: { method: form.conditionMethod || undefined, path: form.conditionPath || undefined, headers: conditionHeaders, queryParams: conditionQueryParams, bodyContains: form.conditionBodyContains || undefined },
  failureType: form.failureType, statusCode: form.statusCode ? Number(form.statusCode) : undefined, responseBody: form.responseBody,
      latencyMs, timeoutMs, probability,
      forwardRequest: form.forwardRequest, forwardTimeoutMs: Number(form.forwardTimeoutMs) || 0, preserveHeaders: form.preserveHeaders, enabled: form.enabled,
    };
    const done = (sim: any) => { queryClient.invalidateQueries({ queryKey: getListSimulationsQueryKey() }); if (sim?.id) { queryClient.invalidateQueries({ queryKey: getGetSimulationQueryKey(sim.id) }); setLocation(`/simulations/${sim.id}`); } };
    if (id) update.mutate({ id, data: payload as any }, { onSuccess: done, onError: e => setError(errorText(e)) });
    else create.mutate({ data: payload as any }, { onSuccess: done, onError: e => setError(errorText(e)) });
  };
  return <>
    {!id && <SimulationRecipes onSelect={applyRecipe} />}
    <form onSubmit={submit} className="space-y-6">
    {error && <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-destructive"><AlertTriangle size={14} /> {error}</div>}
    <Panel><PanelTitle icon={Settings2} title="Basic information" meta="identity & target" /><div className="grid gap-5 p-5 md:grid-cols-2"><Field label="Simulation name"><Input data-testid="input-simulation-name" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Checkout API / upstream outage" /></Field><Field label="Target URL" hint="Faultline forwards here"><Input data-testid="input-target-url" value={form.targetUrl} onChange={e => set('targetUrl', e.target.value)} placeholder="https://api.example.com/v1/checkout" /></Field><Field label="Description" className="md:col-span-2"><Textarea data-testid="input-simulation-description" rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder="What production behavior does this scenario reproduce?" className="font-sans" /></Field></div></Panel>
    <Panel><PanelTitle icon={Globe2} title="Request configuration" meta="YOUR APPLICATION → FAULTLINE" /><p className="px-5 pt-4 text-xs text-muted-foreground">Configure the request sent to Faultline&apos;s simulator endpoint.</p><div className="grid gap-5 p-5 md:grid-cols-2"><Field label="Incoming method" hint="request sent to Faultline"><select data-testid="select-method" value={form.method} onChange={e => set('method', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary">{methods.map(method => <option key={method}>{method}</option>)}</select></Field><Field label="Request body" hint="Body sent to the simulator."><Textarea data-testid="input-request-body" rows={5} value={form.requestBody} onChange={e => set('requestBody', e.target.value)} placeholder={'{\n  "cartId": "cart_123"\n}'} /></Field><Field label="Headers" hint="JSON object"><Textarea data-testid="input-request-headers" rows={5} value={form.headers} onChange={e => set('headers', e.target.value)} /></Field><Field label="Query parameters" hint="JSON object"><Textarea data-testid="input-query-params" rows={5} value={form.queryParams} onChange={e => set('queryParams', e.target.value)} /></Field></div></Panel>
    <Panel><PanelTitle icon={Radar} title="Conditional matching" meta="only inject when matched" /><p className="px-5 pt-4 text-xs text-muted-foreground">Leave fields empty to match every request. Header and query rules use exact key/value matches.</p><div className="grid gap-5 p-5 md:grid-cols-2"><Field label="Match method"><select value={form.conditionMethod} onChange={e => set('conditionMethod', e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"><option value="">Any method</option>{methods.map(method => <option key={method}>{method}</option>)}</select></Field><Field label="Match path" hint="Exact path, for example /checkout"><Input value={form.conditionPath} onChange={e => set('conditionPath', e.target.value)} placeholder="/api/orders" /></Field><Field label="Match headers" hint="JSON object"><textarea value={form.conditionHeaders} onChange={e => set('conditionHeaders', e.target.value)} className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs" /></Field><Field label="Match query parameters" hint="JSON object"><textarea value={form.conditionQueryParams} onChange={e => set('conditionQueryParams', e.target.value)} className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs" /></Field><Field label="Body contains" hint="Optional substring"><Input value={form.conditionBodyContains} onChange={e => set('conditionBodyContains', e.target.value)} placeholder="payment_intent" /></Field></div></Panel><Panel><PanelTitle icon={ShieldAlert} title="Failure injection" meta="FAULTLINE → TARGET" /><p className="px-5 pt-4 text-xs text-muted-foreground">Choose what Faultline injects before or while forwarding to the upstream target.</p><div className="grid gap-5 p-5 md:grid-cols-2 lg:grid-cols-4"><Field label="Failure mode" className="lg:col-span-2"><select data-testid="select-failure-type" value={form.failureType} onChange={e => { const value = e.target.value; const status = value.startsWith('http_') ? value.slice(5) : ''; setForm(prev => ({ ...prev, failureType: value, statusCode: status })); }} className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary">{failureOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></Field><Field label="Probability" hint="0–100%"><div className="relative"><Input data-testid="input-probability" type="number" min="0" max="100" value={form.probability} onChange={e => set('probability', e.target.value)} /><span className="absolute right-3 top-2.5 font-mono text-xs text-muted-foreground">%</span></div></Field>{form.failureType.startsWith('http_') && <Field label="Status code" hint="selected automatically"><Input data-testid="input-status-code" type="number" value={form.statusCode} readOnly /></Field>}{form.failureType === 'latency' && <Field label="Added latency" hint="milliseconds"><Input data-testid="input-latency-ms" type="number" min="0" value={form.latencyMs} onChange={e => set('latencyMs', e.target.value)} /></Field>}{form.failureType === 'timeout' && <Field label="Timeout threshold" hint="milliseconds"><Input data-testid="input-timeout-ms" type="number" min="0" value={form.timeoutMs} onChange={e => set('timeoutMs', e.target.value)} /></Field>}{form.failureType === 'malformed_json' && <Field label="Injected response body" hint="Body returned when the failure is injected." className="md:col-span-2 lg:col-span-4"><Textarea data-testid="input-response-body" rows={6} value={form.responseBody} onChange={e => set('responseBody', e.target.value)} /></Field>}{form.failureType === 'duplicate_response' && <Field label="Duplicate-response configuration" hint="Response returned more than once." className="md:col-span-2 lg:col-span-4"><Textarea data-testid="input-response-body" rows={6} value={form.responseBody} onChange={e => set('responseBody', e.target.value)} /></Field>}{form.failureType === 'connection_failure' && <p className="md:col-span-2 lg:col-span-4 text-xs text-muted-foreground">This produces a network-level failure with no HTTP response.</p>}</div></Panel>
    <Panel><PanelTitle icon={GitBranch} title="Forwarding & lifecycle" meta="runtime behavior" /><div className="grid gap-5 p-5 md:grid-cols-2"><div className="space-y-5"><Toggle checked={form.forwardRequest} onChange={v => set('forwardRequest', v)} label="Forward request to target after decision" testId="toggle-forward-request" /><div className={!form.forwardRequest ? 'opacity-50' : ''}><Toggle checked={form.preserveHeaders} onChange={v => set('preserveHeaders', v)} label="Preserve upstream response headers" testId="toggle-preserve-headers" /><p className="ml-12 mt-1 text-[11px] text-muted-foreground">Copy upstream response headers to the simulator response where safe.</p></div><Toggle checked={form.enabled} onChange={v => set('enabled', v)} label="Scenario enabled" testId="toggle-simulation-enabled" /></div><Field label="Forward timeout" hint="milliseconds"><Input data-testid="input-forward-timeout" type="number" min="0" disabled={!form.forwardRequest} value={form.forwardTimeoutMs} onChange={e => set('forwardTimeoutMs', e.target.value)} /></Field></div></Panel>
    <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row sm:items-center"><Link href={id ? `/simulations/${id}` : '/simulations'} data-testid="link-cancel-form" className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3.5 py-2 text-xs font-semibold text-muted-foreground shadow-sm hover:bg-secondary hover:text-foreground"><ArrowLeft size={14} /> Cancel</Link><Button type="submit" disabled={isPending} data-testid="button-submit-simulation">{isPending ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}{isPending ? 'Saving…' : id ? 'Save changes' : 'Create simulation'}</Button></div>
  </form>
  </>;
}

function SimulationEditor({ edit = false }: { edit?: boolean }) {
  const params = useParams<{ id?: string }>();
  const [location] = useLocation();
  const duplicateValue = !edit ? new URLSearchParams(location.split('?')[1] ?? '').get('duplicate') : null;
  const duplicateId = duplicateValue ? Number(duplicateValue) : undefined;
  const id = params.id ? Number(params.id) : undefined;
  const sourceId = edit ? id : (duplicateId !== undefined && Number.isInteger(duplicateId) && duplicateId > 0 ? duplicateId : undefined);
  const { data, isLoading, isError, error, refetch } = useGetSimulation(sourceId ?? 0, { query: { enabled: Boolean(sourceId), queryKey: getGetSimulationQueryKey(sourceId ?? 0) } });
  if (sourceId && isLoading) return <LoadingBlocks />;
  if (sourceId && isError) return <QueryError message={errorText(error)} retry={() => refetch()} />;
  const duplicate = Boolean(!edit && sourceId && data);
  return <><PageHeading breadcrumbs={[{ label: 'Workspace' }, { label: 'Simulations', href: '/simulations' }, { label: edit ? 'Edit simulation' : duplicate ? 'Duplicate simulation' : 'New simulation' }]} title={edit ? 'Edit simulation' : duplicate ? 'Duplicate simulation' : 'New simulation'} description={edit ? 'Tune the decision logic without losing the execution history.' : duplicate ? 'Start with this configuration, then adjust the scenario before creating a new simulation.' : 'Define a deterministic request path, then decide exactly how it should fail.'} /><SimulationForm id={edit ? id : undefined} existing={duplicate && data ? { ...data, name: `${data.name} copy`, requestCount: 0, failedCount: 0, successCount: 0 } : edit ? data : undefined} /></>;
}

function Detail({ id }: { id: number }) {
  const { data, isLoading, isError, error, refetch } = useGetSimulation(id, { query: { queryKey: getGetSimulationQueryKey(id) } });
  const { data: recentExecutions = [] } = useListExecutions(id, { query: { queryKey: getListExecutionsQueryKey(id) } });
  const run = useRunSimulation();
  const update = useUpdateSimulation();
  const [, setLocation] = useLocation();
  const [copied, setCopied] = useState(false);
  if (isLoading) return <LoadingBlocks />;
  if (isError || !data) return <QueryError message={errorText(error)} retry={() => refetch()} />;
  const copy = () => { navigator.clipboard?.writeText(data.endpoint); setCopied(true); setTimeout(() => setCopied(false), 1600); };
  const toggle = () => update.mutate({ id, data: { enabled: !data.enabled } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetSimulationQueryKey(id) }) });
  return <><PageHeading breadcrumbs={[{ label: 'Workspace' }, { label: 'Simulations', href: '/simulations' }, { label: data.name }]} title={data.name} description={data.description ?? 'No description provided.'} actions={<><Button variant="secondary" onClick={() => setLocation(`/simulations/${id}/edit`)} data-testid="button-detail-edit"><Pencil size={14} /> Edit</Button><Button variant="secondary" onClick={() => setLocation(`/simulations/new?duplicate=${id}`)} data-testid="button-detail-duplicate"><Copy size={14} /> Duplicate</Button><Button onClick={() => run.mutate({ id, data: undefined }, { onSuccess: execution => setLocation(`/executions/${execution.id}`) })} disabled={run.isPending} data-testid="button-detail-run"><Play size={14} /> Run now</Button></>} />
    <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Stat label="Executions" value={formatNumber(data.requestCount)} detail="total runs" icon={Activity} /><Stat label="Injected" value={formatNumber(data.failedCount)} detail={`${pct(data.failedCount, data.requestCount)} failure rate`} tone="red" icon={ShieldAlert} /><Stat label="Pass-through" value={formatNumber(data.successCount)} detail="forwarded without injection" tone="teal" icon={Check} /><Stat label="Last executed" value={<span className="text-2xl">{formatDate(data.lastExecutedAt)}</span>} detail={`updated ${formatDate(data.updatedAt)}`} icon={Clock3} /></div>
     <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
       <div className="space-y-6"><Panel><PanelTitle icon={Zap} title="Generated simulator endpoint" meta="YOUR APPLICATION → FAULTLINE" /><div className="scanline code-surface p-5"><div className="mb-3 flex items-center justify-between"><span className="eyebrow text-teal-300/70">Incoming method · POST / controlled route</span><button onClick={copy} data-testid="button-copy-endpoint" className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-white">{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Copied' : 'Copy endpoint'}</button></div><code data-testid="text-generated-endpoint" className="block break-all font-mono text-sm leading-6 text-teal-300">{data.endpoint}</code></div><div className="flex items-center justify-between border-t border-border px-5 py-3"><span className="text-xs text-muted-foreground">Route availability</span><Toggle checked={data.enabled} onChange={toggle} label={data.enabled ? 'Enabled' : 'Paused'} testId="toggle-detail-enabled" /></div></Panel><Panel><PanelTitle icon={Globe2} title="Configuration" meta={`${data.method} request`} /><div className="grid gap-x-8 gap-y-5 p-5 sm:grid-cols-2"><ConfigValue label="Target URL" value={data.targetUrl} mono /><ConfigValue label="Upstream method" value={data.method} mono /><ConfigValue label="Failure mode" value={data.failureType.replaceAll('_', ' ')} />{String(data.failureType).startsWith('http_') && <ConfigValue label="Status code" value={data.statusCode ?? 'Inherited'} mono />}{data.failureType === 'latency' && <ConfigValue label="Added latency" value={`${data.latencyMs}ms`} mono />}{data.failureType === 'timeout' && <ConfigValue label="Timeout" value={`${data.timeoutMs}ms`} mono />}<ConfigValue label="Probability" value={`${data.probability}%`} mono /><ConfigValue label="Forwarding" value={data.forwardRequest ? `enabled / ${data.forwardTimeoutMs}ms` : 'disabled'} /></div></Panel></div>
      <Panel><PanelTitle icon={History} title="Recent executions" meta={`${recentExecutions.length} latest`} />{!recentExecutions.length ? <EmptyState icon={History} title="No runs recorded" description="Run this simulation to see the decision timeline." action={<Button onClick={() => run.mutate({ id, data: undefined })} data-testid="button-empty-run"><Play size={13} /> Run simulation</Button>} /> : <div className="divide-y divide-border">{recentExecutions.slice(0, 8).map((execution: any) => <ExecutionRow key={execution.id} execution={execution} compact />)}</div>}</Panel>
    </div>
  </>;
}

function SimulationDetail() {
  const params = useParams<{ id: string }>();
  return <Detail id={Number(params.id)} />;
}
function ConfigValue({ label, value, mono = false }: { label: string; value: ReactNode; mono?: boolean }) { return <div><div className="eyebrow text-muted-foreground">{label}</div><div className={`mt-1 truncate text-sm ${mono ? 'font-mono text-xs' : ''}`}>{value}</div></div>; }

function CodeBlock({ title, data, empty = '—' }: { title: string; data: unknown; empty?: string }) {
  const text = typeof data === 'string' ? data : JSON.stringify(data ?? {}, null, 2);
  return <div className="code-surface overflow-hidden rounded-lg border"><div className="flex items-center justify-between border-b border-slate-700 px-4 py-2.5"><span className="eyebrow text-slate-400">{title}</span><Copy size={13} className="text-slate-500" /></div><pre className="max-h-64 overflow-auto p-4 font-mono text-[11px] leading-5">{text || empty}</pre></div>;
}
function Inspector({ id }: { id: number }) {
  const { data, isLoading, isError, error, refetch } = useGetExecution(id, { query: { queryKey: getGetExecutionQueryKey(id) } });
  const [, setLocation] = useLocation();
  const [testGeneratorOpen, setTestGeneratorOpen] = useState(false);
  const { data: simulation } = useGetSimulation(data?.simulationId ?? 0, { query: { enabled: Boolean(data?.simulationId), queryKey: getGetSimulationQueryKey(data?.simulationId ?? 0) } });
  if (isLoading) return <LoadingBlocks />;
  if (isError || !data) return <QueryError message={errorText(error)} retry={() => refetch()} />;
  const success = data.status === 'success';
  return <><PageHeading breadcrumbs={[{ label: 'Workspace' }, { label: 'Simulations', href: '/simulations' }, { label: `Execution #${String(data.id).padStart(4, '0')}` }]} title={`Execution #${String(data.id).padStart(4, '0')}`} description="The complete request-to-decision trace for one simulator run." actions={<><Link href={`/executions/${id}/compare`} data-testid="link-compare-execution" className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3.5 py-2 text-xs font-semibold shadow-sm hover:bg-secondary"><GitCompare size={14} /> Compare</Link><Link href={`/executions/${id}/replay`} data-testid="link-replay-execution" className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3.5 py-2 text-xs font-semibold shadow-sm hover:bg-secondary"><History size={14} /> Replay</Link><Link href={`/simulations/${data.simulationId}`} data-testid="link-inspector-simulation" className="inline-flex items-center gap-2 rounded-md border border-transparent px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:border-border hover:bg-secondary hover:text-foreground"><ArrowLeft size={14} /> Simulation</Link></>} />
    <div className="mb-6 flex flex-wrap items-center gap-3"><Badge tone={success ? 'good' : data.status === 'timeout' ? 'warn' : 'bad'}>{data.status}</Badge><span className="mono-data text-xs text-muted-foreground">{data.method} {data.url}</span><span className="ml-auto mono-data text-xs text-muted-foreground">{data.actualLatencyMs}ms / {formatDate(data.createdAt)}</span></div>
    <div className="mb-6"><DeveloperActions execution={data} simulation={simulation} onCreateTest={() => { setTestGeneratorOpen(true); requestAnimationFrame(() => document.getElementById(`execution-${data.id}-test`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }} /></div>
    <div id={`execution-${data.id}-test`} className="mb-6"><RegressionTestGenerator execution={data} open={testGeneratorOpen} onOpenChange={setTestGeneratorOpen} /></div>
    <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]"><div className="space-y-6"><Panel><PanelTitle icon={ArrowRight} title="Request" meta="received by simulator" /><div className="space-y-4 p-5"><div className="flex items-center gap-3"><Badge>{data.method}</Badge><span className="break-all font-mono text-xs">{data.url}</span></div><div className="grid gap-4 sm:grid-cols-2"><CodeBlock title="Headers" data={data.requestHeaders} /><CodeBlock title="Query" data={data.requestQuery} /></div><CodeBlock title="Body" data={data.requestBody} /></div></Panel><Panel><PanelTitle icon={Server} title="Response" meta={data.simulatedStatus ? `HTTP ${data.simulatedStatus}` : 'forwarded'} /><div className="space-y-4 p-5"><div className="flex items-center gap-3"><span className={`mono-data text-2xl font-semibold ${success ? 'text-primary' : 'text-destructive'}`}>{data.simulatedStatus ?? '—'}</span><span className="text-xs text-muted-foreground">{data.failureType === 'none' ? 'pass-through response' : data.failureType.replaceAll('_', ' ')}</span></div><CodeBlock title="Response headers" data={data.responseHeaders} /><CodeBlock title="Response body" data={data.responseBody} /></div></Panel></div><Panel><PanelTitle icon={GitBranch} title="Decision timeline" meta={`${data.timeline?.length ?? 0} events`} /><div className="p-5">{data.timeline?.length ? <div className="relative space-y-0 before:absolute before:bottom-3 before:left-[7px] before:top-3 before:w-px before:bg-border">{data.timeline.map((event: any, index: number) => <div key={`${event.label}-${index}`} className="relative flex gap-4 py-3"><span className={`z-10 mt-1.5 size-2 shrink-0 rounded-full border-2 border-card ${event.tone === 'danger' ? 'bg-destructive' : event.tone === 'warning' ? 'bg-accent' : event.tone === 'success' ? 'bg-primary' : 'bg-muted-foreground'}`} /><div className="min-w-0"><p className="text-xs font-semibold">{event.label}</p><p className="mt-1 font-mono text-[10px] text-muted-foreground">{formatDate(event.timestamp)}</p></div></div>)}</div> : <EmptyState icon={GitBranch} title="No timeline events" description="The API returned an execution without timeline details." />}</div></Panel></div>
    <div className="mt-6 flex justify-end"><Button variant="secondary" onClick={() => setLocation(`/executions/${id}/replay`)} data-testid="button-inspector-replay"><History size={14} /> Open replay editor <ArrowRight size={14} /></Button></div>
  </>;
}
function ExecutionInspector() { const params = useParams<{ id: string }>(); return <Inspector id={Number(params.id)} />; }

function Replay() {
  const params = useParams<{ id: string }>();
  const executionId = Number(params.id);
  const { data: execution, isLoading, isError, error, refetch } = useGetExecution(executionId, { query: { queryKey: getGetExecutionQueryKey(executionId) } });
  const replay = useReplayExecution();
  const [, setLocation] = useLocation();
  const [failureType, setFailureType] = useState(''); const [statusCode, setStatusCode] = useState(''); const [latencyMs, setLatencyMs] = useState(''); const [responseBody, setResponseBody] = useState(''); const [seed, setSeed] = useState('');
  useEffect(() => { if (execution) { setFailureType(execution.failureType); setStatusCode(String(execution.simulatedStatus ?? '')); setLatencyMs(String(execution.actualLatencyMs ?? '')); setResponseBody(execution.responseBody ?? ''); } }, [execution]);
  if (isLoading) return <LoadingBlocks />;
  if (isError) return <QueryError message={errorText(error)} retry={() => refetch()} />;
  if (!execution) return <QueryError message="Execution not found." retry={() => refetch()} />;
  const submit = (event: React.FormEvent) => { event.preventDefault(); const data = { failureType: failureType || undefined, statusCode: statusCode ? Number(statusCode) : undefined, latencyMs: latencyMs ? Number(latencyMs) : undefined, responseBody, seed: seed ? Number(seed) : undefined } as any; replay.mutate({ id: executionId, data }, { onSuccess: next => setLocation(`/executions/${next.id}`) }); };
  return <><PageHeading breadcrumbs={[{ label: 'Workspace' }, { label: 'Simulations', href: '/simulations' }, { label: 'Executions', href: `/executions/${execution.id}` }, { label: 'Replay' }]} title="Replay editor" description="Re-run this request with a controlled override. The source execution remains immutable." actions={<Link href={`/executions/${execution.id}`} data-testid="link-replay-source" className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3.5 py-2 text-xs font-semibold text-muted-foreground shadow-sm hover:bg-secondary hover:text-foreground"><ArrowLeft size={14} /> Source execution</Link>} /><form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1fr_330px]"><Panel><PanelTitle icon={RefreshCw} title="Override decision" meta="optional fields replace scenario defaults" /><div className="grid gap-5 p-5 sm:grid-cols-2"><Field label="Failure mode"><select data-testid="select-replay-failure-type" value={failureType} onChange={e => setFailureType(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"><option value="">Use scenario default</option>{failureOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></Field><Field label="Status code"><Input data-testid="input-replay-status-code" value={statusCode} onChange={e => setStatusCode(e.target.value)} type="number" placeholder="Scenario default" /></Field><Field label="Latency" hint="milliseconds"><Input data-testid="input-replay-latency" value={latencyMs} onChange={e => setLatencyMs(e.target.value)} type="number" placeholder="Scenario default" /></Field><Field label="Custom seed" hint="blank uses simulation ID"><Input data-testid="input-replay-seed" value={seed} onChange={e => setSeed(e.target.value)} type="number" placeholder="Simulation default" /></Field><div className="sm:col-span-2"><Field label="Response body" hint="blank uses scenario default"><Textarea data-testid="input-replay-response-body" rows={12} value={responseBody} onChange={e => setResponseBody(e.target.value)} /></Field></div></div></Panel><div className="space-y-6"><Panel><PanelTitle icon={Globe2} title="Request snapshot" /><div className="space-y-4 p-5"><ConfigValue label="Method" value={execution.method} mono /><ConfigValue label="URL" value={execution.url} mono /><ConfigValue label="Source" value={`Execution #${execution.id}`} /></div></Panel><div className="rounded-xl border border-accent/35 bg-accent/10 p-5"><div className="flex items-center gap-2 text-xs font-semibold text-accent-foreground"><AlertTriangle size={14} /> Replay is a new execution</div><p className="mt-2 text-xs leading-5 text-accent-foreground/75">Overrides are applied only to this run. The configured simulation is not changed.</p><Button type="submit" disabled={replay.isPending} data-testid="button-run-replay" className="mt-5 w-full">{replay.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />} Run replay</Button></div></div></form></>;
}

function Recovery() {
  const { data: simulationData } = useListSimulations({ query: { queryKey: getListSimulationsQueryKey() } });
  const simulations = Array.isArray(simulationData) ? simulationData : [];
  const [simulationId, setSimulationId] = useState('');
  const [seed, setSeed] = useState('');
  const [steps, setSteps] = useState([{ failureType: 'http_503', attempts: '1', latencyMs: '0' }]);
  const [result, setResult] = useState<any>(null);
  const workflow = useCreateRecoveryWorkflow();
  const addStep = () => setSteps(current => [...current, { failureType: 'none', attempts: '1', latencyMs: '0' }]);
  const updateStep = (index: number, key: keyof typeof steps[number], value: string) => setSteps(current => current.map((step, stepIndex) => stepIndex === index ? { ...step, [key]: value } : step));
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (!simulationId) return; workflow.mutate({ id: Number(simulationId), data: { seed: seed ? Number(seed) : undefined, workflow: steps.map(step => ({ failureType: step.failureType as any, attempts: Number(step.attempts) || 1, latencyMs: Number(step.latencyMs) || 0 })) } }, { onSuccess: setResult }); };
  return <><PageHeading breadcrumbs={[{ label: 'Workspace' }, { label: 'Recovery' }]} title="Recovery workflows" description="Define sequential failure and recovery attempts, then inspect every execution produced by the workflow." /><form onSubmit={submit} className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"><Panel className="overflow-hidden"><PanelTitle icon={GitBranch} title="Workflow steps" meta="ordered execution" /><div className="space-y-5 p-5 md:p-6"><Field label="Simulation"><select data-testid="select-recovery-simulation" value={simulationId} onChange={e => setSimulationId(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm"><option value="">Choose a simulation</option>{simulations.map((simulation: any) => <option key={simulation.id} value={simulation.id}>{simulation.name}</option>)}</select></Field>{steps.map((step, index) => <div key={index} className="group rounded-xl border border-border bg-background p-4 shadow-sm transition-colors hover:border-primary/30 md:p-5"><div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2.5"><span className="flex size-6 items-center justify-center rounded-full bg-primary/10 font-mono text-[10px] font-semibold text-primary">{index + 1}</span><span className="eyebrow text-muted-foreground">Attempt group {index + 1}</span></div>{steps.length > 1 && <button type="button" className="text-xs text-muted-foreground hover:text-destructive" onClick={() => setSteps(current => current.filter((_, stepIndex) => stepIndex !== index))}>Remove</button>}</div><div className="grid gap-3 sm:grid-cols-3"><Field label="Failure mode"><select value={step.failureType} onChange={e => updateStep(index, 'failureType', e.target.value)} className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-xs">{failureOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></Field><Field label="Attempts"><Input type="number" min="1" max="100" value={step.attempts} onChange={e => updateStep(index, 'attempts', e.target.value)} /></Field><Field label="Latency (ms)"><Input type="number" min="0" value={step.latencyMs} onChange={e => updateStep(index, 'latencyMs', e.target.value)} /></Field></div></div>)}<Button type="button" variant="secondary" onClick={addStep} className="w-full border-dashed sm:w-auto"><Plus size={14} /> Add step</Button></div></Panel><div className="space-y-6"><Panel><PanelTitle icon={SlidersHorizontal} title="Determinism" meta="optional" /><div className="p-5"><Field label="Custom seed" hint="blank uses simulation ID"><Input type="number" value={seed} onChange={e => setSeed(e.target.value)} placeholder="Default: simulation ID" /></Field><Button type="submit" disabled={!simulationId || workflow.isPending} className="mt-5 w-full">{workflow.isPending ? 'Running…' : 'Run recovery workflow'} <Play size={14} /></Button></div></Panel>{result && <Panel><PanelTitle icon={History} title="Attempt history" meta={`${result.executions?.length ?? 0} executions`} /><div className="divide-y divide-border">{result.executions?.map((execution: any) => <ExecutionRow key={execution.id} execution={execution} compact />)}</div><div className="border-t border-border p-4"><Badge tone={result.recovered ? 'good' : 'bad'}>{result.recovered ? 'recovered' : 'not recovered'}</Badge></div></Panel>}</div></form></>;
}

function Compare({ id }: { id: number }) {
  const { data: source } = useGetExecution(id, { query: { queryKey: getGetExecutionQueryKey(id) } });
  const { data: executions = [] } = useListExecutions(source?.simulationId ?? 0, { query: { enabled: Boolean(source?.simulationId), queryKey: getListExecutionsQueryKey(source?.simulationId ?? 0) } });
  const compare = useCompareExecutions();
  const [otherId, setOtherId] = useState('');
  const [result, setResult] = useState<any>(null);
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (otherId) compare.mutate({ id, data: { replayExecutionId: Number(otherId) } }, { onSuccess: setResult }); };
  return <><PageHeading breadcrumbs={[{ label: 'Workspace' }, { label: 'Execution comparison' }]} title="Compare executions" description="Inspect status, latency, failure type, response, and timeline changes between two runs." /><Panel><PanelTitle icon={GitCompare} title="Select executions" meta={`source #${id}`} /><form onSubmit={submit} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end"><Field label="Compare with" className="flex-1"><select value={otherId} onChange={e => setOtherId(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm"><option value="">Choose an execution</option>{executions.filter((execution: any) => execution.id !== id).map((execution: any) => <option key={execution.id} value={execution.id}>#{execution.id} · {execution.status} · {execution.actualLatencyMs}ms</option>)}</select></Field><Button type="submit" disabled={!otherId || compare.isPending}>{compare.isPending ? 'Comparing…' : 'Compare runs'} <GitCompare size={14} /></Button></form></Panel>{result && <div className="mt-6 grid gap-6 lg:grid-cols-2"><Panel><PanelTitle icon={GitCompare} title="Difference summary" meta="original → selected" /><div className="grid gap-3 p-5 sm:grid-cols-2">{[['Status', result.differences.status ? 'Changed' : 'Same'], ['Latency', `${result.original.actualLatencyMs}ms → ${result.replay.actualLatencyMs}ms (${result.differences.latencyMs >= 0 ? '+' : ''}${result.differences.latencyMs}ms)`], ['Failure type', result.differences.failureType ? 'Changed' : 'Same'], ['Response', result.differences.response ? 'Changed' : 'Same'], ['Timeline', result.differences.timeline ? 'Changed' : 'Same']].map(([label, value]) => <div key={label} className="rounded-lg border border-border p-3"><div className="eyebrow text-muted-foreground">{label}</div><div className="mt-1 text-sm font-semibold">{value}</div></div>)}</div></Panel><Panel><PanelTitle icon={History} title="Execution details" /><div className="grid gap-4 p-5 sm:grid-cols-2"><div><div className="eyebrow text-muted-foreground">Original</div><div className="mt-2 text-sm">#{result.original.id} · {result.original.status}</div><CodeBlock title="Response" data={result.original.responseBody} /></div><div><div className="eyebrow text-muted-foreground">Selected</div><div className="mt-2 text-sm">#{result.replay.id} · {result.replay.status}</div><CodeBlock title="Response" data={result.replay.responseBody} /></div></div></Panel></div>}</>;
}

function Router() {
  return <RoutedErrorBoundary><Shell><Switch>
    <Route path="/" component={Dashboard} />
    <Route path="/simulations/new" component={() => <SimulationEditor />} />
    <Route path="/simulations/:id/edit" component={() => <SimulationEditor edit />} />
    <Route path="/simulations/:id" component={SimulationDetail} />
    <Route path="/simulations" component={Simulations} />
    <Route path="/recovery" component={Recovery} />
    <Route path="/settings" component={SettingsPage} />
    <Route path="/executions/:id/compare" component={() => { const params = useParams<{ id: string }>(); return <Compare id={Number(params.id)} />; }} />
    <Route path="/executions/:id/replay" component={Replay} />
    <Route path="/executions/:id" component={ExecutionInspector} />
    <Route component={NotFound} />
  </Switch></Shell></RoutedErrorBoundary>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
<QueryClientProvider client={queryClient}>
  <AuthGate>
  <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
  </TooltipProvider>
  </AuthGate>
  </QueryClientProvider>
  );
}

export default App;
