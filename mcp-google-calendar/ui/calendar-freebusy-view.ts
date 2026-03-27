import { App, PostMessageTransport, applyDocumentTheme, applyHostFonts, applyHostStyleVariables } from '@modelcontextprotocol/ext-apps';

type BusySlot = {
  start?: string | null;
  end?: string | null;
};

type CalendarBusySummary = {
  calendarId: string;
  busy: BusySlot[];
  busyCount: number;
  errors?: unknown;
};

type ToolInput = {
  calendarIds?: string[];
  timeMin?: string;
  timeMax?: string;
  timeZone?: string;
};

type StructuredPayload = {
  timeMin?: string;
  timeMax?: string;
  timeZone?: string;
  calendars?: CalendarBusySummary[];
};

const subhead = document.querySelector<HTMLParagraphElement>('#subhead');
const statusEl = document.querySelector<HTMLElement>('#status');
const summaryEl = document.querySelector<HTMLElement>('#summary');
const lanesEl = document.querySelector<HTMLElement>('#lanes');
const refreshButton = document.querySelector<HTMLButtonElement>('#refresh');

if (!subhead || !statusEl || !summaryEl || !lanesEl || !refreshButton) {
  throw new Error('Missing required DOM elements for calendar freebusy view.');
}

const app = new App(
  { name: 'google-calendar-freebusy-view', version: '0.1.0' },
  { tools: { listChanged: false } },
  { autoResize: true }
);

