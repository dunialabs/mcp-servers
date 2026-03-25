import { App, PostMessageTransport, applyDocumentTheme, applyHostFonts, applyHostStyleVariables } from '@modelcontextprotocol/ext-apps';

type EventRecord = {
  id?: string | null;
  summary?: string | null;
  description?: string | null;
  location?: string | null;
  start?: string | null;
  end?: string | null;
  status?: string | null;
  htmlLink?: string | null;
};

type ToolInput = {
  calendarId?: string;
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
  orderBy?: 'startTime' | 'updated';
};

type StructuredPayload = {
  calendarId?: string;
  totalResults?: number;
  timeMin?: string | null;
  timeMax?: string | null;
  orderBy?: string;
  events?: EventRecord[];
};

const appRoot = document.querySelector<HTMLDivElement>('#app');
const subhead = document.querySelector<HTMLParagraphElement>('#subhead');
const statusEl = document.querySelector<HTMLElement>('#status');
const summaryEl = document.querySelector<HTMLElement>('#summary');
const eventsEl = document.querySelector<HTMLElement>('#events');
const refreshButton = document.querySelector<HTMLButtonElement>('#refresh');

if (!appRoot || !subhead || !statusEl || !summaryEl || !eventsEl || !refreshButton) {
  throw new Error('Missing required DOM elements for calendar events view.');
}

const app = new App(
  { name: 'google-calendar-events-view', version: '0.1.0' },
  { tools: { listChanged: false } },
  { autoResize: true }
);

