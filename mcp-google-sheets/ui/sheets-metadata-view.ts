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
let isRefreshing = false;

function applyHost() {
  const context = app.getHostContext();
  if (context?.theme) applyDocumentTheme(context.theme);
  if (context?.styles?.variables) applyHostStyleVariables(context.styles.variables);
  if (context?.styles?.css?.fonts) applyHostFonts(context.styles.css.fonts);
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

function render(payload: MetadataPayload) {
  const spreadsheet = payload.spreadsheet;
  const sheets = spreadsheet?.sheets ?? [];
  root.innerHTML = `
    <style>
      html, body { margin: 0; padding: 0; min-height: 0; }
      body {
        font-family: Georgia, serif;
        color: #18212f;
        background:
          radial-gradient(circle at top left, rgba(231, 244, 255, 0.9), transparent 35%),
          linear-gradient(180deg, #f8fbff 0%, #fffdf8 100%);
        padding: 14px;
      }
      .shell { display: grid; gap: 12px; }
      .hero, .panel {
        background: rgba(255,255,255,0.93);
        border: 1px solid rgba(24,33,47,0.1);
        border-radius: 18px;
        box-shadow: 0 14px 35px rgba(15, 23, 42, 0.08);
      }
      .hero { padding: 12px; display: flex; justify-content: space-between; gap: 12px; align-items: flex-end; }
      .hero-main { min-width: 0; }
      .eyebrow { margin: 0 0 6px; text-transform: uppercase; letter-spacing: 0.16em; font-size: 11px; color: #0f766e; }
      h1, h2, p { margin: 0; }
      h1 { font-size: 22px; line-height: 1.08; }
      .meta { margin-top: 6px; color: #5b6471; line-height: 1.4; font-size: 13px; }
      button { border: 0; border-radius: 999px; padding: 4px 10px; font: inherit; background: #18212f; color: white; cursor: pointer; min-width: 66px; font-size: 11px; }
      button:disabled { opacity: 0.65; cursor: default; }
      .panel { padding: 12px; }
      .label { text-transform: uppercase; letter-spacing: 0.14em; font-size: 11px; color: #667085; margin-bottom: 6px; }
      .value { font-size: 18px; line-height: 1.2; }
      .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
      .chip { border-radius: 999px; background: #eef6ff; color: #1d4ed8; padding: 4px 8px; font-size: 11px; }
      .panel { display: grid; gap: 10px; }
      .sheet-row {
        display: grid;
        grid-template-columns: minmax(200px, 2.4fr) minmax(120px, 1fr) minmax(120px, 1fr) minmax(100px, 0.8fr);
        gap: 12px;
        align-items: center;
        padding: 7px 0;
        border-bottom: 1px solid rgba(24,33,47,0.06);
        font-size: 13px;
      }
      .sheet-row:last-child { border-bottom: 0; }
      .head { color: #667085; font-size: 12px; }
      .link {
        display: inline-flex;
        align-items: center;
        color: #14532d;
        text-decoration: none;
        font-weight: 600;
        font-size: 13px;
      }
      .link:hover { text-decoration: underline; }
      .muted { color: #5b6471; }
    </style>
    <div class="shell">
      <section class="hero">
        <div class="hero-main">
          <p class="eyebrow">Google Sheets</p>
          <h1>${escapeHtml(spreadsheet?.title || 'Untitled spreadsheet')}</h1>
          <div class="chips">
            <span class="chip">Sheets: ${escapeHtml(String(spreadsheet?.sheetCount ?? sheets.length))}</span>
            <span class="chip">Locale: ${escapeHtml(spreadsheet?.locale || 'Unknown')}</span>
            <span class="chip">Time zone: ${escapeHtml(spreadsheet?.timeZone || 'Unknown')}</span>
          </div>
          ${spreadsheet?.spreadsheetUrl ? `<p class="meta"><a class="link" href="${escapeHtml(spreadsheet.spreadsheetUrl)}" target="_blank" rel="noreferrer">Open in Sheets</a></p>` : ''}
        </div>
        <button id="refresh" ${isRefreshing ? 'disabled' : ''}>${isRefreshing ? 'Refreshing...' : 'Refresh'}</button>
      </section>
      <section class="panel">
        <div class="sheet-row head"><div>Sheet</div><div>Rows</div><div>Columns</div><div>Type</div></div>
        ${sheets.map((sheet) => `
          <div class="sheet-row">
            <div><strong>${escapeHtml(sheet.title || 'Untitled sheet')}</strong><div class="muted">Sheet ID: ${escapeHtml(String(sheet.sheetId ?? 'N/A'))}</div></div>
            <div>${escapeHtml(String(sheet.rowCount ?? '—'))}</div>
            <div>${escapeHtml(String(sheet.columnCount ?? '—'))}</div>
            <div>${escapeHtml(sheet.sheetType || 'GRID')}</div>
          </div>
        `).join('')}
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
    render((window as unknown as { __payload?: MetadataPayload }).__payload ?? {});
    try {
      const result = await app.callServerTool({ name: 'gsheetsGetSpreadsheet', arguments: currentArgs });
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
  const payload = (result.structuredContent ?? {}) as MetadataPayload;
  (window as unknown as { __payload?: MetadataPayload }).__payload = payload;
  render(payload);
};

app.onhostcontextchanged = () => applyHost();
app.connect(new PostMessageTransport(window.parent, window.parent)).then(applyHost);