let currentInput: ToolInput = {};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatDate(value?: string | null): string {
  if (!value) return 'N/A';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function setStatus(message: string, variant: 'info' | 'error' | 'success' = 'info') {
  statusEl.textContent = message;
  statusEl.dataset.variant = variant;
}

function applyHostContext() {
  const hostContext = app.getHostContext();
  if (!hostContext) return;
  if (hostContext.theme) applyDocumentTheme(hostContext.theme);
  if (hostContext.styles?.variables) applyHostStyleVariables(hostContext.styles.variables);
  if (hostContext.styles?.css?.fonts) applyHostFonts(hostContext.styles.css.fonts);
}

function renderSummary(payload: StructuredPayload | null) {
  const calendars = payload?.calendars ?? [];
  const totalBusy = calendars.reduce((sum, item) => sum + (item.busyCount ?? 0), 0);
  const cards = [
    ['Calendars', String(calendars.length)],
    ['Busy Slots', String(totalBusy)],
    ['Timezone', payload?.timeZone ?? currentInput.timeZone ?? 'UTC'],
    ['Range', payload?.timeMin && payload?.timeMax ? `${payload.timeMin} -> ${payload.timeMax}` : 'Not set'],
  ];

  summaryEl.innerHTML = cards
    .map(
      ([label, value]) => `
        <article class="summary-card">
          <p class="summary-label">${escapeHtml(label)}</p>
          <p class="summary-value">${escapeHtml(value)}</p>
        </article>
      `
    )
    .join('');
}

function renderLanes(payload: StructuredPayload | null) {
  const calendars = payload?.calendars ?? [];

  if (calendars.length === 0) {
    lanesEl.innerHTML = `
      <article class="empty-state">
        <h2>No calendars returned</h2>
        <p>Try another time window or calendar selection.</p>
      </article>
    `;
    return;
  }

  lanesEl.innerHTML = calendars
    .map(
      (calendar) => `
        <article class="lane-card">
          <div class="lane-header">
            <div>
              <p class="lane-label">Calendar</p>
              <h2>${escapeHtml(calendar.calendarId)}</h2>
            </div>
            <p class="lane-count">${calendar.busyCount} busy block(s)</p>
          </div>
          ${
            calendar.busy.length === 0
              ? '<p class="lane-empty">No busy blocks in this time range.</p>'
              : `<div class="busy-list">
                  ${calendar.busy
                    .map(
                      (slot) => `
                        <div class="busy-block">
                          <p class="busy-label">Busy</p>
                          <p class="busy-time">${escapeHtml(formatDate(slot.start))}</p>
                          <p class="busy-time">${escapeHtml(formatDate(slot.end))}</p>
                        </div>
                      `
                    )
                    .join('')}
                </div>`
          }
        </article>
      `
    )
    .join('');
}

function renderPayload(payload: StructuredPayload | null) {
  renderSummary(payload);
  renderLanes(payload);
}

app.ontoolinput = ({ arguments: args }) => {
  currentInput = {
    calendarIds: Array.isArray(args?.calendarIds) ? (args?.calendarIds.filter((value): value is string => typeof value === 'string')) : [],
    timeMin: typeof args?.timeMin === 'string' ? args.timeMin : undefined,
    timeMax: typeof args?.timeMax === 'string' ? args.timeMax : undefined,
    timeZone: typeof args?.timeZone === 'string' ? args.timeZone : undefined,
  };

  subhead.textContent = `${currentInput.calendarIds?.length ?? 0} calendar(s) selected`;
  setStatus('Loading free/busy data...', 'info');
};

app.ontoolresult = (result) => {
  if (result.isError) {
    const errorText = result.content?.find((item) => item.type === 'text' && 'text' in item)?.text ?? 'Tool execution failed.';
    setStatus(errorText, 'error');
    return;
  }

  const payload = (result.structuredContent ?? null) as StructuredPayload | null;
  renderPayload(payload);
  setStatus(`Loaded ${(payload?.calendars ?? []).length} calendar lane(s).`, 'success');
};

app.onhostcontextchanged = () => applyHostContext();

refreshButton.addEventListener('click', async () => {
  refreshButton.disabled = true;
  setStatus('Refreshing free/busy data...', 'info');

  try {
    const result = await app.callServerTool({
      name: 'gcalendarGetFreeBusy',
      arguments: currentInput,
    });

    if (result.isError) {
      const errorText = result.content?.find((item) => item.type === 'text' && 'text' in item)?.text ?? 'Refresh failed.';
      setStatus(errorText, 'error');
      return;
    }

    renderPayload((result.structuredContent ?? null) as StructuredPayload | null);
    setStatus(`Loaded ${(((result.structuredContent as StructuredPayload | null)?.calendars) ?? []).length} calendar lane(s).`, 'success');
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Refresh failed.', 'error');
  } finally {
    refreshButton.disabled = false;
  }
});

const styles = document.createElement('style');
styles.textContent = `
  :root {
    color-scheme: light dark;
    --surface: color-mix(in srgb, var(--color-background-secondary, #eef3f9) 88%, white);
    --surface-strong: color-mix(in srgb, var(--color-background-primary, #ffffff) 95%, black);
    --border: var(--color-border-secondary, rgba(15, 23, 42, 0.12));
    --accent: #0f766e;
    --busy: #f59e0b;
    --busy-strong: #d97706;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 24px;
    font-family: var(--font-sans, "Avenir Next", "Segoe UI", sans-serif);
    background: linear-gradient(180deg, var(--color-background-primary, #ffffff), var(--surface));
    color: var(--color-text-primary, #0f172a);
  }
  #app { display: grid; gap: 16px; }
  .hero, .status, .summary-card, .lane-card, .empty-state {
    background: var(--surface-strong);
    border: 1px solid var(--border);
    border-radius: 24px;
    box-shadow: 0 10px 35px rgba(15, 23, 42, 0.08);
  }
  .hero {
    padding: 24px;
    display: flex;
    justify-content: space-between;
    align-items: start;
    gap: 16px;
  }
  .eyebrow {
    margin: 0 0 10px;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    font-size: 12px;
    color: var(--accent);
  }
  h1, h2, p { margin: 0; }
  h1 { font-size: 48px; line-height: 0.98; margin-bottom: 10px; }
  #subhead { color: color-mix(in srgb, var(--color-text-primary, #0f172a) 80%, transparent); font-size: 18px; }
  .status { padding: 16px 20px; }
  .status[data-variant="error"] { color: var(--color-text-danger, #b91c1c); }
  .status[data-variant="success"] { color: var(--color-text-success, #166534); }
  .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
  .summary-card { padding: 16px 18px; }
  .summary-label { text-transform: uppercase; letter-spacing: 0.16em; font-size: 12px; color: color-mix(in srgb, var(--color-text-primary, #0f172a) 55%, transparent); margin-bottom: 10px; }
  .summary-value { font-size: 20px; line-height: 1.3; }
  .lanes { display: grid; gap: 12px; }
  .lane-card { padding: 18px 20px; display: grid; gap: 16px; }
  .lane-header { display: flex; justify-content: space-between; gap: 16px; align-items: start; }
  .lane-label { text-transform: uppercase; letter-spacing: 0.14em; font-size: 12px; color: color-mix(in srgb, var(--color-text-primary, #0f172a) 55%, transparent); margin-bottom: 8px; }
  .lane-header h2 { font-size: 24px; }
  .lane-count { color: color-mix(in srgb, var(--color-text-primary, #0f172a) 70%, transparent); }
  .busy-list { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
  .busy-block {
    padding: 14px 16px;
    border-radius: 18px;
    background: linear-gradient(180deg, color-mix(in srgb, var(--busy) 16%, white), color-mix(in srgb, var(--busy) 10%, white));
    border: 1px solid color-mix(in srgb, var(--busy-strong) 24%, white);
  }
  .busy-label {
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-size: 11px;
    color: var(--busy-strong);
    margin-bottom: 10px;
  }
  .busy-time { font-weight: 600; line-height: 1.45; }
  .lane-empty { color: color-mix(in srgb, var(--color-text-primary, #0f172a) 65%, transparent); }
  .empty-state { padding: 24px; }
  button {
    border: 0;
    border-radius: 999px;
    background: color-mix(in srgb, var(--accent) 88%, black);
    color: white;
    font: inherit;
    padding: 12px 18px;
    cursor: pointer;
  }
  button:disabled { opacity: 0.65; cursor: default; }
  @media (max-width: 900px) {
    body { padding: 16px; }
    h1 { font-size: 38px; }
    .lane-header { display: grid; }
  }
`;
document.head.appendChild(styles);

async function connect() {
  setStatus('Connecting to host...', 'info');
  await app.connect(new PostMessageTransport(window.parent, window.parent));
  applyHostContext();
  setStatus('Connected. Waiting for tool result...', 'info');
}

void connect();
