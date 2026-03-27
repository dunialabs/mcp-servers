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

type EventGroup = {
  type: 'single' | 'series';
  key: string;
  summary: string;
  description?: string | null;
  location?: string | null;
  status?: string | null;
  htmlLink?: string | null;
  representativeId?: string | null;
  start?: string | null;
  end?: string | null;
  occurrences: EventRecord[];
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

function formatShortDateTime(value?: string | null): string {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function formatDateRange(start?: string | null, end?: string | null): string {
  if (!start && !end) return 'Open range';
  if (!start || !end) return `${formatShortDateTime(start)} -> ${formatShortDateTime(end)}`;

  const startDate = new Date(start);
  const endDate = new Date(end);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return `${start} -> ${end}`;
  }

  const sameDay =
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getDate() === endDate.getDate();

  if (sameDay) {
    return `${startDate.toLocaleDateString()} ${startDate.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })} - ${endDate.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  }

  return `${formatShortDateTime(start)} - ${formatShortDateTime(end)}`;
}

function getRecurringSeriesKey(event: EventRecord): string | null {
  const id = event.id ?? '';
  const match = id.match(/^(.*)_(\d{8}(T\d{6}Z)?)$/);
  if (!match) return null;

  return [
    match[1],
    event.summary ?? '',
    event.location ?? '',
    event.description ?? '',
    event.status ?? '',
  ].join('::');
}

function buildEventGroups(events: EventRecord[]): EventGroup[] {
  const seriesMap = new Map<string, EventRecord[]>();
  const singles: EventRecord[] = [];

  for (const event of events) {
    const seriesKey = getRecurringSeriesKey(event);
    if (!seriesKey) {
      singles.push(event);
      continue;
    }

    const current = seriesMap.get(seriesKey) ?? [];
    current.push(event);
    seriesMap.set(seriesKey, current);
  }

  const groups: EventGroup[] = [];

  for (const event of singles) {
    groups.push({
      type: 'single',
      key: event.id ?? `${event.summary ?? 'event'}-${event.start ?? ''}`,
      summary: event.summary ?? 'Untitled event',
      description: event.description,
      location: event.location,
      status: event.status,
      htmlLink: event.htmlLink,
      representativeId: event.id,
      start: event.start,
      end: event.end,
      occurrences: [event],
    });
  }

  for (const [key, occurrences] of seriesMap.entries()) {
    const sorted = [...occurrences].sort((a, b) => {
      const aTime = a.start ? new Date(a.start).getTime() : 0;
      const bTime = b.start ? new Date(b.start).getTime() : 0;
      return aTime - bTime;
    });

    if (sorted.length === 1) {
      const event = sorted[0];
      groups.push({
        type: 'single',
        key,
        summary: event.summary ?? 'Untitled event',
        description: event.description,
        location: event.location,
        status: event.status,
        htmlLink: event.htmlLink,
        representativeId: event.id,
        start: event.start,
        end: event.end,
        occurrences: [event],
      });
      continue;
    }

    const first = sorted[0];
    groups.push({
      type: 'series',
      key,
      summary: first.summary ?? 'Untitled event',
      description: first.description,
      location: first.location,
      status: first.status,
      htmlLink: first.htmlLink,
      representativeId: first.id,
      start: first.start,
      end: first.end,
      occurrences: sorted,
    });
  }

  return groups.sort((a, b) => {
    const aTime = a.start ? new Date(a.start).getTime() : 0;
    const bTime = b.start ? new Date(b.start).getTime() : 0;
    return aTime - bTime;
  });
}

function formatOccurrenceDate(value?: string | null): string {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
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
    ['Range', formatDateRange(payload.timeMin ?? null, payload.timeMax ?? null)],
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
  const groups = buildEventGroups(events);

  if (groups.length === 0) {
    eventsEl.innerHTML = `
      <article class="empty-state">
        <h2>No events found</h2>
        <p>Try another time window or calendar.</p>
      </article>
    `;
    return;
  }

  eventsEl.innerHTML = groups
    .map((group) => {
      if (group.type === 'series') {
        const previewDates = group.occurrences.slice(0, 4).map((event) => formatOccurrenceDate(event.start));
        const remaining = group.occurrences.length - previewDates.length;
        return `
        <article class="event-card">
          <div class="event-main">
            <p class="event-time">${escapeHtml(formatDateRange(group.start, group.end))}</p>
            <h2>${escapeHtml(group.summary)}</h2>
            <p class="event-meta">Status: ${escapeHtml(group.status ?? 'unknown')}</p>
            <p class="event-meta">Recurring event with ${group.occurrences.length} occurrences shown as one card</p>
            ${group.location ? `<p class="event-meta">Location: ${escapeHtml(group.location)}</p>` : ''}
            ${group.description ? `<p class="event-description">${escapeHtml(group.description)}</p>` : ''}
            <div class="occurrence-list">
              ${previewDates.map((date) => `<span class="occurrence-chip">${escapeHtml(date)}</span>`).join('')}
              ${remaining > 0 ? `<span class="occurrence-chip">+${remaining} more</span>` : ''}
            </div>
          </div>
          <div class="event-side">
            ${group.htmlLink ? `<a href="${escapeHtml(group.htmlLink)}" target="_blank" rel="noreferrer">Open in Google Calendar</a>` : ''}
            <p class="event-id">Series ID: ${escapeHtml(group.representativeId ?? 'N/A')}</p>
          </div>
        </article>
      `;
      }

      const event = group.occurrences[0];
      return `
        <article class="event-card">
          <div class="event-main">
            <p class="event-time">${escapeHtml(formatDateRange(event.start, event.end))}</p>
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
    })
    .join('');
}

