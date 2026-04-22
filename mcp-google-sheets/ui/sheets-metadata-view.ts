import { App, PostMessageTransport, applyDocumentTheme, applyHostFonts, applyHostStyleVariables } from '@modelcontextprotocol/ext-apps';

type SheetTab = {
  sheetId?: number | null;
  title?: string | null;
  index?: number | null;
  sheetType?: string | null;
  rowCount?: number | null;
  columnCount?: number | null;
};

type SpreadsheetSummary = {
  spreadsheetId?: string | null;
  spreadsheetUrl?: string | null;
  title?: string | null;
  locale?: string | null;
  timeZone?: string | null;
  sheetCount?: number | null;
  sheets?: SheetTab[];
};

type MetadataPayload = {
  kind?: 'gsheets-spreadsheet-metadata';
  spreadsheet?: SpreadsheetSummary;
};

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing root element');

const app = new App({ name: 'sheets-metadata-view', version: '0.1.0' }, {}, { autoResize: true });
let currentArgs: Record<string, unknown> = {};
let currentPayload: MetadataPayload = {};
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

function render(payload: MetadataPayload) {
  currentPayload = payload;
  const spreadsheet = payload.spreadsheet;
  const sheets = spreadsheet?.sheets ?? [];
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
      .subhead { color: ${t.text}; font-size: 13px; line-height: 1.4; }
      .toolbar-actions { display: flex; align-items: flex-end; flex: 0 0 auto; margin-left: auto; }
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
      .panel-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 9px 12px;
        border-bottom: 1px solid ${t.rowBorder};
        flex-wrap: wrap;
      }
      .label { text-transform: uppercase; letter-spacing: 0.14em; font-size: 11px; color: ${t.accent}; }
      .sheet-link {
        color: ${t.link};
        text-decoration: none;
        font-size: 12px;
        font-weight: 600;
      }
      .sheet-link:hover { text-decoration: underline; }
      .table-head, .sheet-row {
        display: grid;
        grid-template-columns: minmax(200px, 2.4fr) minmax(80px, 0.8fr) minmax(80px, 0.8fr) minmax(80px, 0.7fr);
        gap: 12px;
        align-items: center;
      }
      .table-head {
        padding: 9px 12px;
        border-bottom: 1px solid ${t.rowBorder};
        color: ${t.headText};
        font-size: 12px;
      }
      .table-body { max-height: 480px; overflow: auto; }
      .sheet-row {
        padding: 7px 12px;
        border-bottom: 1px solid ${t.rowBorder};
        font-size: 13px;
      }
      .sheet-row:last-child { border-bottom: 0; }
      .sheet-title { font-size: 14px; font-weight: 700; line-height: 1.3; color: ${t.title}; }
      .muted { color: ${t.text}; font-size: 12px; }
      .empty { padding: 18px 14px; color: ${t.text}; font-size: 14px; }
    </style>
    <div class="shell">
      <section class="hero">
        <p class="eyebrow">Google Sheets</p>
        <h1>${escapeHtml(spreadsheet?.title || 'Untitled spreadsheet')}</h1>
        <div class="toolbar">
          <div class="toolbar-main">
            <p class="subhead">Spreadsheet structure, sheet tabs, and locale settings.</p>
            <div class="chips">
              <span class="chip">Sheets: ${escapeHtml(String(spreadsheet?.sheetCount ?? sheets.length))}</span>
              <span class="chip">Locale: ${escapeHtml(spreadsheet?.locale || 'Unknown')}</span>
              <span class="chip">Time zone: ${escapeHtml(spreadsheet?.timeZone || 'Unknown')}</span>
            </div>
          </div>
          <div class="toolbar-actions">
            <button id="refresh" ${isRefreshing ? 'disabled' : ''}>${isRefreshing ? 'Refreshing...' : 'Refresh'}</button>
          </div>
        </div>
      </section>
      <section class="panel">
        <div class="panel-head">
          <div class="label">Sheets</div>
          ${spreadsheet?.spreadsheetUrl ? `<a class="sheet-link" href="${escapeHtml(spreadsheet.spreadsheetUrl)}" target="_blank" rel="noreferrer">Open in Sheets</a>` : ''}
        </div>
        <div class="table-head">
          <div>Sheet</div>
          <div>Rows</div>
          <div>Columns</div>
          <div>Type</div>
        </div>
        <div class="table-body">
          ${
            sheets.length === 0
              ? '<div class="empty">No sheet tabs found.</div>'
              : sheets
                  .map(
                    (sheet) => `
            <div class="sheet-row">
              <div>
                <div class="sheet-title">${escapeHtml(sheet.title || 'Untitled sheet')}</div>
                <div class="muted">Sheet ID: ${escapeHtml(String(sheet.sheetId ?? 'N/A'))}</div>
              </div>
              <div class="muted">${escapeHtml(String(sheet.rowCount ?? '—'))}</div>
              <div class="muted">${escapeHtml(String(sheet.columnCount ?? '—'))}</div>
              <div class="muted">${escapeHtml(sheet.sheetType || 'GRID')}</div>
            </div>
          `,
                  )
                  .join('')
          }
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
      const result = await app.callServerTool({ name: 'gsheetsGetSpreadsheet', arguments: currentArgs });
      isRefreshing = false;
      render((result.structuredContent ?? {}) as MetadataPayload);
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
  render((result.structuredContent ?? {}) as MetadataPayload);
};

app.onhostcontextchanged = () => {
  applyHost();
  if (currentPayload.spreadsheet) render(currentPayload);
};
void app.connect(new PostMessageTransport(window.parent, window.parent)).then(() => {
  applyHost();
});
