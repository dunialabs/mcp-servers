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

type StructuredPayload = {
  kind?: string;
  timeMin?: string;
  timeMax?: string;
  timeZone?: string;
  calendars?: CalendarBusySummary[];
};

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing root element');

const app = new App({ name: 'calendar-freebusy-view', version: '0.1.0' }, {}, { autoResize: true });
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

function formatBusyRange(start?: string | null, end?: string | null): { primary: string; secondary?: string } {
  if (!start || !end) return { primary: `${formatShortDateTime(start)} – ${formatShortDateTime(end)}` };
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return { primary: `${start} – ${end}` };

  const durationMinutes = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  const durationLabel =
    hours > 0
      ? minutes > 0
        ? `${hours} hr ${minutes} min`
        : `${hours} hr`
      : `${minutes} min`;

  const sameDay =
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getDate() === endDate.getDate();

  if (sameDay) {
    return {
      primary: `${startDate.toLocaleDateString()} ${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      secondary: durationLabel,
    };
  }
  return {
    primary: `${formatShortDateTime(start)} – ${formatShortDateTime(end)}`,
    secondary: durationLabel,
  };
}

function getCalendarDisplayName(calendarId: string, index: number): string {
  if (calendarId === 'primary') return 'Primary Calendar';
  if (calendarId.includes('@group.calendar.google.com')) return `Shared Calendar ${index + 1}`;
  if (calendarId.includes('@')) return calendarId.split('@')[0] || `Calendar ${index + 1}`;
  return calendarId;
}

function getTheme() {
  return isDarkTheme
    ? {
        title: '#f5f5f5',
        text: '#d4d4d8',
        muted: '#a1a1aa',
        shellBg:
          'radial-gradient(circle at top left, rgba(249, 168, 212, 0.12), transparent 36%), linear-gradient(180deg, #0f172a 0%, #1a0f17 100%)',
        panelBg: 'rgba(24, 24, 27, 0.94)',
        panelBorder: 'rgba(249, 168, 212, 0.12)',
        shadow: '0 10px 24px rgba(2, 6, 23, 0.38)',
        accent: '#f9a8d4',
        chipBg: '#500724',
        chipText: '#f9a8d4',
        headText: '#94a3b8',
        rowBorder: 'rgba(249, 168, 212, 0.1)',
        buttonBg: '#f5f5f5',
        buttonText: '#111111',
        busyBg: 'rgba(249, 168, 212, 0.1)',
        busyBorder: 'rgba(249, 168, 212, 0.2)',
        busyLabel: '#f9a8d4',
        busyTime: '#fbcfe8',
      }
    : {
        title: '#2d0a1a',
        text: '#5b6471',
        muted: '#667085',
        shellBg:
          'radial-gradient(circle at top left, rgba(253, 242, 248, 0.85), transparent 35%), linear-gradient(180deg, #fff5f8 0%, #fdf2f8 100%)',
        panelBg: 'rgba(255,255,255,0.93)',
        panelBorder: 'rgba(219, 39, 119, 0.1)',
        shadow: '0 8px 20px rgba(15, 23, 42, 0.05)',
        accent: '#db2777',
        chipBg: '#fdf2f8',
        chipText: '#db2777',
        headText: '#667085',
        rowBorder: 'rgba(219, 39, 119, 0.07)',
        buttonBg: '#2d0a1a',
        buttonText: '#ffffff',
        busyBg: 'linear-gradient(180deg, rgba(252, 231, 243, 0.7), rgba(252, 231, 243, 0.4))',
        busyBorder: 'rgba(219, 39, 119, 0.18)',
        busyLabel: '#be185d',
        busyTime: '#9d174d',
      };
}

function render(payload: StructuredPayload) {
  currentPayload = payload;
  const calendars = payload.calendars ?? [];
  const totalBusy = calendars.reduce((sum, cal) => sum + (cal.busyCount ?? 0), 0);
  const t = getTheme();

  const chips = [
    `<span class="chip">Calendars: ${escapeHtml(String(calendars.length))}</span>`,
    `<span class="chip">Busy slots: ${escapeHtml(String(totalBusy))}</span>`,
    payload.timeZone ? `<span class="chip">Timezone: ${escapeHtml(payload.timeZone)}</span>` : '',
    payload.timeMin ? `<span class="chip">From: ${escapeHtml(formatShortDateTime(payload.timeMin))}</span>` : '',
    payload.timeMax ? `<span class="chip">To: ${escapeHtml(formatShortDateTime(payload.timeMax))}</span>` : '',
  ]
    .filter(Boolean)
    .join('');

  const lanesHtml =
    calendars.length === 0
      ? '<div class="empty">No calendars returned.</div>'
      : calendars
          .map(
            (calendar, index) => `
          <div class="lane-row">
            <div class="lane-head">
              <div class="lane-info">
                <div class="lane-label">Calendar</div>
                <div class="lane-title">${escapeHtml(getCalendarDisplayName(calendar.calendarId, index))}</div>
                <div class="lane-id">${escapeHtml(calendar.calendarId)}</div>
              </div>
              <div class="lane-count">${escapeHtml(String(calendar.busyCount))} block(s)</div>
            </div>
            ${
              calendar.busy.length === 0
                ? '<div class="lane-empty">No scheduled events in the selected time range.</div>'
                : `<div class="busy-grid">
                    ${calendar.busy
                      .map((slot) => {
                        const range = formatBusyRange(slot.start, slot.end);
                        return `
                          <div class="busy-block">
                            <div class="busy-label">Busy</div>
                            <div class="busy-time">${escapeHtml(range.primary)}</div>
                            ${range.secondary ? `<div class="busy-meta">${escapeHtml(range.secondary)}</div>` : ''}
                          </div>
                        `;
                      })
                      .join('')}
                  </div>`
            }
          </div>
        `,
          )
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
      .lane-row {
        padding: 12px;
        border-bottom: 1px solid ${t.rowBorder};
        display: grid;
        gap: 10px;
      }
      .lane-row:last-child { border-bottom: 0; }
      .lane-head { display: flex; align-items: start; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
      .lane-label { text-transform: uppercase; letter-spacing: 0.13em; font-size: 11px; color: ${t.headText}; margin-bottom: 3px; }
      .lane-title { font-size: 15px; font-weight: 700; color: ${t.title}; line-height: 1.3; }
      .lane-id { font-size: 12px; color: ${t.muted}; margin-top: 2px; word-break: break-all; }
      .lane-count { font-size: 12px; color: ${t.text}; white-space: nowrap; }
      .lane-empty { font-size: 13px; color: ${t.text}; }
      .busy-grid { display: grid; gap: 8px; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
      .busy-block {
        padding: 10px 12px;
        border-radius: 12px;
        background: ${t.busyBg};
        border: 1px solid ${t.busyBorder};
      }
      .busy-label {
        text-transform: uppercase;
        letter-spacing: 0.14em;
        font-size: 11px;
        color: ${t.busyLabel};
        margin-bottom: 6px;
      }
      .busy-time { font-size: 13px; font-weight: 600; color: ${t.busyTime}; line-height: 1.4; }
      .busy-meta { font-size: 12px; color: ${t.text}; margin-top: 4px; }
      .empty { padding: 18px 12px; color: ${t.text}; font-size: 14px; }
    </style>
    <div class="shell">
      <section class="hero">
        <p class="eyebrow">Google Calendar</p>
        <h1>Free / Busy</h1>
        <div class="toolbar">
          <div class="toolbar-main">
            <p class="subhead">Availability and scheduled time blocks across calendars.</p>
            <div class="chips">${chips}</div>
          </div>
          <div class="toolbar-actions">
            <button id="refresh" ${isRefreshing ? 'disabled' : ''}>${isRefreshing ? 'Refreshing...' : 'Refresh'}</button>
          </div>
        </div>
      </section>
      <section class="panel">
        <div class="panel-head">
          <div class="label">Calendar Lanes</div>
        </div>
        ${lanesHtml}
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
    const button = root.querySelector<HTMLButtonElement>('#refresh');
    if (button) {
      button.disabled = true;
      button.textContent = 'Refreshing...';
    }
    try {
      const result = await app.callServerTool({ name: 'gcalendarGetFreeBusy', arguments: currentArgs });
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
  if (currentPayload.calendars) render(currentPayload);
};
app.connect(new PostMessageTransport(window.parent, window.parent)).then(applyHost);
