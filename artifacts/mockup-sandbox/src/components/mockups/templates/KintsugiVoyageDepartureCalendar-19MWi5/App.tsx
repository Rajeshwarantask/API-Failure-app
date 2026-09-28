import { useState, useMemo } from 'react';
import { ArrowLeft, ArrowRight, Circle, Minus } from 'lucide-react';

const JOURNEYS = {
  ash: {
    key: 'ash',
    name: 'Ash & Ember',
    glyph: '火',
    place: 'Kurama Hills, Kyoto Prefecture',
    nights: 5,
    pledge: 1850,
    total: 6,
    color: '#A8552F',
    text: '#F4EDE0',
    line: 'A night-fire ceremony in a cedar bowl of mountains. You arrive carrying something finished. You leave it in the ash.',
    receive: ['Hand-thrown raku cup, broken & repaired', 'Five nights, charcoal-heated minka', 'Letter you write, burned at dawn'],
  },
  salt: {
    key: 'salt',
    name: 'Saltbody',
    glyph: '潮',
    place: 'Isle of Harris, Outer Hebrides',
    nights: 4,
    pledge: 1200,
    total: 8,
    color: '#5C6650',
    text: '#F4EDE0',
    line: 'Four days of tidal silence. The sea decides the schedule. We follow it out and we follow it back.',
    receive: ['Wool blanket, undyed, woven on-island', 'Tide table marked by hand for your dates', 'Cold-water immersion with a keeper'],
  },
  moon: {
    key: 'moon',
    name: 'The Hollow Moon',
    glyph: '月',
    place: 'Atacama Plateau, Chile',
    nights: 7,
    pledge: 2400,
    total: 12,
    color: '#2B2A33',
    text: '#EFE8DB',
    line: 'Seven nights walking the driest place on earth under whatever the moon is doing. Mostly nothing. That is the point.',
    receive: ['Star chart drawn the night you arrive', 'Seven nights, adobe refugio', 'One day of total, scheduled nothing'],
  },
};

const EVENTS = {
  '2026-03-03': { j: 'ash', left: 2 },
  '2026-03-09': { j: 'salt', left: 1 },
  '2026-03-17': { j: 'ash', left: 4 },
  '2026-03-20': { j: 'moon', left: 7, note: 'equinox departure' },
  '2026-03-23': { j: 'salt', left: 5 },
  '2026-03-31': { j: 'ash', left: 6 },
  '2026-04-06': { j: 'salt', left: 8 },
  '2026-04-14': { j: 'ash', left: 6 },
  '2026-04-18': { j: 'moon', left: 12 },
  '2026-04-20': { j: 'salt', left: 3 },
  '2026-04-28': { j: 'ash', left: 5 },
};

const MOONS = {
  '2026-03-03': { g: '○', n: 'full' },
  '2026-03-11': { g: '◐', n: 'last quarter' },
  '2026-03-18': { g: '●', n: 'new' },
  '2026-03-25': { g: '◑', n: 'first quarter' },
  '2026-04-02': { g: '○', n: 'full' },
  '2026-04-10': { g: '◐', n: 'last quarter' },
  '2026-04-17': { g: '●', n: 'new' },
  '2026-04-24': { g: '◑', n: 'first quarter' },
};

const MONTHS = [
  { key: '2026-03', label: 'March', kanji: '弥生', sub: 'the month of new growth', year: 2026, days: 31, startDow: 0 },
  { key: '2026-04', label: 'April', kanji: '卯月', sub: 'the month of the unohana flower', year: 2026, days: 30, startDow: 3 },
];

const DOW = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const fmt = (n) => '$' + n.toLocaleString();

