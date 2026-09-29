import { useState } from 'react';
import {
  FlaskConical, Microscope, FileText, Users, Wallet, Calendar,
  Settings, Search, Bell, ChevronDown, ArrowUpRight, ArrowDownRight,
  Dna, CircleDot, Clock, MoreHorizontal, Download, Plus, Beaker,
  GraduationCap, BookOpen, Activity, Cpu, Thermometer, AlertTriangle,
  CheckCircle2, ExternalLink
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { motion } from 'framer-motion';

const fundingData = [
  { month: 'Sep', spent: 41.2, allocated: 62 },
  { month: 'Oct', spent: 48.7, allocated: 62 },
  { month: 'Nov', spent: 55.1, allocated: 62 },
  { month: 'Dec', spent: 38.4, allocated: 62 },
  { month: 'Jan', spent: 67.9, allocated: 74 },
  { month: 'Feb', spent: 71.3, allocated: 74 },
  { month: 'Mar', spent: 58.6, allocated: 74 },
  { month: 'Apr', spent: 64.2, allocated: 74 },
];

const citationData = [
  { year: '2019', count: 312 },
  { year: '2020', count: 487 },
  { year: '2021', count: 651 },
  { year: '2022', count: 894 },
  { year: '2023', count: 1240 },
  { year: '2024', count: 1612 },
  { year: '2025', count: 1108 },
];

const projects = [
  {
    id: 'PRJ-0142',
    title: 'CRISPR-mediated repair pathways in cortical organoids',
    pi: 'Dr. A. Okonkwo',
    funding: 'NIH R01 — $1.2M',
    progress: 72,
    status: 'On track',
    statusColor: '#1d6b4f',
    deadline: 'Jun 14, 2025',
    members: ['AO', 'MK', 'JL', 'SR'],
  },
  {
    id: 'PRJ-0138',
    title: 'Single-cell transcriptomics of glial senescence',
    pi: 'Dr. M. Kessler',
    funding: 'NSF CAREER — $640K',
    progress: 41,
    status: 'On track',
    statusColor: '#1d6b4f',
    deadline: 'Nov 02, 2025',
    members: ['MK', 'TP', 'YH'],
  },
  {
    id: 'PRJ-0151',
    title: 'Machine learning for protein folding kinetics',
    pi: 'Dr. R. Vasquez',
    funding: 'DOE Early Career — $890K',
    progress: 23,
    status: 'At risk',
    statusColor: '#9a3412',
    deadline: 'Mar 30, 2026',
    members: ['RV', 'JL', 'NC', 'KW', 'BD'],
  },
  {
    id: 'PRJ-0129',
    title: 'Optogenetic control of hippocampal circuits',
    pi: 'Dr. A. Okonkwo',
    funding: 'HHMI Investigator',
    progress: 88,
    status: 'Final review',
    statusColor: '#7c5e10',
    deadline: 'May 09, 2025',
    members: ['AO', 'SR', 'YH'],
  },
];

const publications = [
  {
    title: 'Temporal dynamics of microglial activation following targeted demyelination',
    journal: 'Nature Neuroscience',
    status: 'Accepted',
    date: 'Apr 18',
    authors: 'Okonkwo A., Kessler M., et al.',
  },
  {
    title: 'A transformer architecture for predicting enhancer–promoter interactions',
    journal: 'Cell Systems',
    status: 'In review',
    date: 'Apr 02',
    authors: 'Vasquez R., Liu J., Chen N.',
  },
  {
    title: 'Senescence-associated secretory phenotypes in aged astrocytes',
    journal: 'eLife',
    status: 'Revision',
    date: 'Mar 27',
    authors: 'Kessler M., Park T., Huang Y.',
  },
  {
    title: 'Closed-loop optogenetic stimulation suppresses seizure propagation',
    journal: 'Neuron',
    status: 'Preprint',
    date: 'Mar 11',
    authors: 'Reyes S., Okonkwo A.',
  },
];

const equipment = [
  { name: 'Zeiss LSM 980 Confocal', status: 'In use', user: 'S. Reyes', until: '14:30', icon: Microscope, ok: true },
  { name: 'Illumina NovaSeq X', status: 'Available', user: null, until: null, icon: Dna, ok: true },
  { name: 'Cryostat Leica CM3050', status: 'Maintenance', user: 'Service due', until: 'Apr 29', icon: Thermometer, ok: false },
  { name: 'HPC Cluster — node 04', status: 'In use', user: 'J. Liu (84% load)', until: '~6h', icon: Cpu, ok: true },
];

const team = [
  { name: 'Dr. Adaeze Okonkwo', role: 'Principal Investigator', initials: 'AO', color: '#1d6b4f', presence: 'In lab' },
  { name: 'Dr. Marta Kessler', role: 'Co-Investigator', initials: 'MK', color: '#7c2d12', presence: 'In lab' },
  { name: 'Jun Liu', role: 'PhD Candidate, Y4', initials: 'JL', color: '#1e3a8a', presence: 'Remote' },
  { name: 'Sofia Reyes', role: 'Postdoctoral Fellow', initials: 'SR', color: '#713f12', presence: 'In lab' },
  { name: 'Tomas Park', role: 'Lab Manager', initials: 'TP', color: '#4c1d95', presence: 'In lab' },
  { name: 'Yuki Huang', role: 'PhD Candidate, Y2', initials: 'YH', color: '#9a3412', presence: 'Field work' },
];

const navItems = [
  { icon: Activity, label: 'Overview', active: true },
  { icon: FlaskConical, label: 'Projects' },
  { icon: FileText, label: 'Publications' },
  { icon: Wallet, label: 'Grants & Funding' },
  { icon: Users, label: 'Lab Members' },
  { icon: Beaker, label: 'Protocols' },
  { icon: Calendar, label: 'Equipment Booking' },
  { icon: GraduationCap, label: 'Teaching' },
];

const pubStatusStyles = {
  Accepted: 'bg-[#e7f0ea] text-[#1d6b4f] border-[#c7ddd0]',
  'In review': 'bg-[#fdf3e3] text-[#92600a] border-[#f0dcb4]',
  Revision: 'bg-[#fbeae5] text-[#9a3412] border-[#f2cfc2]',
  Preprint: 'bg-[#e9ecf6] text-[#3447a0] border-[#cdd5ec]',
};

function StatCard({ label, value, sub, delta, deltaUp, icon: Icon, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      className="bg-white border border-[#e3ddd2] rounded-md p-5 relative overflow-hidden group hover:border-[#c9c0ae] transition-colors"
    >
      <div className="flex items-start justify-between">
        <p className="text-[11px] tracking-[0.14em] uppercase text-[#8a8273] font-medium">{label}</p>
        <Icon size={16} className="text-[#b3a98f]" strokeWidth={1.75} />
      </div>
      <p className="mt-3 font-serif text-[34px] leading-none text-[#1d1a14]">{value}</p>
      <div className="mt-3 flex items-center gap-2">
        <span className={`inline-flex items-center gap-0.5 text-[12px] font-medium ${deltaUp ? 'text-[#1d6b4f]' : 'text-[#9a3412]'}`}>
          {deltaUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
          {delta}
        </span>
        <span className="text-[12px] text-[#8a8273]">{sub}</span>
      </div>
    </motion.div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-[#1d1a14] text-[#f4f0e6] px-3 py-2 rounded text-[12px] shadow-lg">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-mono text-[11px]" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
          {p.dataKey === 'spent' || p.dataKey === 'allocated' ? 'K' : ''}
        </p>
      ))}
    </div>
  );
}

