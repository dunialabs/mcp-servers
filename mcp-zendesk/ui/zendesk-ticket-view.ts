import {
  App,
  PostMessageTransport,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from '@modelcontextprotocol/ext-apps';

type ZendeskTicket = {
  id?: number;
  subject?: string;
  description?: string;
  status?: string;
  priority?: string | null;
  type?: string | null;
  requester_id?: number;
  assignee_id?: number | null;
  organization_id?: number | null;
  group_id?: number | null;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
};

type TicketPayload = {
  kind?: 'zendesk-ticket-detail';
  ticket?: ZendeskTicket | null;
};

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing root element');

const app = new App({ name: 'zendesk-ticket-view', version: '0.1.0' }, {}, { autoResize: true });
let currentPayload: TicketPayload = {};
let isDarkTheme = false;

function detectDarkTheme(): boolean {
  const context = app.getHostContext();
  const theme = context?.theme as { mode?: string; appearance?: string; colorScheme?: string } | undefined;
  const mode = (theme?.mode ?? theme?.appearance ?? theme?.colorScheme ?? '').toLowerCase();
  if (mode.includes('dark')) return true;
  if (mode.includes('light')) return false;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

function applyHost(): void {
  const context = app.getHostContext();
  if (context?.theme) applyDocumentTheme(context.theme);
  if (context?.styles?.variables) applyHostStyleVariables(context.styles.variables);
  if (context?.styles?.css?.fonts) applyHostFonts(context.styles.css.fonts);
  isDarkTheme = detectDarkTheme();
}

function notifySizeChanged(): void {
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

function formatDate(value?: string | null): string {
  if (!value) return 'Unknown';
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

function render(payload: TicketPayload): void {
  currentPayload = payload;
  const ticket = payload.ticket ?? {};
  const theme = isDarkTheme
    ? {
        shellBg:
          'radial-gradient(circle at top left, rgba(212, 239, 79, 0.12), transparent 34%), linear-gradient(180deg, #0f2318 0%, #0b1511 100%)',
        panelBg: 'rgba(18, 20, 18, 0.94)',
        panelBorder: 'rgba(212, 239, 79, 0.12)',
        shadow: '0 10px 24px rgba(0, 0, 0, 0.32)',
        title: '#f5f7f5',
        text: '#d4d9d4',
        muted: '#a0a9a0',
        accent: '#d4ef4f',
        chipBg: '#23331b',
        chipText: '#e6f8a2',
        headText: '#a7b2a7',
        rowBorder: 'rgba(212, 239, 79, 0.08)',
        contentBg: 'rgba(12, 14, 13, 0.94)',
      }
    : {
        shellBg:
          'radial-gradient(circle at top left, rgba(181, 208, 40, 0.28), transparent 34%), linear-gradient(180deg, #fbfef2 0%, #f7fce8 100%)',
        panelBg: 'rgba(255, 255, 255, 0.94)',
        panelBorder: 'rgba(181, 208, 40, 0.22)',
        shadow: '0 8px 20px rgba(15, 23, 42, 0.05)',
        title: '#213111',
        text: '#4f5d4f',
        muted: '#6c7a6c',
        accent: '#8cae16',
        chipBg: '#f3f9d7',
        chipText: '#667e12',
        headText: '#667085',
        rowBorder: 'rgba(181, 208, 40, 0.15)',
        contentBg: 'rgba(255, 255, 255, 0.96)',
      };

  const chips = [
    ticket.status ?? '',
    ticket.priority ?? '',
    ticket.type ?? '',
  ].filter(Boolean);

  const detailRows: Array<[string, string]> = [
    ['Ticket ID', String(ticket.id ?? 'Unknown')],
    ['Requester', String(ticket.requester_id ?? 'Unknown')],
    ['Assignee', ticket.assignee_id ? String(ticket.assignee_id) : 'Unassigned'],
    ['Organization', ticket.organization_id ? String(ticket.organization_id) : 'None'],
    ['Group', ticket.group_id ? String(ticket.group_id) : 'None'],
    ['Created', formatDate(ticket.created_at)],
    ['Updated', formatDate(ticket.updated_at)],
  ];

  root.innerHTML = `
    <style>
      html, body { margin:0; padding:0; min-height:0; }
      body { font-family: Georgia, serif; color:${theme.title}; background:transparent; }
      .shell { display:grid; gap:12px; margin:10px; padding:10px; border-radius:22px; overflow:hidden; background:${theme.shellBg}; }
      .hero, .panel { background:${theme.panelBg}; border:1px solid ${theme.panelBorder}; border-radius:18px; box-shadow:${theme.shadow}; }
      .hero { padding:12px; display:grid; gap:8px; }
      .eyebrow { margin:0; text-transform:uppercase; letter-spacing:.16em; font-size:11px; color:${theme.accent}; }
      h1, p { margin:0; }
      h1 { font-size:22px; line-height:1.08; color:${theme.accent}; }
      .subhead { color:${theme.text}; font-size:13px; line-height:1.4; }
      .chips { display:flex; flex-wrap:wrap; gap:6px; }
      .chip { display:inline-flex; align-items:center; gap:6px; border-radius:999px; background:${theme.chipBg}; color:${theme.chipText}; padding:4px 8px; font-size:11px; }
      .summary { display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:10px; }
      .summary-card { background:${theme.panelBg}; border:1px solid ${theme.panelBorder}; border-radius:14px; padding:10px; display:grid; gap:4px; }
      .label { text-transform:uppercase; letter-spacing:.14em; font-size:10px; color:${theme.headText}; }
      .value { font-size:14px; color:${theme.title}; line-height:1.3; }
      .panel { padding:12px; display:grid; gap:10px; }
      .detail-grid { display:grid; grid-template-columns:minmax(160px, 1fr) minmax(240px, 2fr); gap:8px 14px; }
      .cell-key { color:${theme.headText}; font-size:12px; }
      .cell-value { color:${theme.text}; font-size:13px; word-break:break-word; }
      .content { background:${theme.contentBg}; border:1px solid ${theme.rowBorder}; border-radius:14px; padding:12px; color:${theme.text}; font-size:13px; line-height:1.6; white-space:pre-wrap; word-break:break-word; }
      .note { color:${theme.muted}; font-size:11px; line-height:1.45; }
      @media (max-width: 680px) { .summary { grid-template-columns:1fr; } .detail-grid { grid-template-columns:1fr; } }
    </style>
    <div class="shell">
      <section class="hero">
        <p class="eyebrow">Zendesk</p>
        <h1>${escapeHtml(ticket.subject ?? `Ticket #${ticket.id ?? 'Unknown'}`)}</h1>
        <p class="subhead">Ticket detail keeps status, assignee, and support context visible before the full description.</p>
        <div class="chips">${chips.map((chip) => `<span class="chip">${escapeHtml(chip)}</span>`).join('')}</div>
      </section>
      <section class="panel">
        <div class="summary">
          <div class="summary-card"><div class="label">Requester</div><div class="value">${escapeHtml(String(ticket.requester_id ?? 'Unknown'))}</div></div>
          <div class="summary-card"><div class="label">Assignee</div><div class="value">${escapeHtml(ticket.assignee_id ? String(ticket.assignee_id) : 'Unassigned')}</div></div>
          <div class="summary-card"><div class="label">Updated</div><div class="value">${escapeHtml(formatDate(ticket.updated_at))}</div></div>
        </div>
      </section>
      <section class="panel">
        <div class="label">Ticket detail</div>
        <div class="detail-grid">
          ${detailRows.map(([key, value]) => `<div class="cell-key">${escapeHtml(key)}</div><div class="cell-value">${escapeHtml(value)}</div>`).join('')}
          <div class="cell-key">Tags</div><div class="cell-value">${escapeHtml(ticket.tags?.length ? ticket.tags.join(', ') : 'None')}</div>
        </div>
      </section>
      <section class="panel">
        <div class="label">Description</div>
        <div class="content">${escapeHtml(ticket.description ?? 'No description available.')}</div>
      </section>
      <p class="note">This view emphasizes queue status and ownership first, then the full ticket body.</p>
    </div>
  `;

  notifySizeChanged();
}

app.ontoolresult = (result) => {
  render((result.structuredContent ?? {}) as TicketPayload);
};

app.onhostcontextchanged = () => {
  applyHost();
  if ('kind' in currentPayload) render(currentPayload);
};

void app.connect(new PostMessageTransport(window.parent, window.parent)).then(() => {
  applyHost();
});
