import { App, PostMessageTransport, applyDocumentTheme, applyHostFonts, applyHostStyleVariables } from '@modelcontextprotocol/ext-apps';

type Owner = {
  displayName?: string | null;
  emailAddress?: string | null;
};

type SpreadsheetItem = {
  spreadsheetId?: string | null;
  title?: string | null;
  spreadsheetUrl?: string | null;
  modifiedTime?: string | null;
  owners?: Owner[] | null;
};

type BrowserPayload = {
  kind?: 'gsheets-spreadsheet-browser';
  query?: string | null;
  pageSize?: number;
  totalResults?: number;
  nextPageToken?: string | null;
  spreadsheets?: SpreadsheetItem[];
};

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing root element');

const app = new App({ name: 'sheets-browser-view', version: '0.1.0' }, {}, { autoResize: true });
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

function ownerLabel(owners?: Owner[] | null): string {
  const names = (owners ?? [])
    .map((owner) => owner.displayName || owner.emailAddress)
    .filter((value): value is string => Boolean(value));
  return names.length > 0 ? names.join(', ') : 'Unknown';
}

function getTheme() {
  return isDarkTheme
    ? {
        title: '#e8f9ef',
        text: '#a8d8b8',
        muted: '#5a9a72',
        shellBg:
          'radial-gradient(circle at top left, rgba(52, 168, 83, 0.14), transparent 36%), linear-gradient(180deg, #061510 0%, #04100a 100%)',
        panelBg: 'rgba(6, 21, 12, 0.96)',
        panelBorder: 'rgba(52, 168, 83, 0.12)',
        shadow: '0 10px 24px rgba(0, 0, 0, 0.38)',
        accent: '#34A853',
        chipBg: '#061a0e',
        chipText: '#5dd47e',
        headText: '#5a9a72',
        rowBorder: 'rgba(52, 168, 83, 0.1)',
        link: '#34A853',
        buttonBg: '#e8f9ef',
        buttonText: '#061510',
      }
    : {
        title: '#0a2e1a',
        text: '#1a4a2e',
        muted: '#3a7a52',
        shellBg:
          'radial-gradient(circle at top left, rgba(15, 157, 88, 0.12), transparent 36%), linear-gradient(180deg, #f2fcf6 0%, #e8f9ef 100%)',
        panelBg: 'rgba(255, 255, 255, 0.93)',
        panelBorder: 'rgba(15, 157, 88, 0.12)',
        shadow: '0 8px 20px rgba(0, 50, 20, 0.06)',
        accent: '#0F9D58',
        chipBg: '#e8f9ef',
        chipText: '#0d6b3a',
        headText: '#5a9a72',
        rowBorder: 'rgba(15, 157, 88, 0.08)',
        link: '#0F9D58',
        buttonBg: '#0a2e1a',
        buttonText: '#ffffff',
      };
}

