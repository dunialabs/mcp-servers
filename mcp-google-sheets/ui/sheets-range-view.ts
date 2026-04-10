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
        title: '#f5f5f5',
        text: '#d4d4d8',
        muted: '#a1a1aa',
        shellBg:
          'radial-gradient(circle at top left, rgba(34, 197, 94, 0.14), transparent 36%), linear-gradient(180deg, #0f172a 0%, #0b1a0d 100%)',
        panelBg: 'rgba(24, 24, 27, 0.94)',
        panelBorder: 'rgba(34, 197, 94, 0.12)',
        shadow: '0 10px 24px rgba(2, 6, 23, 0.38)',
        accent: '#4ade80',
        chipBg: '#052e16',
        chipText: '#4ade80',
        headText: '#94a3b8',
        rowBorder: 'rgba(34, 197, 94, 0.1)',
        buttonBg: '#f5f5f5',
        buttonText: '#111111',
        thBg: 'rgba(24, 24, 27, 0.98)',
        tdStripeBg: 'rgba(5, 46, 22, 0.25)',
        rowIndexColor: '#94a3b8',
      }
    : {
        title: '#14200d',
        text: '#5b6471',
        muted: '#667085',
        shellBg:
          'radial-gradient(circle at top left, rgba(220, 252, 231, 0.85), transparent 35%), linear-gradient(180deg, #f7fdf9 0%, #f0fdf4 100%)',
        panelBg: 'rgba(255,255,255,0.93)',
        panelBorder: 'rgba(20, 83, 45, 0.1)',
        shadow: '0 8px 20px rgba(15, 23, 42, 0.05)',
        accent: '#15803d',
        chipBg: '#f0fdf4',
        chipText: '#15803d',
        headText: '#667085',
        rowBorder: 'rgba(20, 83, 45, 0.07)',
        buttonBg: '#14200d',
        buttonText: '#ffffff',
        thBg: '#f7fdf9',
        tdStripeBg: 'rgba(240, 253, 244, 0.55)',
        rowIndexColor: '#667085',
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
app.connect(new PostMessageTransport(window.parent, window.parent)).then(applyHost);
