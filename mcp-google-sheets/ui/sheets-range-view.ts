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
let currentPayload: RangePayload = {};
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
        buttonBg: '#e8f9ef',
        buttonText: '#061510',
        thBg: 'rgba(4, 14, 8, 0.98)',
        tdStripeBg: 'rgba(6, 26, 14, 0.35)',
        rowIndexColor: '#5a9a72',
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
        buttonBg: '#0a2e1a',
        buttonText: '#ffffff',
        thBg: '#f2fcf6',
        tdStripeBg: 'rgba(232, 249, 239, 0.45)',
        rowIndexColor: '#5a9a72',
      };
}

function render(payload: RangePayload) {
  currentPayload = payload;
  const values = payload.values ?? [];
  const columns = payload.columnCount ?? values.reduce((max, row) => Math.max(max, row.length), 0);
  const startColumn = parseStartColumn(payload.range);
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
      .grid-wrap { max-height: 560px; overflow: auto; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td {
        border-bottom: 1px solid ${t.rowBorder};
        padding: 6px 9px;
        vertical-align: top;
        text-align: left;
        color: ${t.text};
      }
      th {
        position: sticky;
        top: 0;
        background: ${t.thBg};
        color: ${t.headText};
        z-index: 1;
        font-weight: 600;
      }
      tbody tr:nth-child(odd) { background: ${t.tdStripeBg}; }
      .row-index { width: 52px; color: ${t.rowIndexColor}; }
      .empty { padding: 18px 14px; color: ${t.text}; font-size: 14px; }
    </style>
    <div class="shell">
      <section class="hero">
        <p class="eyebrow">Google Sheets</p>
        <h1>Range Preview</h1>
        <div class="toolbar">
          <div class="toolbar-main">
            <p class="subhead">${escapeHtml(payload.range || 'Unknown range')} · ${escapeHtml(payload.majorDimension || 'ROWS')}</p>
            <div class="chips">
              <span class="chip">Rows: ${escapeHtml(String(payload.rowCount ?? values.length))}</span>
              <span class="chip">Columns: ${escapeHtml(String(columns))}</span>
            </div>
          </div>
          <div class="toolbar-actions">
            <button id="refresh" ${isRefreshing ? 'disabled' : ''}>${isRefreshing ? 'Refreshing...' : 'Refresh'}</button>
          </div>
        </div>
      </section>
      <section class="panel">
        <div class="grid-wrap">
          ${
            values.length === 0
              ? '<div class="empty">No values returned for this range.</div>'
              : `
            <table>
              <thead>
                <tr>
                  <th class="row-index">#</th>
                  ${Array.from({ length: columns }, (_, index) => `<th>${columnNumberToLetters(startColumn + index)}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${values
                  .map(
                    (row, rowIndex) => `
                  <tr>
                    <td class="row-index">${rowIndex + 1}</td>
                    ${Array.from({ length: columns }, (_, colIndex) => `<td>${escapeHtml(formatCell(row[colIndex] ?? null))}</td>`).join('')}
                  </tr>
                `,
                  )
                  .join('')}
              </tbody>
            </table>
          `
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
  render((result.structuredContent ?? {}) as RangePayload);
};

app.onhostcontextchanged = () => {
  applyHost();
  if (currentPayload.range || currentPayload.values) render(currentPayload);
};
void app.connect(new PostMessageTransport(window.parent, window.parent)).then(() => {
  applyHost();
});
