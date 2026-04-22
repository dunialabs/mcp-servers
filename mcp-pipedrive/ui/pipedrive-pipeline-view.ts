import {
  App,
  PostMessageTransport,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from '@modelcontextprotocol/ext-apps';

type RawRecord = Record<string, unknown>;
type PipelinePayload = {
  kind?: 'pipedrive-pipeline-summary';
  mode?: 'pipelines' | 'stages';
  pipelineId?: number | null;
  count?: number | null;
  nextCursor?: string | null;
  hasMore?: boolean;
  results?: RawRecord[];
};

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing root element');

const app = new App({ name: 'pipedrive-pipeline-view', version: '0.1.0' }, {}, { autoResize: true });
let currentTool = 'pipedriveListPipelines';
let currentArgs: Record<string, unknown> = {};
let currentPayload: PipelinePayload = {};
let isRefreshing = false;
let isDarkTheme = false;

function detectDarkTheme(): boolean {
  const context = app.getHostContext();
  const theme = context?.theme as { mode?: string; appearance?: string; colorScheme?: string } | undefined;
  const mode = (theme?.mode ?? theme?.appearance ?? theme?.colorScheme ?? '').toLowerCase();
  if (mode.includes('dark')) return true;
  if (mode.includes('light')) return false;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

function applyHost(): void {
  const context = app.getHostContext();
  if (context?.theme) applyDocumentTheme(context.theme);
  if (context?.styles?.variables) applyHostStyleVariables(context.styles.variables);
  if (context?.styles?.css?.fonts) applyHostFonts(context.styles.css.fonts);
  isDarkTheme = detectDarkTheme();
}

function notifySizeChanged(): void {
  requestAnimationFrame(() => {
    void app.sendSizeChanged({
      width: Math.ceil(document.documentElement.scrollWidth),
      height: Math.ceil(document.documentElement.scrollHeight),
    });
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatProbability(value: unknown): string {
  if (typeof value !== 'number') return '—';
  return `${value}%`;
}

function groupStagesByPipeline(results: RawRecord[]): Map<string, RawRecord[]> {
  const grouped = new Map<string, RawRecord[]>();
  for (const row of results) {
    const key = String(row.pipeline_name ?? row.pipeline_id ?? 'Unknown pipeline');
    const list = grouped.get(key) ?? [];
    list.push(row);
    grouped.set(key, list);
  }
  return grouped;
}

function render(payload: PipelinePayload): void {
  currentPayload = payload;
  const results = payload.results ?? [];
  const title = payload.mode === 'stages' ? 'Stages' : 'Pipelines';
  const subtitle = payload.mode === 'stages'
    ? `Review stage order${payload.pipelineId ? ` for pipeline ${payload.pipelineId}` : ''} and keep pipeline structure readable.`
    : 'Browse pipeline configuration and probability hints in one place.';

  const theme = isDarkTheme
    ? {
        shellBg:
          'radial-gradient(circle at top left, rgba(61, 214, 140, 0.14), transparent 34%), linear-gradient(180deg, #04110a 0%, #020b06 100%)',
        panelBg: 'rgba(4, 16, 9, 0.96)',
        panelBorder: 'rgba(61, 214, 140, 0.12)',
        shadow: '0 10px 24px rgba(0, 0, 0, 0.40)',
        title: '#e8f9ef',
        text: '#a0d4b4',
        muted: '#4a8a64',
        accent: '#3dd68c',
        chipBg: '#041808',
        chipText: '#6ae8a2',
        headText: '#4a8a64',
        rowBorder: 'rgba(61, 214, 140, 0.08)',
        buttonBg: '#e8f9ef',
        buttonText: '#04110a',
      }
    : {
        shellBg:
          'radial-gradient(circle at top left, rgba(30, 107, 56, 0.12), transparent 36%), linear-gradient(180deg, #f4faf6 0%, #ebf5ef 100%)',
        panelBg: 'rgba(255, 255, 255, 0.94)',
        panelBorder: 'rgba(30, 107, 56, 0.12)',
        shadow: '0 8px 20px rgba(10, 40, 20, 0.06)',
        title: '#0a2818',
        text: '#1a3a28',
        muted: '#4a7a5a',
        accent: '#1e6b38',
        chipBg: '#ebf5ef',
        chipText: '#1e6b38',
        headText: '#5a8a6a',
        rowBorder: 'rgba(30, 107, 56, 0.08)',
        buttonBg: '#0a2818',
        buttonText: '#ffffff',
      };

  const stageGroups = payload.mode === 'stages' ? Array.from(groupStagesByPipeline(results).entries()) : [];

  root.innerHTML = `
    <style>
      html, body { margin:0; padding:0; min-height:0; }
      body { font-family: Georgia, serif; color:${theme.title}; background:transparent; }
      .shell { display:grid; gap:12px; margin:10px; padding:10px; border-radius:22px; overflow:hidden; background:${theme.shellBg}; }
      .hero, .panel { background:${theme.panelBg}; border:1px solid ${theme.panelBorder}; border-radius:18px; box-shadow:${theme.shadow}; }
      .hero { padding:12px; display:grid; gap:8px; }
      .eyebrow { margin:0; text-transform:uppercase; letter-spacing:.16em; font-size:11px; color:${theme.accent}; }
      h1, p { margin:0; }
      h1 { font-size:22px; line-height:1.08; color:${theme.accent}; }
      .toolbar { display:flex; align-items:flex-end; justify-content:space-between; gap:12px; }
      .toolbar-main { min-width:0; display:grid; gap:6px; }
      .toolbar-actions { margin-left:auto; }
      .subhead { color:${theme.text}; font-size:13px; line-height:1.4; }
      .chips { display:flex; flex-wrap:wrap; gap:6px; }
      .chip { display:inline-flex; align-items:center; gap:6px; border-radius:999px; background:${theme.chipBg}; color:${theme.chipText}; padding:4px 8px; font-size:11px; }
      button { border:0; border-radius:999px; padding:4px 10px; font:inherit; background:${theme.buttonBg}; color:${theme.buttonText}; cursor:pointer; min-width:66px; font-size:11px; }
      button:disabled { opacity:.65; cursor:default; }
      @media (max-width: 640px) { .toolbar { flex-wrap:wrap; } .toolbar-actions { width:100%; display:flex; justify-content:flex-end; } }
      .grid { display:grid; gap:10px; }
      .pipeline-cards { display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:10px; }
      .card { background:${theme.panelBg}; border:1px solid ${theme.panelBorder}; border-radius:14px; padding:10px; display:grid; gap:5px; }
      .label { text-transform:uppercase; letter-spacing:.14em; font-size:10px; color:${theme.headText}; }
      .value { font-size:15px; color:${theme.title}; }
      .muted { color:${theme.text}; font-size:12px; }
      .stage-group { border:1px solid ${theme.rowBorder}; border-radius:14px; overflow:hidden; }
      .stage-head, .stage-row { display:grid; grid-template-columns:minmax(220px,2fr) minmax(120px,1fr) minmax(120px,1fr); gap:12px; align-items:center; }
      .stage-head { padding:9px 12px; border-bottom:1px solid ${theme.rowBorder}; color:${theme.headText}; font-size:12px; }
      .stage-title { padding:10px 12px; border-bottom:1px solid ${theme.rowBorder}; font-size:14px; font-weight:700; color:${theme.accent}; }
      .stage-row { padding:10px 12px; border-bottom:1px solid ${theme.rowBorder}; }
      .stage-row:last-child { border-bottom:0; }
      .note { color:${theme.muted}; font-size:11px; line-height:1.45; }
    </style>
    <div class="shell">
      <section class="hero">
        <p class="eyebrow">Pipedrive</p>
        <h1>${escapeHtml(title)}</h1>
        <div class="toolbar">
          <div class="toolbar-main">
            <p class="subhead">${escapeHtml(subtitle)}</p>
            <div class="chips">
              <span class="chip">Count: ${escapeHtml(String(payload.count ?? results.length))}</span>
              ${payload.pipelineId != null ? `<span class="chip">Pipeline: ${escapeHtml(String(payload.pipelineId))}</span>` : ''}
              ${payload.hasMore ? '<span class="chip">More available</span>' : ''}
            </div>
          </div>
          <div class="toolbar-actions">
            <button id="refresh" ${isRefreshing ? 'disabled' : ''}>${isRefreshing ? 'Refreshing...' : 'Refresh'}</button>
          </div>
        </div>
      </section>
      <section class="panel" style="padding:12px;">
        ${payload.mode === 'pipelines' ? `
          <div class="pipeline-cards">
            ${results.map((row) => `
              <div class="card">
                <div class="label">Pipeline</div>
                <div class="value">${escapeHtml(String(row.name ?? row.id ?? 'Unnamed pipeline'))}</div>
                <div class="muted">${escapeHtml(String(row.deal_probability ? `Probability: ${formatProbability(row.deal_probability)}` : 'No probability rule'))}</div>
                <div class="muted">${escapeHtml(String(row.active_flag === false ? 'Inactive' : 'Active'))}</div>
              </div>
            `).join('')}
          </div>
        ` : `
          <div class="grid">
            ${stageGroups.map(([group, rows]) => `
              <div class="stage-group">
                <div class="stage-title">${escapeHtml(group)}</div>
                <div class="stage-head"><div>Stage</div><div>Order</div><div>Status</div></div>
                ${rows.map((row) => `
                  <div class="stage-row">
                    <div>${escapeHtml(String(row.name ?? row.id ?? 'Unnamed stage'))}</div>
                    <div class="muted">${escapeHtml(String(row.order_nr ?? '—'))}</div>
                    <div class="muted">${escapeHtml(String(row.active_flag === false ? 'Inactive' : 'Active'))}</div>
                  </div>
                `).join('')}
              </div>
            `).join('')}
          </div>
        `}
      </section>
      <p class="note">This view keeps pipeline and stage structure readable without changing the original fallback JSON output.</p>
    </div>
  `;

  bindRefresh();
  notifySizeChanged();
}

function bindRefresh(): void {
  root.querySelector<HTMLButtonElement>('#refresh')?.addEventListener('click', async () => {
    if (isRefreshing) return;
    isRefreshing = true;
    render(currentPayload);
    try {
      const result = await app.callServerTool({ name: currentTool, arguments: currentArgs });
      render((result.structuredContent ?? {}) as PipelinePayload);
    } finally {
      isRefreshing = false;
      notifySizeChanged();
    }
  });
}

app.ontoolinput = ({ arguments: args, toolInfo }) => {
  currentArgs = args ?? {};
  if (toolInfo?.name) currentTool = toolInfo.name;
};

app.ontoolresult = (result) => {
  render((result.structuredContent ?? {}) as PipelinePayload);
};

app.onhostcontextchanged = () => {
  applyHost();
  if (currentPayload.results) render(currentPayload);
};

void app.connect(new PostMessageTransport(window.parent, window.parent)).then(() => {
  applyHost();
});
