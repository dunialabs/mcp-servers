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

type StructuredPayload = {
  kind?: string;
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

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing root element');

const app = new App({ name: 'calendar-events-view', version: '0.1.0' }, {}, { autoResize: true });
let currentArgs: Record<string, unknown> = {};
let currentPayload: StructuredPayload = {};
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

function formatShortDateTime(value?: string | null): string {
  if (!value) return 'N/A';
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

function formatDateRange(start?: string | null, end?: string | null): string {
  if (!start && !end) return 'Open range';
  if (!start || !end) return `${formatShortDateTime(start)} – ${formatShortDateTime(end)}`;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return `${start} – ${end}`;
  const sameDay =
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getDate() === endDate.getDate();
  if (sameDay) {
    return `${startDate.toLocaleDateString()} ${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return `${formatShortDateTime(start)} – ${formatShortDateTime(end)}`;
}

function formatOccurrenceDate(value?: string | null): string {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function getRecurringSeriesKey(event: EventRecord): string | null {
  const id = event.id ?? '';
  const match = id.match(/^(.*)_(\d{8}(T\d{6}Z)?)$/);
  if (!match) return null;
  return [match[1], event.summary ?? '', event.location ?? '', event.description ?? '', event.status ?? ''].join('::');
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

function getTheme() {
  return isDarkTheme
    ? {
        title: '#e8f0fe',
        text: '#a8c0f0',
        muted: '#6888c8',
        shellBg:
          'radial-gradient(circle at top left, rgba(26, 115, 232, 0.14), transparent 36%), linear-gradient(180deg, #060d1a 0%, #040a14 100%)',
        panelBg: 'rgba(6, 14, 30, 0.97)',
        panelBorder: 'rgba(26, 115, 232, 0.14)',
        shadow: '0 10px 24px rgba(0, 0, 0, 0.40)',
        accent: '#4e8df5',
        chipBg: '#0a1840',
        chipText: '#7eb0f8',
        headText: '#6888c8',
        rowBorder: 'rgba(26, 115, 232, 0.1)',
        link: '#7eb0f8',
        buttonBg: '#e8f0fe',
        buttonText: '#060d1a',
        timeBg: 'rgba(26, 115, 232, 0.14)',
        timeText: '#4e8df5',
        occurrenceBg: '#0a1840',
        occurrenceText: '#7eb0f8',
      }
    : {
        title: '#0d2860',
        text: '#2a4a8a',
        muted: '#4a6aaa',
        shellBg:
          'radial-gradient(circle at top left, rgba(26, 115, 232, 0.10), transparent 36%), linear-gradient(180deg, #f0f4ff 0%, #e8f0fe 100%)',
        panelBg: 'rgba(255, 255, 255, 0.94)',
        panelBorder: 'rgba(26, 115, 232, 0.12)',
        shadow: '0 8px 20px rgba(10, 30, 80, 0.06)',
        accent: '#1a73e8',
        chipBg: '#e8f0fe',
        chipText: '#1a56c4',
        headText: '#6a8ac8',
        rowBorder: 'rgba(26, 115, 232, 0.08)',
        link: '#1a56c4',
        buttonBg: '#0d2860',
        buttonText: '#ffffff',
        timeBg: '#e8f0fe',
        timeText: '#1a56c4',
        occurrenceBg: '#e8f0fe',
        occurrenceText: '#1a56c4',
      };
}

function render(payload: StructuredPayload) {
  currentPayload = payload;
  const events = payload.events ?? [];
  const groups = buildEventGroups(events);
  const t = getTheme();

  const chips = [
    `<span class="chip">Calendar: ${escapeHtml(payload.calendarId ?? 'primary')}</span>`,
    `<span class="chip">Events: ${escapeHtml(String(payload.totalResults ?? events.length))}</span>`,
    payload.timeMin ? `<span class="chip">From: ${escapeHtml(formatShortDateTime(payload.timeMin))}</span>` : '',
    payload.timeMax ? `<span class="chip">To: ${escapeHtml(formatShortDateTime(payload.timeMax))}</span>` : '',
  ]
    .filter(Boolean)
    .join('');

  const eventsHtml =
    groups.length === 0
      ? '<div class="empty">No events found in this time window.</div>'
      : groups
          .map((group) => {
            if (group.type === 'series') {
              const previewDates = group.occurrences.slice(0, 4).map((event) => formatOccurrenceDate(event.start));
              const remaining = group.occurrences.length - previewDates.length;
              return `
                <div class="event-row">
                  <div class="event-body">
                    <div class="event-time-row">
                      <span class="event-time">${escapeHtml(formatDateRange(group.start, group.end))}</span>
                      <span class="series-badge">Recurring · ${group.occurrences.length} occurrences</span>
                    </div>
                    <div class="event-title">${escapeHtml(group.summary)}</div>
                    ${group.location ? `<div class="event-meta">📍 ${escapeHtml(group.location)}</div>` : ''}
                    ${group.status ? `<div class="event-meta">Status: ${escapeHtml(group.status)}</div>` : ''}
                    ${group.description ? `<div class="event-desc">${escapeHtml(group.description)}</div>` : ''}
                    <div class="occurrence-chips">
                      ${previewDates.map((d) => `<span class="occurrence-chip">${escapeHtml(d)}</span>`).join('')}
                      ${remaining > 0 ? `<span class="occurrence-chip">+${remaining} more</span>` : ''}
                    </div>
                  </div>
                  <div class="event-actions">
                    ${group.htmlLink ? `<a class="event-link" href="${escapeHtml(group.htmlLink)}" target="_blank" rel="noreferrer">Open in Calendar</a>` : ''}
                  </div>
                </div>
              `;
            }
            const event = group.occurrences[0];
            return `
              <div class="event-row">
                <div class="event-body">
                  <div class="event-time-row">
                    <span class="event-time">${escapeHtml(formatDateRange(event.start, event.end))}</span>
                  </div>
                  <div class="event-title">${escapeHtml(event.summary ?? 'Untitled event')}</div>
                  ${event.location ? `<div class="event-meta">📍 ${escapeHtml(event.location)}</div>` : ''}
                  ${event.status ? `<div class="event-meta">Status: ${escapeHtml(event.status)}</div>` : ''}
                  ${event.description ? `<div class="event-desc">${escapeHtml(event.description)}</div>` : ''}
                </div>
                <div class="event-actions">
                  ${event.htmlLink ? `<a class="event-link" href="${escapeHtml(event.htmlLink)}" target="_blank" rel="noreferrer">Open in Calendar</a>` : ''}
                </div>
              </div>
            `;
          })
          .join('');

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
      .event-row {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 12px;
        padding: 12px;
        border-bottom: 1px solid ${t.rowBorder};
        align-items: start;
      }
      .event-row:last-child { border-bottom: 0; }
      .event-time-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px; }
      .event-time {
        display: inline-block;
        background: ${t.timeBg};
        color: ${t.timeText};
        border-radius: 6px;
        padding: 2px 8px;
        font-size: 12px;
        font-weight: 600;
      }
      .series-badge { font-size: 11px; color: ${t.muted}; }
      .event-title { font-size: 15px; font-weight: 700; color: ${t.title}; line-height: 1.3; margin-bottom: 4px; }
      .event-meta { font-size: 12px; color: ${t.text}; margin-top: 3px; }
      .event-desc { font-size: 12px; color: ${t.text}; margin-top: 6px; line-height: 1.5; }
      .occurrence-chips { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
      .occurrence-chip {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        background: ${t.occurrenceBg};
        color: ${t.occurrenceText};
        padding: 3px 8px;
        font-size: 11px;
      }
      .event-actions { display: grid; gap: 6px; align-content: start; }
      .event-link {
        display: inline-flex;
        align-items: center;
        color: ${t.link};
        text-decoration: none;
        font-weight: 600;
        font-size: 12px;
        white-space: nowrap;
      }
      .event-link:hover { text-decoration: underline; }
      .empty { padding: 18px 12px; color: ${t.text}; font-size: 14px; }
      .note { color: ${t.muted}; font-size: 11px; line-height: 1.45; }
    </style>
    <div class="shell">
      <section class="hero">
        <p class="eyebrow">Google Calendar</p>
        <h1>Calendar Events</h1>
        <div class="toolbar">
          <div class="toolbar-main">
            <p class="subhead">Scheduled events, recurring series, and time blocks.</p>
            <div class="chips">${chips}</div>
          </div>
          <div class="toolbar-actions">
            <button id="refresh" ${isRefreshing ? 'disabled' : ''}>${isRefreshing ? 'Refreshing...' : 'Refresh'}</button>
          </div>
        </div>
      </section>
      <section class="panel">
        <div class="panel-head">
          <div class="label">Events</div>
        </div>
        ${eventsHtml}
      </section>
      <p class="note">Open in Calendar links may require right-click if Claude blocks direct navigation.</p>
    </div>
  `;

  bindRefresh();
  notifySizeChanged();
}

function bindRefresh() {
  root.querySelector<HTMLButtonElement>('#refresh')?.addEventListener('click', async () => {
    if (isRefreshing) return;
    isRefreshing = true;
    const button = root.querySelector<HTMLButtonElement>('#refresh');
    if (button) {
      button.disabled = true;
      button.textContent = 'Refreshing...';
    }
    try {
      const result = await app.callServerTool({ name: 'gcalendarListEvents', arguments: currentArgs });
      isRefreshing = false;
      render((result.structuredContent ?? {}) as StructuredPayload);
    } finally {
      isRefreshing = false;
      const nextButton = root.querySelector<HTMLButtonElement>('#refresh');
      if (nextButton) {
        nextButton.disabled = false;
        nextButton.textContent = 'Refresh';
      }
      notifySizeChanged();
    }
  });
}

app.ontoolinput = ({ arguments: args }) => {
  currentArgs = args ?? {};
};

app.ontoolresult = (result) => {
  render((result.structuredContent ?? {}) as StructuredPayload);
};

app.onhostcontextchanged = () => {
  applyHost();
  if (currentPayload.events) render(currentPayload);
};
void app.connect(new PostMessageTransport(window.parent, window.parent)).then(() => {
  applyHost();
});
