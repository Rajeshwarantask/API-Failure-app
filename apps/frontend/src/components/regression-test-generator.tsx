import { useMemo, useState } from 'react';
import { Check, Copy, FlaskConical } from 'lucide-react';
import type { ReactNode } from 'react';

type Execution = {
  method: string;
  url: string;
  requestHeaders?: Record<string, string> | null;
  requestBody?: string | null;
  responseBody?: string | null;
  simulatedStatus?: number | null;
  status: string;
  failureType: string;
};

type Framework = 'vitest' | 'jest' | 'playwright' | 'pytest' | 'junit';

const frameworkLabels: Record<Framework, string> = {
  vitest: 'Vitest',
  jest: 'Jest',
  playwright: 'Playwright',
  pytest: 'pytest',
  junit: 'JUnit',
};

function json(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

function requestBody(execution: Execution) {
  if (!execution.requestBody) return undefined;
  try { return JSON.stringify(JSON.parse(execution.requestBody)); } catch { return JSON.stringify(execution.requestBody); }
}

function generateTest(execution: Execution, framework: Framework) {
  const status = execution.simulatedStatus ?? 0;
  const body = requestBody(execution);
  const headers = json(execution.requestHeaders);
  const escapedUrl = JSON.stringify(execution.url);
  const expected = execution.status === 'timeout' ? 'rejects.toThrow' : `toHaveProperty('status', ${status})`;
  if (framework === 'vitest' || framework === 'jest') {
    const imports = framework === 'vitest' ? "import { describe, expect, it } from 'vitest';" : "import { describe, expect, it } from '@jest/globals';";
    const request = `await fetch(${escapedUrl}, { method: ${JSON.stringify(execution.method)}, headers: ${headers}${body ? `, body: ${JSON.stringify(execution.requestBody)}` : ''} })`;
    return `${imports}\n\ndescribe('FaultLine regression: ${execution.failureType}', () => {\n  it('preserves the observed ${execution.method} failure contract', async () => {\n    const responsePromise = ${request};\n    ${execution.status === 'timeout' ? `await expect(responsePromise).${expected};` : `const response = await responsePromise;\n    expect(response).${expected};`}\n  });\n});`;
  }
  if (framework === 'playwright') return `import { test, expect } from '@playwright/test';\n\ntest('FaultLine regression: ${execution.failureType}', async ({ request }) => {\n  const response = await request.${execution.method.toLowerCase()}(${escapedUrl}, {\n    headers: ${headers}${body ? `,\n    data: ${json(JSON.parse(execution.requestBody ?? '{}'))}` : ''}\n  });\n  expect(response.status()).toBe(${status});\n});`;
  if (framework === 'pytest') return `import requests\n\ndef test_faultline_${execution.failureType}():\n    response = requests.request(${JSON.stringify(execution.method)}, ${escapedUrl}, headers=${headers}${body ? `, data=${JSON.stringify(execution.requestBody)}` : ''})\n    assert response.status_code == ${status}`;
  return `import static org.junit.jupiter.api.Assertions.assertEquals;\nimport org.junit.jupiter.api.Test;\nimport java.net.http.*;\nimport java.net.URI;\n\nclass FaultLineRegressionTest {\n  @Test\n  void preservesObservedFailureContract() throws Exception {\n    var request = HttpRequest.newBuilder(URI.create(${escapedUrl})).method(${JSON.stringify(execution.method)}, HttpRequest.BodyPublishers.${body ? 'ofString(' + JSON.stringify(execution.requestBody) + ')' : 'noBody()'}).build();\n    var response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());\n    assertEquals(${status}, response.statusCode());\n  }\n}`;
}

function ActionButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold shadow-sm hover:bg-secondary"><FlaskConical size={14} />{children}</button>;
}

export function RegressionTestGenerator({ execution, open: controlledOpen, onOpenChange }: { execution: Execution; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (next: boolean) => { setInternalOpen(next); onOpenChange?.(next); };
  const [framework, setFramework] = useState<Framework>('vitest');
  const [copied, setCopied] = useState(false);
  const code = useMemo(() => generateTest(execution, framework), [execution, framework]);
  const copy = async () => { await navigator.clipboard?.writeText(code); setCopied(true); window.setTimeout(() => setCopied(false), 1400); };
  return <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4"><div><h2 className="flex items-center gap-2 text-sm font-semibold"><FlaskConical size={15} className="text-primary" /> Create regression test</h2><p className="mt-1 text-xs text-muted-foreground">Generate a deterministic test from this execution&apos;s observed request and response.</p></div><ActionButton onClick={() => setOpen(!open)}>{open ? 'Close generator' : 'Create test'}</ActionButton></div>{open && <div className="space-y-4 bg-secondary/20 p-5"><div className="flex flex-wrap items-center gap-3"><label className="text-xs font-semibold" htmlFor="regression-framework">Framework</label><select id="regression-framework" value={framework} onChange={event => setFramework(event.target.value as Framework)} className="rounded-md border border-border bg-background px-3 py-2 text-xs">{Object.entries(frameworkLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button type="button" onClick={copy} className="ml-auto inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-secondary">{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy code'}</button></div><pre className="max-h-[480px] overflow-auto rounded-lg border border-slate-700 bg-slate-950 p-4 font-mono text-[11px] leading-5 text-slate-200"><code>{code}</code></pre></div>}</section>;
}

export { generateTest };
export type { Framework };