export default function App() {
  const [monthIdx, setMonthIdx] = useState(0);
  const [selected, setSelected] = useState('2026-03-20');
  const [active, setActive] = useState({ ash: true, salt: true, moon: true });

  const month = MONTHS[monthIdx];

  const cells = useMemo(() => {
    const arr = [];
    for (let i = 0; i < month.startDow; i++) arr.push(null);
    for (let d = 1; d <= month.days; d++) {
      const iso = `${month.key}-${String(d).padStart(2, '0')}`;
      arr.push({ d, iso, ev: EVENTS[iso] || null, moon: MOONS[iso] || null });
    }
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [monthIdx]);

  const sel = EVENTS[selected];
  const selJourney = sel ? JOURNEYS[sel.j] : null;
  const selDate = useMemo(() => {
    const [y, m, d] = selected.split('-');
    const mObj = MONTHS.find((x) => x.key === `${y}-${m}`);
    return { day: parseInt(d), month: mObj ? mObj.label : m, year: y };
  }, [selected]);

  const raised = 87420;
  const goal = 120000;
  const pct = raised / goal;
  const segments = 28;
  const filled = Math.round(pct * segments);

  const departuresThisMonth = cells.filter((c) => c && c.ev).length;

  return (
    <div className="ws-root min-h-screen text-[#211D19]" style={{ background: '#EFE8DB' }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900&family=IBM+Plex+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .ws-root { font-family: 'Fraunces', serif; font-variation-settings: 'opsz' 40, 'wght' 400; }
        .mono { font-family: 'IBM Plex Mono', monospace; }
        .vf { font-variation-settings: 'opsz' 60, 'wght' 380; transition: font-variation-settings .5s cubic-bezier(.22,1,.36,1), letter-spacing .5s cubic-bezier(.22,1,.36,1); }
        .vf:hover { font-variation-settings: 'opsz' 100, 'wght' 760; }
        .vf-light { font-variation-settings: 'opsz' 50, 'wght' 300; transition: font-variation-settings .5s cubic-bezier(.22,1,.36,1); }
        .vf-light:hover { font-variation-settings: 'opsz' 70, 'wght' 620; }
        .daycell .daynum { font-variation-settings: 'opsz' 30, 'wght' 360; transition: font-variation-settings .45s cubic-bezier(.22,1,.36,1); }
        .daycell:hover .daynum { font-variation-settings: 'opsz' 60, 'wght' 720; }
        .pledgebtn { font-variation-settings: 'opsz' 40, 'wght' 460; transition: font-variation-settings .4s cubic-bezier(.22,1,.36,1), background-color .25s, color .25s; }
        .pledgebtn:hover { font-variation-settings: 'opsz' 80, 'wght' 800; }
        .imperfect-ring { border-radius: 58% 44% 55% 49% / 49% 61% 43% 56%; }
        .imperfect-ring-2 { border-radius: 46% 57% 48% 60% / 58% 45% 59% 47%; }
        ::selection { background:#A8552F; color:#F4EDE0; }
        .ws-root ::-webkit-scrollbar { width: 10px; }
        .ws-root ::-webkit-scrollbar-track { background: #EFE8DB; }
        .ws-root ::-webkit-scrollbar-thumb { background: #211D19; }
        @keyframes settle { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .settle { animation: settle .5s cubic-bezier(.22,1,.36,1) both; }
      `,
        }}
      />

      {/* top hairline strip */}
      <div className="flex w-full h-2">
        <div style={{ background: '#A8552F', width: '23%' }} />
        <div style={{ background: '#211D19', width: '44%' }} />
        <div style={{ background: '#5C6650', width: '19%' }} />
        <div style={{ background: '#C9A227', width: '14%' }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[calc(100vh-8px)]">
        {/* ───────────────────────── LEFT ⅓ ───────────────────────── */}
        <aside className="lg:col-span-1 border-r border-[#211D19] flex flex-col">
          {/* brand */}
          <div className="px-8 pt-10 pb-7 border-b border-[#211D19] relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="mono text-[11px] tracking-[0.28em] uppercase text-[#8C8273]">Kintsugi Voyages presents</p>
                <h1 className="vf text-[42px] leading-[0.98] mt-3 cursor-default" style={{ fontVariationSettings: "'opsz' 110, 'wght' 340" }}>
                  The Vanishing<br />Hours
                </h1>
                <p className="mt-3 text-[15px] italic text-[#5a5246] leading-snug" style={{ fontVariationSettings: "'opsz' 30, 'wght' 360" }}>
                  Eleven departures. Three landscapes.<br />Funded only if enough of you disappear with us.
                </p>
              </div>
              <div className="text-right select-none" style={{ writingMode: 'vertical-rl' }}>
                <span className="text-[26px] tracking-[0.35em] text-[#A8552F]">侘寂</span>
              </div>
            </div>
            {/* hanko stamp */}
            <div
              className="absolute -bottom-5 right-8 w-10 h-10 imperfect-ring-2 flex items-center justify-center rotate-[-7deg]"
              style={{ background: '#A8552F', color: '#F4EDE0' }}
            >
              <span className="text-[15px]">間</span>
            </div>
          </div>

          {/* funding */}
          <div className="px-8 pt-8 pb-7 border-b border-[#211D19]">
            <div className="flex items-baseline justify-between">
              <span className="mono text-[11px] tracking-[0.22em] uppercase text-[#8C8273]">pledged so far</span>
              <span className="mono text-[11px] text-[#8C8273]">{Math.round(pct * 100)}%</span>
            </div>
            <div className="flex items-baseline gap-3 mt-2">
              <span className="text-[34px] leading-none" style={{ fontVariationSettings: "'opsz' 90, 'wght' 560" }}>{fmt(raised)}</span>
              <span className="text-[15px] text-[#8C8273]">of {fmt(goal)}</span>
            </div>
            {/* segmented flat bar */}
            <div className="flex gap-[3px] mt-5">
              {Array.from({ length: segments }).map((_, i) => (
                <div
                  key={i}
                  className="h-[18px] flex-1"
                  style={{
                    background: i < filled ? (i % 9 === 4 ? '#A8552F' : '#211D19') : '#D8CFBE',
                    transform: `translateY(${i % 5 === 2 ? 1.5 : i % 7 === 3 ? -1.5 : 0}px)`,
                  }}
                />
              ))}
            </div>
            <div className="grid grid-cols-3 mt-6">
              <div className="border-l-2 border-[#211D19] pl-3">
                <p className="text-[24px] leading-none" style={{ fontVariationSettings: "'wght' 540" }}>312</p>
                <p className="mono text-[10px] tracking-[0.18em] uppercase text-[#8C8273] mt-1">travelers</p>
              </div>
              <div className="border-l-2 border-[#A8552F] pl-3">
                <p className="text-[24px] leading-none" style={{ fontVariationSettings: "'wght' 540" }}>19</p>
                <p className="mono text-[10px] tracking-[0.18em] uppercase text-[#8C8273] mt-1">days remain</p>
              </div>
              <div className="border-l-2 border-[#5C6650] pl-3">
                <p className="text-[24px] leading-none" style={{ fontVariationSettings: "'wght' 540" }}>54</p>
                <p className="mono text-[10px] tracking-[0.18em] uppercase text-[#8C8273] mt-1">seats left</p>
              </div>
            </div>
          </div>

          {/* journey filters */}
          <div className="px-8 pt-7 pb-7 border-b border-[#211D19]">
            <p className="mono text-[11px] tracking-[0.22em] uppercase text-[#8C8273] mb-4">the three journeys — toggle to filter</p>
            <div className="space-y-[10px]">
              {Object.values(JOURNEYS).map((j, idx) => {
                const on = active[j.key];
                return (
                  <button
                    key={j.key}
                    onClick={() => setActive((a) => ({ ...a, [j.key]: !a[j.key] }))}
                    className="vf-light w-full flex items-center justify-between text-left px-4 py-3 border border-[#211D19] transition-colors duration-200"
                    style={{
                      background: on ? j.color : 'transparent',
                      color: on ? j.text : '#8C8273',
                      marginLeft: idx === 1 ? 14 : 0,
                      width: idx === 1 ? 'calc(100% - 14px)' : '100%',
                    }}
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-[17px]">{j.glyph}</span>
                      <span className="text-[16px]">{j.name}</span>
                    </span>
                    <span className="mono text-[11px]">{fmt(j.pledge)} · {j.nights}n</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* selected day detail */}
          <div className="px-8 pt-7 pb-10 flex-1" key={selected}>
            {selJourney ? (
              <div className="settle">
                <p className="mono text-[11px] tracking-[0.22em] uppercase text-[#8C8273]">
                  selected departure {sel.note ? `— ${sel.note}` : ''}
                </p>
                <div className="flex items-end gap-4 mt-3">
                  <span className="text-[56px] leading-[0.85]" style={{ fontVariationSettings: "'opsz' 130, 'wght' 300" }}>
                    {selDate.day}
                  </span>
                  <div className="pb-1">
                    <p className="text-[18px] leading-none" style={{ fontVariationSettings: "'wght' 520" }}>{selDate.month} {selDate.year}</p>
                    <p className="text-[14px] text-[#8C8273] mt-1">{selJourney.place}</p>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-3">
                  <span className="px-3 py-[5px] text-[13px]" style={{ background: selJourney.color, color: selJourney.text }}>
                    {selJourney.glyph}&nbsp; {selJourney.name}
                  </span>
                  <span className="mono text-[11px] text-[#8C8273]">{selJourney.nights} nights</span>
                </div>

                <p className="mt-4 text-[15px] leading-relaxed text-[#3d372e] italic" style={{ fontVariationSettings: "'wght' 360" }}>
                  {selJourney.line}
                </p>

                {/* seats */}
                <div className="mt-5">
                  <div className="flex items-center justify-between">
                    <span className="mono text-[10px] tracking-[0.18em] uppercase text-[#8C8273]">seats on this departure</span>
                    <span className="mono text-[11px]">{sel.left} of {selJourney.total} open</span>
                  </div>
                  <div className="flex gap-[5px] mt-2">
                    {Array.from({ length: selJourney.total }).map((_, i) => (
                      <div
                        key={i}
                        className="w-5 h-5 border border-[#211D19]"
                        style={{
                          background: i < selJourney.total - sel.left ? selJourney.color : 'transparent',
                          transform: `rotate(${(i % 3) - 1}deg)`,
                        }}
                      />
                    ))}
                  </div>
                </div>

                <ul className="mt-5 space-y-[6px]">
                  {selJourney.receive.map((r) => (
                    <li key={r} className="flex gap-3 text-[14px] text-[#3d372e]">
                      <Minus size={14} className="mt-[4px] shrink-0" style={{ color: selJourney.color }} />
                      {r}
                    </li>
                  ))}
                </ul>

                <button
                  className="pledgebtn w-full mt-7 py-4 text-[17px] border border-[#211D19]"
                  style={{ background: '#211D19', color: '#EFE8DB' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = selJourney.color; e.currentTarget.style.color = selJourney.text; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#211D19'; e.currentTarget.style.color = '#EFE8DB'; }}
                >
                  Reserve passage — {fmt(selJourney.pledge)}
                </button>
                <p className="mono text-[10px] text-[#8C8273] mt-3 leading-relaxed">
                  Charged only if the season funds. If it doesn't, your money returns and the dates dissolve.
                </p>
              </div>
            ) : (
              <div className="settle h-full flex flex-col justify-center">
                <p className="text-[20px] italic text-[#8C8273] leading-snug" style={{ fontVariationSettings: "'wght' 320" }}>
                  Nothing departs on this day.<br />The empty days hold the season together.
                </p>
                <p className="mono text-[11px] tracking-[0.2em] uppercase text-[#8C8273] mt-4">choose a marked date →</p>
              </div>
            )}
          </div>
        </aside>

        {/* ───────────────────────── RIGHT ⅔ : CALENDAR ───────────────────────── */}
        <main className="lg:col-span-2 flex flex-col">
          {/* calendar header */}
          <div className="flex items-end justify-between px-10 pt-10 pb-6 border-b border-[#211D19]">
            <div className="flex items-end gap-6">
              <h2 className="text-[64px] leading-[0.8]" style={{ fontVariationSettings: "'opsz' 144, 'wght' 280" }}>
                {month.label} <span className="text-[#A8552F]">{String(month.year).slice(2)}</span>
              </h2>
              <div className="pb-1">
                <p className="text-[15px] text-[#5a5246]">{month.kanji} — {month.sub}</p>
                <p className="mono text-[11px] tracking-[0.18em] uppercase text-[#8C8273] mt-1">
                  {departuresThisMonth} departures · season one of three
                </p>
              </div>
            </div>
            <div className="flex items-center gap-[10px] pb-2">
              <button
                onClick={() => setMonthIdx(0)}
                disabled={monthIdx === 0}
                className="vf w-11 h-11 border border-[#211D19] flex items-center justify-center disabled:opacity-25 hover:bg-[#211D19] hover:text-[#EFE8DB] transition-colors"
              >
                <ArrowLeft size={17} strokeWidth={1.5} />
              </button>
              <button
                onClick={() => setMonthIdx(1)}
                disabled={monthIdx === 1}
                className="vf w-11 h-11 border border-[#211D19] flex items-center justify-center disabled:opacity-25 hover:bg-[#211D19] hover:text-[#EFE8DB] transition-colors -mt-2"
              >
                <ArrowRight size={17} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* weekday row */}
          <div className="grid grid-cols-7 border-b border-[#211D19]" style={{ background: '#E5DCC9' }}>
            {DOW.map((d, i) => (
              <div key={d} className={`mono text-[11px] tracking-[0.24em] uppercase py-3 px-4 ${i > 0 ? 'border-l border-[#211D19]' : ''} ${i === 0 || i === 6 ? 'text-[#A8552F]' : 'text-[#211D19]'}`}>
                {d}
              </div>
            ))}
          </div>

          {/* day grid */}
          <div className="grid grid-cols-7 flex-1" key={month.key}>
            {cells.map((c, i) => {
              const col = i % 7;
              const isSel = c && c.iso === selected;
              const ev = c && c.ev;
              const j = ev ? JOURNEYS[ev.j] : null;
              const dimmed = ev && !active[ev.j];
              const isWknd = col === 0 || col === 6;
              return (
                <div
                  key={i}
                  onClick={() => c && setSelected(c.iso)}
                  className={`daycell relative min-h-[108px] px-3 pt-2 pb-3 settle ${col > 0 ? 'border-l' : ''} border-b border-[#D8CFBE] ${c ? 'cursor-pointer' : ''} transition-colors duration-200`}
                  style={{
                    background: !c ? '#E5DCC9' : isSel ? '#F7F2E6' : isWknd ? '#EBE2D2' : 'transparent',
                    animationDelay: `${i * 12}ms`,
                  }}
                >
                  {c && (
                    <>
                      <div className="flex items-start justify-between">
                        <span className="relative inline-flex items-center justify-center w-8 h-8">
                          {isSel && (
                            <span className="imperfect-ring absolute inset-[-3px] border-[2.5px] border-[#A8552F] rotate-[5deg]" />
                          )}
                          <span className={`daynum text-[19px] ${isWknd && !isSel ? 'text-[#8C8273]' : ''}`}>{c.d}</span>
                        </span>
                        <span className="flex items-center gap-2 mt-1">
                          {c.note}
                          {c.moon && (
                            <span className="text-[13px] leading-none text-[#211D19]" title={`${c.moon.n} moon`}>{c.moon.g}</span>
                          )}
                          {c.iso === '2026-03-20' && (
                            <span className="mono text-[9px] tracking-[0.14em] uppercase text-[#A8552F]">equinox</span>
                          )}
                        </span>
                      </div>

                      {ev && (
                        <div
                          className="mt-2 transition-opacity duration-200"
                          style={{ opacity: dimmed ? 0.18 : 1, transform: `rotate(${((c.d % 3) - 1) * 0.6}deg)` }}
                        >
                          <div className="px-2 py-[6px]" style={{ background: j.color, color: j.text }}>
                            <p className="text-[13px] leading-tight" style={{ fontVariationSettings: "'wght' 480" }}>
                              {j.glyph} {j.name}
                            </p>
                          </div>
                          <div className="flex items-center justify-between border border-t-0 border-[#211D19] px-2 py-[3px]" style={{ background: '#F7F2E6' }}>
                            <span className="mono text-[10px]">
                              {ev.left === 1 ? 'last seat' : `${ev.left} seats`}
                            </span>
                            <span className="mono text-[10px] text-[#8C8273]">{fmt(j.pledge)}</span>
                          </div>
                        </div>
                      )}

                      {ev && ev.left <= 2 && !dimmed && (
                        <div className="absolute top-[6px] right-[34px] w-[7px] h-[7px] imperfect-ring" style={{ background: '#A8552F' }} />
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* footer */}
          <div className="flex flex-wrap items-center justify-between gap-4 px-10 py-5 border-t border-[#211D19]" style={{ background: '#E5DCC9' }}>
            <div className="flex items-center gap-7 mono text-[11px] text-[#5a5246]">
              <span className="flex items-center gap-2"><span>●</span> new moon</span>
              <span className="flex items-center gap-2"><span>○</span> full moon</span>
              <span className="flex items-center gap-2">
                <span className="w-[7px] h-[7px] imperfect-ring inline-block" style={{ background: '#A8552F' }} /> nearly gone
              </span>
              <span className="hidden xl:flex items-center gap-2">
                <Circle size={7} fill="#211D19" stroke="none" /> all times local, all weather welcome
              </span>
            </div>
            <p className="text-[14px] italic text-[#5a5246]" style={{ fontVariationSettings: "'wght' 360" }}>
              Departures sail regardless of weather — especially because of it.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}