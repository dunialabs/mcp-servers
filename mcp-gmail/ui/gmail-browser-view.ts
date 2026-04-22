import { App, PostMessageTransport, applyDocumentTheme, applyHostFonts, applyHostStyleVariables } from '@modelcontextprotocol/ext-apps';

type MessageItem = {
  id?: string | null;
  threadId?: string | null;
  labelIds?: string[] | null;
  snippet?: string | null;
  internalDate?: string | null;
  sizeEstimate?: number | null;
  subject?: string | null;
  from?: string | null;
  to?: string | null;
  date?: string | null;
};

type BrowserPayload = {
  kind?: 'gmail-browser';
  mode?: 'list' | 'search';
  query?: string | null;
  labelIds?: string[];
  maxResults?: number;
  includeMessageDetails?: boolean;
  resultSizeEstimate?: number;
  nextPageToken?: string | null;
  messages?: MessageItem[];
};

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing root element');

const app = new App({ name: 'gmail-browser-view', version: '0.1.0' }, {}, { autoResize: true });
let currentArgs: Record<string, unknown> = {};
let currentTool = 'gmailListMessages';
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

function formatDate(value?: string | null, fallbackDate?: string | null): string {
  const source = value ?? fallbackDate;
  if (!source) return 'Unknown';
  const numeric = /^\d+$/.test(source) ? Number(source) : NaN;
  const date = Number.isNaN(numeric) ? new Date(source) : new Date(numeric);
  if (Number.isNaN(date.getTime())) return source;
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function render(payload: BrowserPayload) {
  currentPayload = payload;
  const messages = payload.messages ?? [];
  const mode = payload.mode ?? 'list';
  const theme = isDarkTheme
    ? {
        title: '#f8e8e5',
        text: '#c8a8a2',
        muted: '#b89090',
        shellBg: 'radial-gradient(circle at top left, rgba(234, 67, 53, 0.08), transparent 32%), linear-gradient(180deg, #1e1818 0%, #161212 100%)',
        panelBg: 'rgba(30, 22, 22, 0.98)',
        panelBorder: 'rgba(234, 67, 53, 0.18)',
        shadow: '0 10px 24px rgba(0, 0, 0, 0.45)',
        accent: '#f87060',
        chipBg: '#3e2828',
        chipText: '#f8a898',
        headText: '#b08888',
        rowBorder: 'rgba(234, 67, 53, 0.12)',
        buttonBg: '#f8e8e5',
        buttonText: '#1e1818',
      }
    : {
        title: '#2d0a06',
        text: '#5a2018',
        muted: '#8a4030',
        shellBg: 'radial-gradient(circle at top left, rgba(234, 67, 53, 0.10), transparent 36%), linear-gradient(180deg, #fff5f4 0%, #feecea 100%)',
        panelBg: 'rgba(255, 255, 255, 0.94)',
        panelBorder: 'rgba(234, 67, 53, 0.12)',
        shadow: '0 8px 20px rgba(80, 10, 5, 0.06)',
        accent: '#EA4335',
        chipBg: '#feecea',
        chipText: '#c0392b',
        headText: '#8a6060',
        rowBorder: 'rgba(234, 67, 53, 0.08)',
        buttonBg: '#2d0a06',
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
      .toolbar-main { min-width: 0; display: grid; gap: 6px; }
      .toolbar-actions { display:flex; align-items:flex-end; margin-left:auto; }
      .subhead { color:${theme.text}; font-size:13px; line-height:1.4; }
      .chips { display:flex; flex-wrap:wrap; gap:6px; }
      .chip { display:inline-flex; align-items:center; gap:6px; border-radius:999px; background:${theme.chipBg}; color:${theme.chipText}; padding:4px 8px; font-size:11px; }
      button { border:0; border-radius:999px; padding:4px 10px; font:inherit; background:${theme.buttonBg}; color:${theme.buttonText}; cursor:pointer; min-width:66px; font-size:11px; }
      button:disabled { opacity:.65; cursor:default; }
      @media (max-width: 640px) { .toolbar { flex-wrap:wrap; } .toolbar-actions { width:100%; justify-content:flex-end; margin-left:0; } }
      .panel { overflow: hidden; }
      .table-head, .table-row {
        display: grid;
        grid-template-columns: minmax(280px, 2.7fr) minmax(160px, 1.1fr) minmax(180px, 1.3fr);
        gap: 12px;
        align-items: center;
      }
      .table-head { padding: 9px 12px; border-bottom: 1px solid ${theme.rowBorder}; color: ${theme.headText}; font-size: 12px; }
      .table-body { max-height: 620px; overflow: auto; }
      .table-row { padding: 8px 12px; border-bottom: 1px solid ${theme.rowBorder}; font-size: 13px; }
      .table-row:last-child { border-bottom: 0; }
      .subject { font-size: 14px; font-weight: 700; line-height: 1.3; }
      .snippet { margin-top: 3px; color: ${theme.muted}; font-size: 12px; line-height: 1.45; }
      .muted { color: ${theme.muted}; font-size: 12px; }
      .empty { padding: 18px 14px; color: ${theme.muted}; font-size: 14px; }
      @media (max-width: 720px) {
        .table-head, .table-row { grid-template-columns: minmax(220px, 1.8fr) minmax(120px, 1fr); }
        .table-head > :last-child, .table-row > :last-child { display: none; }
        .toolbar { flex-wrap:wrap; }
      }
    </style>
    <div class="shell">
      <section class="hero">
        <p class="eyebrow">Gmail</p>
        <h1>${mode === 'search' ? 'Search Results' : 'Mailbox'}</h1>
        <div class="toolbar">
          <div class="toolbar-main">
            <p class="subhead">${escapeHtml(mode === 'search' ? `Showing results for "${payload.query ?? ''}".` : 'Browse recent Gmail messages.')}</p>
            <div class="chips">
              <span class="chip">Estimate: ${escapeHtml(String(payload.resultSizeEstimate ?? messages.length))}</span>
              ${payload.query ? `<span class="chip">Query: ${escapeHtml(payload.query)}</span>` : ''}
              ${payload.labelIds && payload.labelIds.length > 0 ? `<span class="chip">Labels: ${escapeHtml(payload.labelIds.join(', '))}</span>` : ''}
              ${payload.includeMessageDetails ? '' : '<span class="chip">Compact mode</span>'}
              ${payload.nextPageToken ? '<span class="chip">More available</span>' : ''}
            </div>
          </div>
          <div class="toolbar-actions">
            <button id="refresh" ${isRefreshing ? 'disabled' : ''}>${isRefreshing ? 'Refreshing...' : 'Refresh'}</button>
          </div>
        </div>
      </section>
      <section class="panel">
        <div class="table-head">
          <div>Message</div>
          <div>Date</div>
          <div>From</div>
        </div>
        <div class="table-body">
          ${messages.length === 0 ? '<div class="empty">No messages matched this request.</div>' : messages.map((message) => `
            <div class="table-row">
              <div>
                <div class="subject">${escapeHtml(message.subject || message.snippet || message.id || 'Untitled message')}</div>
                <div class="snippet">${escapeHtml(message.snippet || (message.id ? `Message ID: ${message.id}` : 'No preview available'))}</div>
              </div>
              <div class="muted">${escapeHtml(formatDate(message.internalDate, message.date))}</div>
              <div class="muted">${escapeHtml(message.from || 'Unknown')}</div>
            </div>
          `).join('')}
        </div>
      </section>
    </div>
  `;

  bindRefresh();
  notifySizeChanged();
}

function bindRefresh() {
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
  if (currentPayload.messages) render(currentPayload);
};
void app.connect(new PostMessageTransport(window.parent, window.parent)).then(() => {
  applyHost();
});
