import {
  App,
  PostMessageTransport,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from '@modelcontextprotocol/ext-apps';

type RawRecord = Record<string, unknown>;
type BrowserPayload = {
  kind?: 'pipedrive-crm-list';
  objectType?: 'deals' | 'persons' | 'organizations';
  mode?: 'search';
  query?: string | null;
  count?: number | null;
  nextCursor?: string | null;
  results?: RawRecord[];
};

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing root element');

const app = new App({ name: 'pipedrive-browser-view', version: '0.1.0' }, {}, { autoResize: true });
let currentTool = 'pipedriveSearchDeals';
let currentArgs: Record<string, unknown> = {};
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

function asRecord(value: unknown): RawRecord {
  return typeof value === 'object' && value !== null ? (value as RawRecord) : {};
}

function unwrapItem(record: RawRecord): RawRecord {
  return asRecord(record.item ?? record);
}

function objectLabel(objectType?: BrowserPayload['objectType']): string {
  if (objectType === 'deals') return 'Deals';
  if (objectType === 'persons') return 'Persons';
  if (objectType === 'organizations') return 'Organizations';
  return 'Records';
}

function formatDate(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) return 'Unknown';
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

function pickPrimary(record: RawRecord, objectType?: BrowserPayload['objectType']): string {
  if (objectType === 'deals') {
    return String(record.title ?? record.name ?? record.id ?? 'Untitled deal');
  }
  if (objectType === 'persons') {
    return String(record.name ?? record.title ?? record.id ?? 'Unnamed person');
  }
  return String(record.name ?? record.title ?? record.id ?? 'Unnamed organization');
}

function pickSummary(record: RawRecord, objectType?: BrowserPayload['objectType']): string {
  if (objectType === 'deals') {
    return String(formatMoney(record.value) ?? record.stage_name ?? record.status ?? 'No commercial summary');
  }
  if (objectType === 'persons') {
    const emails = Array.isArray(record.email) ? record.email : [];
    const firstEmail = asRecord(emails[0]).value;
    return String(firstEmail ?? record.phone ?? record.org_name ?? 'No contact detail');
  }
  return String(record.address ?? record.owner_name ?? record.visible_to ?? 'No organization detail');
}

function pickChips(record: RawRecord, objectType?: BrowserPayload['objectType']): string[] {
  if (objectType === 'deals') {
    return [
      String(record.pipeline_name ?? ''),
      String(record.stage_name ?? ''),
      String(record.status ?? ''),
    ].filter(Boolean);
  }
  if (objectType === 'persons') {
    return [String(record.org_name ?? ''), String(record.owner_name ?? ''), String(record.label ?? '')].filter(Boolean);
  }
  return [String(record.owner_name ?? ''), String(record.visible_to ?? ''), String(record.label ?? '')].filter(Boolean);
}

function pickUpdated(record: RawRecord): string {
  return formatDate(record.update_time ?? record.add_time ?? record.last_activity_date ?? null);
}

function render(payload: BrowserPayload): void {
  currentPayload = payload;
  const records = (payload.results ?? []).map(unwrapItem);
  const title = payload.query ? 'Search Results' : objectLabel(payload.objectType);
  const subtitle = payload.query
    ? `Showing ${objectLabel(payload.objectType).toLowerCase()} matching "${payload.query}".`
    : `Browse ${objectLabel(payload.objectType).toLowerCase()} in Pipedrive.`;

  const theme = isDarkTheme
    ? {
        shellBg:
          'radial-gradient(circle at top left, rgba(0, 177, 86, 0.16), transparent 34%), linear-gradient(180deg, #08110d 0%, #111827 100%)',
        panelBg: 'rgba(18, 24, 21, 0.94)',
        panelBorder: 'rgba(74, 222, 128, 0.12)',
        shadow: '0 10px 24px rgba(2, 6, 23, 0.38)',
        title: '#f4f4f5',
        text: '#d4d4d8',
        muted: '#a1a1aa',
        accent: '#4ade80',
        chipBg: '#0f2e1d',
        chipText: '#86efac',
        headText: '#94a3b8',
        rowBorder: 'rgba(74, 222, 128, 0.08)',
        link: '#bbf7d0',
        buttonBg: '#f4f4f5',
        buttonText: '#111827',
      }
    : {
        shellBg:
          'radial-gradient(circle at top left, rgba(220, 252, 231, 0.86), transparent 34%), linear-gradient(180deg, #f5fff9 0%, #ecfdf3 100%)',
        panelBg: 'rgba(255, 255, 255, 0.94)',
        panelBorder: 'rgba(0, 177, 86, 0.10)',
        shadow: '0 8px 20px rgba(15, 23, 42, 0.05)',
        title: '#052e16',
        text: '#4b5563',
        muted: '#6b7280',
        accent: '#00b156',
        chipBg: '#ecfdf3',
        chipText: '#047857',
        headText: '#667085',
        rowBorder: 'rgba(0, 177, 86, 0.08)',
        link: '#047857',
        buttonBg: '#052e16',
        buttonText: '#ffffff',
      };

  root.innerHTML = `
    <style>
      html, body { margin: 0; padding: 0; min-height: 0; }
      body { font-family: Georgia, serif; color: ${theme.title}; background: transparent; }
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
      button:disabled { opacity: .65; cursor: default; }
      @media (max-width: 640px) { .toolbar { flex-wrap:wrap; } .toolbar-actions { width:100%; display:flex; justify-content:flex-end; } }
      .table-head, .table-row { display:grid; grid-template-columns:minmax(280px,2.2fr) minmax(220px,1.4fr) minmax(140px,0.8fr); gap:12px; align-items:center; }
      .table-head { padding:9px 12px; border-bottom:1px solid ${theme.rowBorder}; color:${theme.headText}; font-size:12px; }
      .table-body { max-height:620px; overflow:auto; }
      .table-row { padding:10px 12px; border-bottom:1px solid ${theme.rowBorder}; font-size:13px; }
      .table-row:last-child { border-bottom:0; }
      .name-title { font-size:14px; font-weight:700; line-height:1.3; color:${theme.title}; }
      .muted { color:${theme.text}; font-size:12px; }
      .inline-chips { display:flex; flex-wrap:wrap; gap:6px; margin-top:4px; }
      .inline-chip { border-radius:999px; background:${theme.chipBg}; color:${theme.chipText}; padding:3px 8px; font-size:11px; }
      .empty { padding:18px 14px; color:${theme.text}; font-size:14px; }
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
              <span class="chip">Results: ${escapeHtml(String(payload.count ?? records.length))}</span>
              ${payload.query ? `<span class="chip">Query: ${escapeHtml(payload.query)}</span>` : ''}
              ${payload.nextCursor ? '<span class="chip">More available</span>' : ''}
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
          ${records.length === 0 ? `<div class="empty">No ${escapeHtml(objectLabel(payload.objectType).toLowerCase())} matched this request.</div>` : records.map((record) => `
            <div class="table-row">
              <div>
                <div class="name-title">${escapeHtml(pickPrimary(record, payload.objectType))}</div>
                <div class="inline-chips">${pickChips(record, payload.objectType).map((chip) => `<span class="inline-chip">${escapeHtml(chip)}</span>`).join('')}</div>
              </div>
              <div class="muted">${escapeHtml(pickSummary(record, payload.objectType))}</div>
              <div class="muted">${escapeHtml(pickUpdated(record))}</div>
            </div>
          `).join('')}
        </div>
      </section>
      <p class="note">Use this view for quick CRM scanning. For unsupported clients, the original JSON response remains unchanged.</p>
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
      render((result.structuredContent ?? {}) as BrowserPayload);
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
  render((result.structuredContent ?? {}) as BrowserPayload);
};

app.onhostcontextchanged = () => {
  applyHost();
  if (currentPayload.results) render(currentPayload);
};

void app.connect(new PostMessageTransport(window.parent, window.parent)).then(() => {
  applyHost();
});
