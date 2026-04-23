import {
  App,
  PostMessageTransport,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from '@modelcontextprotocol/ext-apps';

type RecordProperties = Record<string, string | number | boolean | null | undefined>;

type HubSpotRecord = {
  id?: string | number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  archived?: boolean | null;
  properties?: RecordProperties | null;
};

type BrowserPayload = {
  kind?: 'hubspot-crm-list';
  objectType?: 'contacts' | 'companies' | 'deals';
  mode?: 'search';
  query?: string | null;
  total?: number | null;
  count?: number | null;
  nextAfter?: string | null;
  records?: HubSpotRecord[];
};

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing root element');

const app = new App({ name: 'hubspot-browser-view', version: '0.1.0' }, {}, { autoResize: true });
let currentArgs: Record<string, unknown> = {};
let currentTool = 'hubspotSearchContacts';
let currentPayload: BrowserPayload = {};
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

function applyHost() {
  const context = app.getHostContext();
  if (context?.theme) applyDocumentTheme(context.theme);
  if (context?.styles?.variables) applyHostStyleVariables(context.styles.variables);
  if (context?.styles?.css?.fonts) applyHostFonts(context.styles.css.fonts);
  isDarkTheme = detectDarkTheme();
}

function notifySizeChanged() {
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

function formatDate(value?: string | null): string {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMoney(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const amount = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(amount)) return null;
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function objectLabel(objectType?: BrowserPayload['objectType']): string {
  if (objectType === 'contacts') return 'Contacts';
  if (objectType === 'companies') return 'Companies';
  if (objectType === 'deals') return 'Deals';
  return 'Records';
}

function accentLabel(record: HubSpotRecord, objectType?: BrowserPayload['objectType']): string {
  const props = record.properties ?? {};
  if (objectType === 'contacts') {
    return String(props.email ?? props.phone ?? 'No primary contact info');
  }
  if (objectType === 'companies') {
    return String(props.domain ?? props.phone ?? 'No company detail');
  }
  return String(formatMoney(props.amount) ?? props.pipeline ?? props.dealstage ?? 'No stage info');
}

function primaryLabel(record: HubSpotRecord, objectType?: BrowserPayload['objectType']): string {
  const props = record.properties ?? {};
  if (objectType === 'contacts') {
    const first = String(props.firstname ?? '').trim();
    const last = String(props.lastname ?? '').trim();
    const full = `${first} ${last}`.trim();
    return full || String(props.email ?? record.id ?? 'Untitled contact');
  }
  if (objectType === 'companies') {
    return String(props.name ?? props.domain ?? record.id ?? 'Untitled company');
  }
  return String(props.dealname ?? record.id ?? 'Untitled deal');
}

function secondaryChips(record: HubSpotRecord, objectType?: BrowserPayload['objectType']): string[] {
  const props = record.properties ?? {};
  if (objectType === 'contacts') {
    return [String(props.company ?? ''), String(props.jobtitle ?? ''), String(props.hs_lead_status ?? '')].filter(Boolean);
  }
  if (objectType === 'companies') {
    return [String(props.industry ?? ''), String(props.city ?? ''), String(props.country ?? '')].filter(Boolean);
  }
  return [
    String(props.pipeline ?? ''),
    String(props.dealstage ?? ''),
    formatMoney(props.amount) ?? '',
  ].filter(Boolean);
}

function render(payload: BrowserPayload) {
  currentPayload = payload;
  const records = payload.records ?? [];
  const title = payload.query ? 'Search Results' : objectLabel(payload.objectType);
  const subtitle = payload.query
    ? `Showing ${objectLabel(payload.objectType).toLowerCase()} that matched "${payload.query}".`
    : `Browse ${objectLabel(payload.objectType).toLowerCase()} in HubSpot.`;
  const theme = isDarkTheme
    ? {
        title: '#f5f5f5',
        text: '#d4d4d8',
        muted: '#a1a1aa',
        shellBg:
          'radial-gradient(circle at top left, rgba(234, 88, 12, 0.14), transparent 36%), linear-gradient(180deg, #0f172a 0%, #1c1007 100%)',
        panelBg: 'rgba(24, 24, 27, 0.94)',
        panelBorder: 'rgba(253, 186, 116, 0.12)',
        shadow: '0 10px 24px rgba(2, 6, 23, 0.38)',
        accent: '#fdba74',
        chipBg: '#431407',
        chipText: '#fdba74',
        headText: '#94a3b8',
        rowBorder: 'rgba(253, 186, 116, 0.1)',
        link: '#fed7aa',
        buttonBg: '#f5f5f5',
        buttonText: '#111111',
      }
    : {
        title: '#1c0a00',
        text: '#5b6471',
        muted: '#667085',
        shellBg:
          'radial-gradient(circle at top left, rgba(255, 237, 213, 0.85), transparent 35%), linear-gradient(180deg, #fff8f5 0%, #fff4ed 100%)',
        panelBg: 'rgba(255,255,255,0.93)',
        panelBorder: 'rgba(234, 88, 12, 0.1)',
        shadow: '0 8px 20px rgba(15, 23, 42, 0.05)',
        accent: '#ea580c',
        chipBg: '#fff7ed',
        chipText: '#ea580c',
        headText: '#667085',
        rowBorder: 'rgba(234, 88, 12, 0.07)',
        link: '#9a3412',
        buttonBg: '#1c0a00',
        buttonText: '#ffffff',
      };

  root.innerHTML = `
    <style>
      html, body { margin: 0; padding: 0; min-height: 0; }
      body { font-family: Georgia, serif; color: ${theme.title}; background: transparent; padding: 0; }
      .shell {
        display: grid;
        gap: 12px;
        margin: 10px;
        padding: 10px;
        border-radius: 22px;
        overflow: hidden;
        background: ${theme.shellBg};
      }
      .hero, .panel {
        background: ${theme.panelBg};
        border: 1px solid ${theme.panelBorder};
        border-radius: 18px;
        box-shadow: ${theme.shadow};
      }
      .hero { padding: 12px; display: grid; gap: 8px; }
      .eyebrow { margin: 0; text-transform: uppercase; letter-spacing: 0.16em; font-size: 11px; color: ${theme.accent}; }
      h1, p { margin: 0; }
      h1 { font-size: 22px; line-height: 1.08; color: ${theme.accent}; }
      .toolbar { display:flex; align-items:flex-end; justify-content:space-between; gap:12px; flex-wrap:nowrap; }
      .toolbar-main { min-width:0; display:grid; gap:6px; }
      .toolbar-actions { display:flex; align-items:flex-end; margin-left:auto; }
      .subhead { color:${theme.text}; font-size:13px; line-height:1.4; }
      .chips { display:flex; flex-wrap:wrap; gap:6px; }
      .chip { display:inline-flex; align-items:center; gap:6px; border-radius:999px; background:${theme.chipBg}; color:${theme.chipText}; padding:4px 8px; font-size:11px; }
      button { border:0; border-radius:999px; padding:4px 10px; font:inherit; background:${theme.buttonBg}; color:${theme.buttonText}; cursor:pointer; min-width:66px; font-size:11px; }
      button:disabled { opacity:0.65; cursor:default; }
      @media (max-width: 640px) { .toolbar { flex-wrap:wrap; } .toolbar-actions { width:100%; justify-content:flex-end; margin-left:0; } }
      .panel { overflow: hidden; }
      .table-head, .table-row { display:grid; grid-template-columns:minmax(280px,2.2fr) minmax(220px,1.5fr) minmax(160px,0.9fr); gap:12px; align-items:center; }
      .table-head { padding:9px 12px; border-bottom:1px solid ${theme.rowBorder}; color:${theme.headText}; font-size:12px; }
      .table-body { max-height: 620px; overflow:auto; }
      .table-row { padding:10px 12px; border-bottom:1px solid ${theme.rowBorder}; font-size:13px; }
      .table-row:last-child { border-bottom:0; }
      .name-title { font-size:14px; font-weight:700; line-height:1.3; color:${theme.title}; }
      .muted { color:${theme.text}; font-size:12px; }
      .inline-chips { display:flex; flex-wrap:wrap; gap:6px; margin-top:4px; }
      .inline-chip { border-radius:999px; background:${theme.chipBg}; color:${theme.chipText}; padding:3px 8px; font-size:11px; }
      .link { color:${theme.link}; text-decoration:none; font-size:12px; font-weight:600; }
      .link:hover { text-decoration:underline; }
      .empty { padding:18px 14px; color:${theme.text}; font-size:14px; }
      .note { color:${theme.muted}; font-size:11px; line-height:1.45; }
    </style>
    <div class="shell">
      <section class="hero">
        <p class="eyebrow">HubSpot</p>
        <h1>${escapeHtml(title)}</h1>
        <div class="toolbar">
          <div class="toolbar-main">
            <p class="subhead">${escapeHtml(subtitle)}</p>
            <div class="chips">
              <span class="chip">Results: ${escapeHtml(String(payload.count ?? records.length))}</span>
              ${payload.total != null ? `<span class="chip">Total: ${escapeHtml(String(payload.total))}</span>` : ''}
              ${payload.query ? `<span class="chip">Query: ${escapeHtml(payload.query)}</span>` : ''}
              ${payload.nextAfter ? '<span class="chip">More available</span>' : ''}
            </div>
          </div>
          <div class="toolbar-actions">
            <button id="refresh" ${isRefreshing ? 'disabled' : ''}>${isRefreshing ? 'Refreshing...' : 'Refresh'}</button>
          </div>
        </div>
      </section>
      <section class="panel">
        <div class="table-head">
          <div>${escapeHtml(objectLabel(payload.objectType).slice(0, -1) || 'Record')}</div>
          <div>Summary</div>
          <div>Updated</div>
        </div>
        <div class="table-body">
          ${
            records.length === 0
              ? '<div class="empty">No HubSpot records matched this request.</div>'
              : records
                  .map((record) => {
                    const id = String(record.id ?? '');
                    const detailTool =
                      payload.objectType === 'deals' ? `<a class="link" href="#" data-tool="hubspotGetDeal" data-id="${escapeHtml(id)}">Open deal detail</a>` : '';
                    return `
                      <div class="table-row">
                        <div>
                          <div class="name-title">${escapeHtml(primaryLabel(record, payload.objectType))}</div>
                          <div class="muted">${escapeHtml(accentLabel(record, payload.objectType))}</div>
                          ${detailTool}
                        </div>
                        <div>
                          <div class="inline-chips">
                            ${secondaryChips(record, payload.objectType)
                              .map((chip) => `<span class="inline-chip">${escapeHtml(chip)}</span>`)
                              .join('')}
                          </div>
                        </div>
                        <div class="muted">${escapeHtml(formatDate(record.updatedAt ?? record.createdAt))}</div>
                      </div>
                    `;
                  })
                  .join('')
          }
        </div>
      </section>
      <p class="note">HubSpot search views are optimized for scanning. Deal rows link into a richer detail panel when supported by the host.</p>
    </div>
  `;

  bindActions();
  notifySizeChanged();
}

function bindActions() {
  root.querySelector<HTMLButtonElement>('#refresh')?.addEventListener('click', async () => {
    if (isRefreshing) return;
    isRefreshing = true;
    render(currentPayload);
    try {
      const result = await app.callServerTool({ name: currentTool, arguments: currentArgs });
      isRefreshing = false;
      render((result.structuredContent ?? {}) as BrowserPayload);
    } finally {
      isRefreshing = false;
      notifySizeChanged();
    }
  });

  root.querySelectorAll<HTMLAnchorElement>('[data-tool="hubspotGetDeal"]').forEach((link) => {
    link.addEventListener('click', async (event) => {
      event.preventDefault();
      const dealId = link.dataset.id;
      if (!dealId) return;
      await app.callServerTool({ name: 'hubspotGetDeal', arguments: { dealId } });
    });
  });
}

app.ontoolinput = ({ arguments: args, toolInfo }) => {
  currentArgs = args ?? {};
  if (toolInfo?.name) currentTool = toolInfo.name;
};

app.ontoolresult = (result) => {
  render((result.structuredContent ?? {}) as BrowserPayload);
};

app.onhostcontextchanged = () => {
  applyHost();
  if (currentPayload.records) render(currentPayload);
};

void app.connect(new PostMessageTransport(window.parent, window.parent)).then(() => {
  applyHost();
});