export default function App() {
  const [chartTab, setChartTab] = useState('funding');
  const [projectFilter, setProjectFilter] = useState('All');

  const filteredProjects = projectFilter === 'All'
    ? projects
    : projects.filter(p => p.status === projectFilter);

  return (
    <div className="min-h-screen bg-[#f4f0e6] text-[#1d1a14]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />
      <style dangerouslySetInnerHTML={{ __html: `
        .font-serif { font-family: 'Fraunces', Georgia, serif; }
        .font-mono { font-family: 'IBM Plex Mono', monospace; }
        ::-webkit-scrollbar { width: 10px; height: 10px; }
        ::-webkit-scrollbar-track { background: #f4f0e6; }
        ::-webkit-scrollbar-thumb { background: #d6cfc0; border-radius: 6px; border: 2px solid #f4f0e6; }
        ::-webkit-scrollbar-thumb:hover { background: #bfb59f; }
        .progress-track { background: repeating-linear-gradient(90deg, #ece6d8 0px, #ece6d8 3px, #e3ddd2 3px, #e3ddd2 4px); }
        .paper-grain { background-image: radial-gradient(#00000008 1px, transparent 1px); background-size: 22px 22px; }
      `}} />

      <div className="flex">
        {/* ============ SIDEBAR ============ */}
        <aside className="w-[248px] shrink-0 h-screen sticky top-0 bg-[#1d1a14] text-[#cfc8b8] flex flex-col">
          <div className="px-6 pt-7 pb-6 border-b border-[#37322a]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-sm bg-[#1d6b4f] flex items-center justify-center">
                <Dna size={18} className="text-[#e9f2ec]" strokeWidth={2} />
              </div>
              <div>
                <p className="font-serif text-[17px] text-[#f4f0e6] leading-tight">Okonkwo Lab</p>
                <p className="text-[10.5px] tracking-[0.12em] uppercase text-[#857d6b] mt-0.5">Neurogenomics · MIT</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
            <p className="px-3 pb-2 text-[10px] tracking-[0.18em] uppercase text-[#6e6755]">Workspace</p>
            {navItems.map((item) => (
              <button
                key={item.label}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-sm text-[13.5px] transition-colors ${
                  item.active
                    ? 'bg-[#2c2820] text-[#f4f0e6] border-l-2 border-[#3d9970]'
                    : 'hover:bg-[#262219] hover:text-[#e8e2d4] border-l-2 border-transparent'
                }`}
              >
                <item.icon size={16} strokeWidth={1.75} />
                {item.label}
                {item.label === 'Publications' && (
                  <span className="ml-auto text-[10px] font-mono bg-[#37322a] text-[#bfb59f] px-1.5 py-0.5 rounded-sm">4</span>
                )}
              </button>
            ))}
            <div className="pt-6">
              <p className="px-3 pb-2 text-[10px] tracking-[0.18em] uppercase text-[#6e6755]">Administration</p>
              {[{ icon: BookOpen, label: 'IRB & Compliance' }, { icon: Settings, label: 'Lab Settings' }].map(item => (
                <button key={item.label} className="w-full flex items-center gap-3 px-3 py-2 rounded-sm text-[13.5px] hover:bg-[#262219] hover:text-[#e8e2d4] transition-colors border-l-2 border-transparent">
                  <item.icon size={16} strokeWidth={1.75} />
                  {item.label}
                </button>
              ))}
            </div>
          </nav>

          <div className="p-4 border-t border-[#37322a]">
            <div className="flex items-center gap-3 px-2 py-2 rounded-sm hover:bg-[#262219] cursor-pointer transition-colors">
              <div className="w-8 h-8 rounded-full bg-[#1d6b4f] flex items-center justify-center text-[12px] font-semibold text-[#e9f2ec]">AO</div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-[#f4f0e6] truncate">Dr. A. Okonkwo</p>
                <p className="text-[11px] text-[#857d6b]">Principal Investigator</p>
              </div>
              <ChevronDown size={14} className="text-[#857d6b]" />
            </div>
          </div>
        </aside>

        {/* ============ MAIN ============ */}
        <main className="flex-1 min-w-0 paper-grain">
          {/* Top bar */}
          <header className="sticky top-0 z-20 bg-[#f4f0e6]/90 backdrop-blur border-b border-[#e3ddd2] px-8 h-[64px] flex items-center justify-between">
            <div className="flex items-center gap-3 text-[13px] text-[#8a8273]">
              <span>Spring Term 2025</span>
              <span className="text-[#d6cfc0]">/</span>
              <span className="text-[#1d1a14] font-medium">Lab Overview</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a39a85]" />
                <input
                  placeholder="Search protocols, samples, papers…"
                  className="w-[280px] bg-white border border-[#e3ddd2] rounded-sm pl-9 pr-3 py-2 text-[13px] placeholder:text-[#a39a85] focus:outline-none focus:border-[#1d6b4f] transition-colors"
                />
              </div>
              <button className="relative w-9 h-9 bg-white border border-[#e3ddd2] rounded-sm flex items-center justify-center hover:border-[#c9c0ae] transition-colors">
                <Bell size={15} className="text-[#5c5546]" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#9a3412] text-white text-[9px] font-semibold rounded-full flex items-center justify-center">3</span>
              </button>
              <button className="flex items-center gap-2 bg-[#1d1a14] text-[#f4f0e6] px-4 py-2 rounded-sm text-[13px] font-medium hover:bg-[#37322a] transition-colors">
                <Plus size={15} /> New Experiment
              </button>
            </div>
          </header>

          <div className="px-8 py-7 max-w-[1400px]">
            {/* Page heading */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex items-end justify-between mb-7"
            >
              <div>
                <h1 className="font-serif text-[34px] leading-tight">Good morning, Adaeze</h1>
                <p className="text-[14px] text-[#8a8273] mt-1.5">
                  Tuesday, April 22 · 4 active grants · Sequencing run on NovaSeq completes in <span className="font-mono text-[#1d6b4f]">3h 12m</span>
                </p>
              </div>
              <button className="flex items-center gap-2 text-[13px] text-[#5c5546] border border-[#d6cfc0] bg-white px-3.5 py-2 rounded-sm hover:border-[#a39a85] transition-colors">
                <Download size={14} /> Export quarterly report
              </button>
            </motion.div>

            {/* Stat cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <StatCard label="Active Funding" value="$3.84M" sub="across 4 grants" delta="+$640K" deltaUp icon={Wallet} delay={0.05} />
              <StatCard label="Citations YTD" value="1,108" sub="h-index 47" delta="+18.4%" deltaUp icon={BookOpen} delay={0.12} />
              <StatCard label="Publications" value="14" sub="this academic year" delta="+3" deltaUp icon={FileText} delay={0.19} />
              <StatCard label="Burn Rate" value="$64.2K" sub="of $74K monthly" delta="86.7%" deltaUp={false} icon={Activity} delay={0.26} />
            </div>

            {/* Charts + equipment row */}
            <div className="grid grid-cols-12 gap-4 mb-6">
              {/* Chart card */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.3 }}
                className="col-span-8 bg-white border border-[#e3ddd2] rounded-md p-6"
              >
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <h2 className="font-serif text-[20px]">{chartTab === 'funding' ? 'Grant expenditure' : 'Citation trajectory'}</h2>
                    <p className="text-[12.5px] text-[#8a8273] mt-0.5">
                      {chartTab === 'funding' ? 'Monthly spend vs. allocation, FY 2024–25 (USD thousands)' : 'Annual citations across all lab publications, Google Scholar'}
                    </p>
                  </div>
                  <div className="flex bg-[#f4f0e6] border border-[#e3ddd2] rounded-sm p-0.5">
                    {['funding', 'citations'].map(tab => (
                      <button
                        key={tab}
                        onClick={() => setChartTab(tab)}
                        className={`px-3.5 py-1.5 text-[12px] font-medium rounded-sm capitalize transition-colors ${
                          chartTab === tab ? 'bg-[#1d1a14] text-[#f4f0e6]' : 'text-[#8a8273] hover:text-[#1d1a14]'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-[260px] mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartTab === 'funding' ? (
                      <AreaChart data={fundingData} margin={{ top: 10, right: 4, left: -18, bottom: 0 }}>
                        <defs>
                          <linearGradient id="spentGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#1d6b4f" stopOpacity={0.28} />
                            <stop offset="100%" stopColor="#1d6b4f" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="2 4" stroke="#ece6d8" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 11.5, fill: '#8a8273', fontFamily: 'IBM Plex Mono' }} axisLine={{ stroke: '#e3ddd2' }} tickLine={false} />
                        <YAxis tick={{ fontSize: 11.5, fill: '#8a8273', fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="allocated" name="Allocated" stroke="#c9c0ae" strokeWidth={1.5} strokeDasharray="5 4" fill="none" />
                        <Area type="monotone" dataKey="spent" name="Spent" stroke="#1d6b4f" strokeWidth={2.25} fill="url(#spentGrad)" />
                      </AreaChart>
                    ) : (
                      <BarChart data={citationData} margin={{ top: 10, right: 4, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="2 4" stroke="#ece6d8" vertical={false} />
                        <XAxis dataKey="year" tick={{ fontSize: 11.5, fill: '#8a8273', fontFamily: 'IBM Plex Mono' }} axisLine={{ stroke: '#e3ddd2' }} tickLine={false} />
                        <YAxis tick={{ fontSize: 11.5, fill: '#8a8273', fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f4f0e6' }} />
                        <Bar dataKey="count" name="Citations" radius={[2, 2, 0, 0]}>
                          {citationData.map((d, i) => (
                            <Cell key={i} fill={i === citationData.length - 1 ? '#bfb59f' : '#1d6b4f'} />
                          ))}
                        </Bar>
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>

                <div className="flex items-center gap-6 mt-3 pt-4 border-t border-[#ece6d8]">
                  {chartTab === 'funding' ? (
                    <>
                      <div className="flex items-center gap-2 text-[12px] text-[#5c5546]"><span className="w-3 h-[3px] bg-[#1d6b4f] rounded-full" /> Actual spend</div>
                      <div className="flex items-center gap-2 text-[12px] text-[#5c5546]"><span className="w-3 border-t border-dashed border-[#a39a85]" /> Monthly allocation</div>
                      <span className="ml-auto font-mono text-[12px] text-[#8a8273]">YTD utilization: <span className="text-[#1d6b4f] font-medium">81.2%</span></span>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-[12px] text-[#5c5546]"><span className="w-3 h-3 bg-[#1d6b4f] rounded-[2px]" /> Full year</div>
                      <div className="flex items-center gap-2 text-[12px] text-[#5c5546]"><span className="w-3 h-3 bg-[#bfb59f] rounded-[2px]" /> 2025 (partial)</div>
                      <span className="ml-auto font-mono text-[12px] text-[#8a8273]">i10-index: <span className="text-[#1d6b4f] font-medium">112</span></span>
                    </>
                  )}
                </div>
              </motion.div>

              {/* Equipment */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.38 }}
                className="col-span-4 bg-white border border-[#e3ddd2] rounded-md p-6 flex flex-col"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-serif text-[20px]">Instruments</h2>
                  <button className="text-[12px] text-[#1d6b4f] font-medium hover:underline flex items-center gap-1">
                    Booking calendar <ExternalLink size={11} />
                  </button>
                </div>
                <div className="space-y-3 flex-1">
                  {equipment.map((eq) => (
                    <div key={eq.name} className="flex items-start gap-3 p-3 rounded-sm border border-[#ece6d8] hover:border-[#d6cfc0] transition-colors">
                      <div className={`w-8 h-8 rounded-sm flex items-center justify-center shrink-0 ${eq.ok ? 'bg-[#e7f0ea]' : 'bg-[#fbeae5]'}`}>
                        <eq.icon size={15} className={eq.ok ? 'text-[#1d6b4f]' : 'text-[#9a3412]'} strokeWidth={1.75} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium leading-tight truncate">{eq.name}</p>
                        <p className="text-[11.5px] text-[#8a8273] mt-0.5">
                          {eq.user || 'Open for booking'}{eq.until ? ` · until ${eq.until}` : ''}
                        </p>
                      </div>
                      <span className={`text-[10.5px] font-medium px-2 py-1 rounded-sm border ${
                        eq.status === 'Available' ? 'bg-[#e7f0ea] text-[#1d6b4f] border-[#c7ddd0]'
                        : eq.status === 'In use' ? 'bg-[#f4f0e6] text-[#5c5546] border-[#e3ddd2]'
                        : 'bg-[#fbeae5] text-[#9a3412] border-[#f2cfc2]'
                      }`}>{eq.status}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-start gap-2.5 bg-[#fdf3e3] border border-[#f0dcb4] rounded-sm p-3">
                  <AlertTriangle size={14} className="text-[#92600a] mt-0.5 shrink-0" />
                  <p className="text-[12px] text-[#7c5e10] leading-snug">
                    LN₂ tank in cold room B refills Thursday — consolidate sample retrieval before <span className="font-mono">09:00</span>.
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Projects + right column */}
            <div className="grid grid-cols-12 gap-4">
              {/* Projects */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.45 }}
                className="col-span-8 bg-white border border-[#e3ddd2] rounded-md"
              >
                <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-[#ece6d8]">
                  <div>
                    <h2 className="font-serif text-[20px]">Active research projects</h2>
                    <p className="text-[12.5px] text-[#8a8273] mt-0.5">{filteredProjects.length} of {projects.length} projects shown</p>
                  </div>
                  <div className="flex gap-1.5">
                    {['All', 'On track', 'At risk'].map(f => (
                      <button
                        key={f}
                        onClick={() => setProjectFilter(f)}
                        className={`px-3 py-1.5 text-[12px] rounded-sm border transition-colors ${
                          projectFilter === f
                            ? 'bg-[#1d1a14] text-[#f4f0e6] border-[#1d1a14]'
                            : 'bg-white text-[#5c5546] border-[#e3ddd2] hover:border-[#c9c0ae]'
                        }`}
                      >{f}</button>
                    ))}
                  </div>
                </div>

                <div className="divide-y divide-[#ece6d8]">
                  {filteredProjects.map((p) => (
                    <div key={p.id} className="px-6 py-4 hover:bg-[#faf7f0] transition-colors group cursor-pointer">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-[11px] text-[#a39a85]">{p.id}</span>
                            <span className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: p.statusColor }}>
                              <CircleDot size={10} /> {p.status}
                            </span>
                          </div>
                          <p className="text-[14.5px] font-medium mt-1 leading-snug group-hover:text-[#1d6b4f] transition-colors">{p.title}</p>
                          <p className="text-[12px] text-[#8a8273] mt-1">
                            {p.pi} · {p.funding} · <Clock size={11} className="inline -mt-0.5" /> Due {p.deadline}
                          </p>
                        </div>
                        <div className="flex items-center gap-5 shrink-0">
                          <div className="flex -space-x-2">
                            {p.members.slice(0, 4).map((m, i) => (
                              <div key={i} className="w-7 h-7 rounded-full bg-[#e3ddd2] border-2 border-white flex items-center justify-center text-[10px] font-semibold text-[#5c5546]">{m}</div>
                            ))}
                            {p.members.length > 4 && (
                              <div className="w-7 h-7 rounded-full bg-[#1d1a14] border-2 border-white flex items-center justify-center text-[10px] font-semibold text-[#f4f0e6]">+{p.members.length - 4}</div>
                            )}
                          </div>
                          <div className="w-[140px]">
                            <div className="flex justify-between text-[11px] mb-1.5">
                              <span className="text-[#8a8273]">Progress</span>
                              <span className="font-mono font-medium">{p.progress}%</span>
                            </div>
                            <div className="h-[5px] progress-track rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${p.progress}%` }}
                                transition={{ duration: 0.9, delay: 0.6, ease: 'easeOut' }}
                                className="h-full rounded-full"
                                style={{ background: p.statusColor }}
                              />
                            </div>
                          </div>
                          <button className="w-7 h-7 rounded-sm flex items-center justify-center text-[#a39a85] hover:bg-[#ece6d8] hover:text-[#1d1a14] transition-colors">
                            <MoreHorizontal size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Right column: publications + team */}
              <div className="col-span-4 space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.52 }}
                  className="bg-white border border-[#e3ddd2] rounded-md p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-serif text-[20px]">Manuscript pipeline</h2>
                    <button className="text-[12px] text-[#1d6b4f] font-medium hover:underline">View all</button>
                  </div>
                  <div className="space-y-4">
                    {publications.map((pub, i) => (
                      <div key={i} className="flex gap-3 group cursor-pointer">
                        <div className="flex flex-col items-center pt-1">
                          <div className={`w-2 h-2 rounded-full ${pub.status === 'Accepted' ? 'bg-[#1d6b4f]' : 'bg-[#c9c0ae]'}`} />
                          {i < publications.length - 1 && <div className="w-px flex-1 bg-[#ece6d8] mt-1" />}
                        </div>
                        <div className="pb-1 min-w-0">
                          <p className="text-[13px] font-medium leading-snug group-hover:text-[#1d6b4f] transition-colors">{pub.title}</p>
                          <p className="text-[11.5px] text-[#8a8273] mt-1 italic font-serif">{pub.journal}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-sm border ${pubStatusStyles[pub.status]}`}>{pub.status}</span>
                            <span className="font-mono text-[10.5px] text-[#a39a85]">{pub.date}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.6 }}
                  className="bg-[#1d1a14] text-[#cfc8b8] border border-[#1d1a14] rounded-md p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-serif text-[20px] text-[#f4f0e6]">Lab today</h2>
                    <span className="text-[11px] font-mono text-[#857d6b]">14 members</span>
                  </div>
                  <div className="space-y-3">
                    {team.map((m) => (
                      <div key={m.name} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white" style={{ background: m.color }}>{m.initials}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-[#f4f0e6] truncate">{m.name}</p>
                          <p className="text-[11px] text-[#857d6b]">{m.role}</p>
                        </div>
                        <span className={`flex items-center gap-1.5 text-[11px] ${m.presence === 'In lab' ? 'text-[#7fc8a4]' : 'text-[#857d6b]'}`}>
                          {m.presence === 'In lab' ? <CheckCircle2 size={12} /> : <CircleDot size={12} />}
                          {m.presence}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button className="mt-5 w-full text-[12.5px] font-medium text-[#1d1a14] bg-[#f4f0e6] py-2.5 rounded-sm hover:bg-white transition-colors">
                    Weekly lab meeting agenda →
                  </button>
                </motion.div>
              </div>
            </div>

            <p className="mt-8 pb-4 text-[11.5px] text-[#a39a85] font-mono">
              Okonkwo Laboratory of Neurogenomics · Department of Brain & Cognitive Sciences · Building 46, Room 5117 · Last data sync 08:42 EDT
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}