let currentInput: ToolInput = {};
let currentPayload: StructuredPayload | null = null;

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatDate(value?: string | null): string {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function setStatus(message: string, variant: 'info' | 'error' | 'success' = 'info') {
  statusEl.textContent = message;
  statusEl.dataset.variant = variant;
}

function renderSummary(payload: StructuredPayload | null) {
  if (!payload) {
    summaryEl.innerHTML = '';
    return;
  }

  const cards = [
    ['Calendar', payload.calendarId ?? currentInput.calendarId ?? 'primary'],
    ['Events', String(payload.totalResults ?? 0)],
    ['Order', payload.orderBy ?? currentInput.orderBy ?? 'startTime'],
    ['Range', payload.timeMin || payload.timeMax ? `${payload.timeMin ?? '...'} -> ${payload.timeMax ?? '...'}` : 'Open range'],
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

function renderEvents(payload: StructuredPayload | null) {
  const events = payload?.events ?? [];

  if (events.length === 0) {
    eventsEl.innerHTML = `
      <article class="empty-state">
        <h2>No events found</h2>
        <p>Try another time window or calendar.</p>
      </article>
    `;
    return;
  }

  eventsEl.innerHTML = events
    .map(
      (event) => `
        <article class="event-card">
          <div class="event-main">
            <p class="event-time">${escapeHtml(formatDate(event.start))} - ${escapeHtml(formatDate(event.end))}</p>
            <h2>${escapeHtml(event.summary ?? 'Untitled event')}</h2>
            <p class="event-meta">Status: ${escapeHtml(event.status ?? 'unknown')}</p>
            ${event.location ? `<p class="event-meta">Location: ${escapeHtml(event.location)}</p>` : ''}
            ${event.description ? `<p class="event-description">${escapeHtml(event.description)}</p>` : ''}
          </div>
          <div class="event-side">
            ${event.htmlLink ? `<a href="${escapeHtml(event.htmlLink)}" target="_blank" rel="noreferrer">Open in Google Calendar</a>` : ''}
            <p class="event-id">ID: ${escapeHtml(event.id ?? 'N/A')}</p>
          </div>
        </article>
      `
    )
    .join('');
}

function renderPayload(payload: StructuredPayload | null) {
  currentPayload = payload;
  renderSummary(payload);
  renderEvents(payload);
}

function applyHostContext() {
  const hostContext = app.getHostContext();
  if (!hostContext) {
    return;
  }

  if (hostContext.theme) {
    applyDocumentTheme(hostContext.theme);
  }

  if (hostContext.styles?.variables) {
    applyHostStyleVariables(hostContext.styles.variables);
  }

  if (hostContext.styles?.css?.fonts) {
    applyHostFonts(hostContext.styles.css.fonts);
  }
}

app.ontoolinput = ({ arguments: args }) => {
  currentInput = {
    calendarId: typeof args?.calendarId === 'string' ? args.calendarId : 'primary',
    timeMin: typeof args?.timeMin === 'string' ? args.timeMin : undefined,
    timeMax: typeof args?.timeMax === 'string' ? args.timeMax : undefined,
    maxResults: typeof args?.maxResults === 'number' ? args.maxResults : undefined,
    orderBy: args?.orderBy === 'updated' ? 'updated' : 'startTime',
  };

  subhead.textContent = `Calendar: ${currentInput.calendarId ?? 'primary'}`;
  setStatus('Loading events...', 'info');
};

app.ontoolresult = (result) => {
  if (result.isError) {
    const errorText =
      result.content?.find((item) => item.type === 'text' && 'text' in item)?.text ??
      'Tool execution failed.';
    setStatus(errorText, 'error');
    return;
  }

  const payload = (result.structuredContent ?? null) as StructuredPayload | null;
  renderPayload(payload);
  setStatus(`Loaded ${payload?.totalResults ?? 0} event(s).`, 'success');
};

app.onhostcontextchanged = () => {
  applyHostContext();
};

refreshButton.addEventListener('click', async () => {
  refreshButton.disabled = true;
  setStatus('Refreshing events...', 'info');

  try {
    const result = await app.callServerTool({
      name: 'gcalendarListEvents',
      arguments: currentInput,
    });

    if (result.isError) {
      const errorText =
        result.content?.find((item) => item.type === 'text' && 'text' in item)?.text ??
        'Refresh failed.';
      setStatus(errorText, 'error');
      return;
    }

    renderPayload((result.structuredContent ?? null) as StructuredPayload | null);
    setStatus(`Loaded ${((result.structuredContent as StructuredPayload | null)?.totalResults) ?? 0} event(s).`, 'success');
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Refresh failed.', 'error');
  } finally {
    refreshButton.disabled = false;
  }
});

async function connect() {
  setStatus('Connecting to host...', 'info');

  await app.connect(new PostMessageTransport(window.parent, window.parent));
  applyHostContext();

  const hostContext = app.getHostContext();
  const toolName = hostContext?.toolInfo?.tool?.name ?? 'gcalendarListEvents';
  subhead.textContent = `Tool: ${toolName}`;
  setStatus('Connected. Waiting for tool result...', 'info');
}

const styles = document.createElement('style');
styles.textContent = `
  :root {
    color-scheme: light dark;
    --surface: color-mix(in srgb, var(--color-background-secondary, #eef3f9) 85%, white);
    --surface-strong: color-mix(in srgb, var(--color-background-primary, #ffffff) 92%, black);
    --border: var(--color-border-secondary, rgba(15, 23, 42, 0.12));
    --accent: var(--color-text-info, #0f766e);
    --danger: var(--color-text-danger, #b91c1c);
    --success: var(--color-text-success, #166534);
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    padding: 24px;
    font-family: var(--font-sans, "Iowan Old Style", "Palatino Linotype", serif);
    background:
      radial-gradient(circle at top left, rgba(15, 118, 110, 0.12), transparent 28%),
      linear-gradient(180deg, var(--color-background-primary, #ffffff), var(--surface));
    color: var(--color-text-primary, #0f172a);
  }

  #app {
    display: grid;
    gap: 16px;
  }

  .page-header,
  .status-card,
  .summary-card,
  .event-card,
  .empty-state {
    border: 1px solid var(--border);
    border-radius: 20px;
    background: var(--surface-strong);
    box-shadow: var(--shadow-sm, 0 6px 30px rgba(15, 23, 42, 0.08));
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 20px 22px;
    align-items: flex-start;
  }

  .eyebrow {
    margin: 0 0 8px;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: var(--accent);
  }

  h1, h2, p {
    margin: 0;
  }

  h1 {
    font-size: 32px;
    line-height: 1.1;
  }

  .subhead {
    margin-top: 8px;
    color: var(--color-text-secondary, #475569);
  }

  .actions button {
    border: 0;
    border-radius: 999px;
    background: var(--color-background-info, #0f766e);
    color: white;
    font: inherit;
    padding: 10px 16px;
    cursor: pointer;
  }

  .actions button:disabled {
    opacity: 0.55;
    cursor: default;
  }

  .status-card {
    padding: 14px 18px;
    font-size: 14px;
  }

  .status-card[data-variant="error"] {
    color: var(--danger);
  }

  .status-card[data-variant="success"] {
    color: var(--success);
  }

  .summary-grid {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  }

  .summary-card {
    padding: 16px;
  }

  .summary-label {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--color-text-secondary, #64748b);
    margin-bottom: 8px;
  }

  .summary-value {
    font-size: 15px;
    line-height: 1.5;
    word-break: break-word;
  }

  .events-list {
    display: grid;
    gap: 12px;
  }

  .event-card,
  .empty-state {
    padding: 18px;
  }

  .event-card {
    display: grid;
    gap: 16px;
    grid-template-columns: minmax(0, 1fr) 220px;
  }

  .event-time,
  .event-meta,
  .event-id {
    color: var(--color-text-secondary, #64748b);
    font-size: 14px;
  }

  .event-time {
    margin-bottom: 8px;
  }

  .event-card h2 {
    font-size: 22px;
    line-height: 1.15;
    margin-bottom: 8px;
  }

  .event-description {
    margin-top: 12px;
    line-height: 1.6;
  }

  .event-side {
    display: grid;
    gap: 12px;
    align-content: start;
    justify-items: start;
  }

  .event-side a {
    color: var(--accent);
    text-decoration: none;
    font-weight: 600;
  }

  @media (max-width: 760px) {
    body {
      padding: 16px;
    }

    .page-header,
    .event-card {
      grid-template-columns: 1fr;
    }

    h1 {
      font-size: 26px;
    }
  }
`;
document.head.appendChild(styles);

connect().catch((error) => {
  setStatus(error instanceof Error ? error.message : 'Failed to connect to host.', 'error');
});
