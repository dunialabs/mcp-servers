import { App, PostMessageTransport, applyDocumentTheme, applyHostFonts, applyHostStyleVariables } from '@modelcontextprotocol/ext-apps';

type Cell = string | number | boolean | null;

type RangePayload = {
  kind?: 'gsheets-range';
  spreadsheetId?: string | null;
  range?: string | null;
  majorDimension?: string | null;
  rowCount?: number;
  columnCount?: number;
  values?: Cell[][];
};

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing root element');

const app = new App({ name: 'sheets-range-view', version: '0.1.0' }, {}, { autoResize: true });
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

function formatCell(value: Cell): string {
  if (value === null) return '';
  return String(value);
}

function columnNumberToLetters(value: number): string {
  let current = value;
  let result = '';
  while (current > 0) {
    const remainder = (current - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    current = Math.floor((current - 1) / 26);
  }
  return result || 'A';
}

function parseStartColumn(range?: string | null): number {
  if (!range) return 1;
  const a1 = range.includes('!') ? range.split('!').pop() ?? range : range;
  const match = a1.match(/^([A-Z]+)(\d+)?(?::.*)?$/i);
  if (!match) return 1;
  const letters = match[1].toUpperCase();
  let value = 0;
  for (const char of letters) {
    value = value * 26 + (char.charCodeAt(0) - 64);
  }
  return value > 0 ? value : 1;
}

function render(payload: RangePayload) {
  const values = payload.values ?? [];
  const columns = payload.columnCount ?? values.reduce((max, row) => Math.max(max, row.length), 0);
  const startColumn = parseStartColumn(payload.range);
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
      h1, p { margin: 0; }
      h1 { font-size: 22px; line-height: 1.08; }
      .meta { margin-top: 6px; color: #5b6471; line-height: 1.4; font-size: 13px; }
      button { border: 0; border-radius: 999px; padding: 4px 10px; font: inherit; background: #18212f; color: white; cursor: pointer; min-width: 66px; font-size: 11px; }
      button:disabled { opacity: 0.65; cursor: default; }
      .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
      .chip { border-radius: 999px; background: #eef6ff; color: #1d4ed8; padding: 4px 8px; font-size: 11px; }
      .panel { overflow: hidden; }
      .grid-wrap { max-height: 560px; overflow: auto; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border-bottom: 1px solid rgba(24,33,47,0.06); padding: 6px 9px; vertical-align: top; text-align: left; }
      th { position: sticky; top: 0; background: #f8fbff; color: #667085; z-index: 1; }
      tbody tr:nth-child(odd) { background: rgba(248, 251, 255, 0.55); }
      .row-index { width: 52px; color: #667085; }
      .empty { padding: 18px 14px; color: #5b6471; font-size: 14px; }
    </style>
    <div class="shell">
      <section class="hero">
        <div class="hero-main">
          <p class="eyebrow">Google Sheets</p>
          <h1>Range Preview</h1>
          <p class="meta">${escapeHtml(payload.range || 'Unknown range')} · ${escapeHtml(payload.majorDimension || 'ROWS')}</p>
          <div class="chips">
            <span class="chip">Rows: ${escapeHtml(String(payload.rowCount ?? values.length))}</span>
            <span class="chip">Columns: ${escapeHtml(String(columns))}</span>
          </div>
        </div>
        <button id="refresh" ${isRefreshing ? 'disabled' : ''}>${isRefreshing ? 'Refreshing...' : 'Refresh'}</button>
      </section>
      <section class="panel">
        <div class="grid-wrap">
          ${values.length === 0 ? '<div class="empty">No values returned for this range.</div>' : `
            <table>
              <thead>
                <tr>
                  <th class="row-index">#</th>
                  ${Array.from({ length: columns }, (_, index) => `<th>${columnNumberToLetters(startColumn + index)}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${values.map((row, rowIndex) => `
                  <tr>
                    <td class="row-index">${rowIndex + 1}</td>
                    ${Array.from({ length: columns }, (_, colIndex) => `<td>${escapeHtml(formatCell(row[colIndex] ?? null))}</td>`).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
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
    render((window as unknown as { __payload?: RangePayload }).__payload ?? {});
    try {
      const result = await app.callServerTool({ name: 'gsheetsReadValues', arguments: currentArgs });
      render((result.structuredContent ?? {}) as RangePayload);
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
  const payload = (result.structuredContent ?? {}) as RangePayload;
  (window as unknown as { __payload?: RangePayload }).__payload = payload;
  render(payload);
};

app.onhostcontextchanged = () => applyHost();
app.connect(new PostMessageTransport(window.parent, window.parent)).then(applyHost);