function render(payload: BrowserPayload) {
  currentPayload = payload;
  const spreadsheets = payload.spreadsheets ?? [];
  const t = getTheme();

  root.innerHTML = `
    <style>
      html, body { margin: 0; padding: 0; min-height: 0; }
      body { font-family: Georgia, serif; color: ${t.title}; background: transparent; padding: 0; }
      .shell {
        display: grid;
        gap: 12px;
        margin: 10px;
        padding: 10px;
        border-radius: 22px;
        background: ${t.shellBg};
      }
      .hero, .panel {
        background: ${t.panelBg};
        border: 1px solid ${t.panelBorder};
        border-radius: 18px;
        box-shadow: ${t.shadow};
      }
      .hero { padding: 12px; display: grid; gap: 8px; }
      .eyebrow { margin: 0; text-transform: uppercase; letter-spacing: 0.16em; font-size: 11px; color: ${t.accent}; }
      h1, p { margin: 0; }
      h1 { font-size: 22px; line-height: 1.08; color: ${t.accent}; }
      .toolbar {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: nowrap;
      }
      .toolbar-main { min-width: 0; display: grid; gap: 6px; }
      .toolbar-actions { display: flex; align-items: flex-end; flex: 0 0 auto; margin-left: auto; }
      .subhead { color: ${t.text}; font-size: 13px; line-height: 1.4; }
      .chips { display: flex; flex-wrap: wrap; gap: 6px; }
      .chip {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        background: ${t.chipBg};
        color: ${t.chipText};
        padding: 4px 8px;
        font-size: 11px;
      }
      button {
        border: 0;
        border-radius: 999px;
        padding: 4px 10px;
        font: inherit;
        background: ${t.buttonBg};
        color: ${t.buttonText};
        cursor: pointer;
        min-width: 66px;
        font-size: 11px;
      }
      button:disabled { opacity: 0.65; cursor: default; }
      @media (max-width: 640px) {
        .toolbar { flex-wrap: wrap; }
        .toolbar-actions { width: 100%; justify-content: flex-end; margin-left: 0; }
      }
      .panel { overflow: hidden; }
      .table-head, .table-row {
        display: grid;
        grid-template-columns: minmax(220px, 2.6fr) minmax(180px, 1.4fr) minmax(140px, 1.2fr);
        gap: 12px;
        align-items: center;
      }
      .table-head {
        padding: 9px 12px;
        border-bottom: 1px solid ${t.rowBorder};
        color: ${t.headText};
        font-size: 12px;
      }
      .table-body { max-height: 520px; overflow: auto; }
      .table-row {
        padding: 7px 12px;
        border-bottom: 1px solid ${t.rowBorder};
        font-size: 13px;
      }
      .table-row:last-child { border-bottom: 0; }
      .name-title { font-size: 14px; font-weight: 700; line-height: 1.3; color: ${t.title}; }
      .name-link {
        display: inline-flex;
        margin-top: 3px;
        color: ${t.link};
        text-decoration: none;
        font-size: 12px;
        font-weight: 600;
      }
      .name-link:hover { text-decoration: underline; }
      .muted { color: ${t.text}; font-size: 12px; }
      .empty { padding: 18px 14px; color: ${t.text}; font-size: 14px; }
      .note { color: ${t.muted}; font-size: 11px; line-height: 1.45; }
    </style>
    <div class="shell">
      <section class="hero">
        <p class="eyebrow">Google Sheets</p>
        <h1>Spreadsheet Browser</h1>
        <div class="toolbar">
          <div class="toolbar-main">
            <p class="subhead">Browse spreadsheet files with owner and update context.</p>
            <div class="chips">
              <span class="chip">Results: ${escapeHtml(String(payload.totalResults ?? spreadsheets.length))}</span>
              ${payload.query ? `<span class="chip">Query: ${escapeHtml(payload.query)}</span>` : ''}
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
          <div>Spreadsheet</div>
          <div>Updated</div>
          <div>Owner</div>
        </div>
        <div class="table-body">
          ${
            spreadsheets.length === 0
              ? '<div class="empty">No spreadsheets matched this query.</div>'
              : spreadsheets
                  .map(
                    (sheet) => `
            <div class="table-row">
              <div>
                <div class="name-title">📊 ${escapeHtml(sheet.title || 'Untitled spreadsheet')}</div>
                ${sheet.spreadsheetUrl ? `<a class="name-link" href="${escapeHtml(sheet.spreadsheetUrl)}" target="_blank" rel="noreferrer">Open in Sheets</a>` : ''}
              </div>
              <div class="muted">${escapeHtml(formatDate(sheet.modifiedTime))}</div>
              <div class="muted">${escapeHtml(ownerLabel(sheet.owners))}</div>
            </div>
          `,
                  )
                  .join('')
          }
        </div>
      </section>
      <p class="note">Claude may block direct left-click navigation. If needed, use right-click and open the link in your browser.</p>
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
      const result = await app.callServerTool({ name: 'gsheetsListSpreadsheets', arguments: currentArgs });
      render((result.structuredContent ?? {}) as BrowserPayload);
    } finally {
      isRefreshing = false;
      notifySizeChanged();
    }
  });
}

app.ontoolinput = ({ arguments: args }) => {
  currentArgs = args ?? {};
};

app.ontoolresult = (result) => {
  render((result.structuredContent ?? {}) as BrowserPayload);
};

app.onhostcontextchanged = () => {
  applyHost();
  if (currentPayload.spreadsheets) render(currentPayload);
};
void app.connect(new PostMessageTransport(window.parent, window.parent)).then(() => {
  applyHost();
});