function renderPayload(payload: StructuredPayload | null) {
  renderSummary(payload);
  renderEvents(payload);
}

function applyHostContext() {
  const hostContext = app.getHostContext();
  if (!hostContext) return;
  if (hostContext.theme) applyDocumentTheme(hostContext.theme);
  if (hostContext.styles?.variables) applyHostStyleVariables(hostContext.styles.variables);
  if (hostContext.styles?.css?.fonts) applyHostFonts(hostContext.styles.css.fonts);
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
    const errorText = result.content?.find((item) => item.type === 'text' && 'text' in item)?.text ?? 'Tool execution failed.';
    setStatus(errorText, 'error');
    return;
  }

  const payload = (result.structuredContent ?? null) as StructuredPayload | null;
  renderPayload(payload);
  setStatus(`Loaded ${payload?.totalResults ?? 0} event(s).`, 'success');
};

app.onhostcontextchanged = () => applyHostContext();

refreshButton.addEventListener('click', async () => {
  refreshButton.disabled = true;
  setStatus('Refreshing events...', 'info');

  try {
    const result = await app.callServerTool({
      name: 'gcalendarListEvents',
      arguments: currentInput,
    });

    if (result.isError) {
      const errorText = result.content?.find((item) => item.type === 'text' && 'text' in item)?.text ?? 'Refresh failed.';
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
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 24px;
    font-family: var(--font-sans, "Iowan Old Style", "Palatino Linotype", serif);
    background: radial-gradient(circle at top left, rgba(15, 118, 110, 0.12), transparent 28%), linear-gradient(180deg, var(--color-background-primary, #ffffff), var(--surface));
    color: var(--color-text-primary, #0f172a);
  }
  #app { display: grid; gap: 16px; }
  .hero, .status, .summary-card, .event-card, .empty-state {
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
  h1 { font-size: 54px; line-height: 0.95; margin-bottom: 10px; }
  #subhead { color: color-mix(in srgb, var(--color-text-primary, #0f172a) 80%, transparent); font-size: 18px; }
  .status { padding: 16px 20px; font-size: 16px; }
  .status[data-variant="error"] { color: var(--danger); }
  .status[data-variant="success"] { color: var(--success); }
  .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
  .summary-card { padding: 16px 18px; }
  .summary-label { text-transform: uppercase; letter-spacing: 0.16em; font-size: 12px; color: color-mix(in srgb, var(--color-text-primary, #0f172a) 55%, transparent); margin-bottom: 10px; }
  .summary-value { font-size: 20px; line-height: 1.3; }
  .events-list { display: grid; gap: 12px; }
  .event-card { padding: 18px 20px; display: grid; grid-template-columns: 1fr auto; gap: 18px; }
  .event-time { color: var(--accent); font-size: 14px; margin-bottom: 10px; }
  .event-main h2 { font-size: 28px; margin-bottom: 10px; }
  .event-meta { color: color-mix(in srgb, var(--color-text-primary, #0f172a) 75%, transparent); margin-bottom: 6px; }
  .event-description { color: color-mix(in srgb, var(--color-text-primary, #0f172a) 70%, transparent); line-height: 1.55; margin-top: 10px; }
  .occurrence-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
  .occurrence-chip {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 6px 10px;
    font-size: 12px;
    background: color-mix(in srgb, var(--accent) 10%, white);
    color: color-mix(in srgb, var(--color-text-primary, #0f172a) 80%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent) 18%, white);
  }
  .event-side { min-width: 220px; display: grid; align-content: start; gap: 12px; }
  .event-side a { color: var(--accent); text-decoration: none; font-weight: 600; }
  .event-id { color: color-mix(in srgb, var(--color-text-primary, #0f172a) 60%, transparent); word-break: break-all; font-size: 13px; }
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
    h1 { font-size: 40px; }
    .event-card { grid-template-columns: 1fr; }
    .event-side { min-width: 0; }
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
