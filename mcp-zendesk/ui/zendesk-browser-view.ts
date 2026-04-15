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
  status?: string;
  priority?: string | null;
  type?: string | null;
  assignee_id?: number | null;
  requester_id?: number;
  created_at?: string;
  updated_at?: string;
  tags?: string[];
};

type ZendeskUser = {
  id?: number;
  name?: string;
  email?: string | null;
  role?: string;
  active?: boolean;
  verified?: boolean;
  organization_id?: number | null;
  created_at?: string;
  updated_at?: string;
  tags?: string[];
};

type BrowserPayload =
  | {
      kind?: 'zendesk-ticket-list';
      mode?: 'list' | 'search';
      query?: string | null;
      count?: number | null;
      hasMore?: boolean;
      tickets?: ZendeskTicket[];
    }
  | {
      kind?: 'zendesk-user-list';
      role?: string | null;
      count?: number | null;
      hasMore?: boolean;
      users?: ZendeskUser[];
    };

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing root element');

const app = new App({ name: 'zendesk-browser-view', version: '0.1.0' }, {}, { autoResize: true });
let currentPayload: BrowserPayload = {};
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

function render(payload: BrowserPayload): void {
  currentPayload = payload;
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
      };

  const isTicketList = payload.kind === 'zendesk-ticket-list';
  const title = isTicketList
    ? payload.mode === 'search'
      ? 'Ticket Search'
      : 'Ticket Queue'
    : 'Users';
  const subtitle = isTicketList
    ? payload.mode === 'search'
      ? `Showing results for "${payload.query ?? ''}".`
      : 'Browse recent Zendesk tickets with status and priority grouped into readable rows.'
    : 'Review Zendesk users with role and account state at a glance.';

  const chips = isTicketList
    ? [
        `Results: ${String(payload.count ?? payload.tickets?.length ?? 0)}`,
        payload.mode === 'search' && payload.query ? `Query: ${payload.query}` : '',
        payload.hasMore ? 'More available' : '',
      ].filter(Boolean)
    : [
        `Results: ${String(payload.count ?? payload.users?.length ?? 0)}`,
        payload.role ? `Role: ${payload.role}` : '',
        payload.hasMore ? 'More available' : '',
      ].filter(Boolean);

  const body = isTicketList
    ? renderTicketRows(payload.tickets ?? [])
    : renderUserRows(payload.users ?? []);

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
      .panel { overflow:hidden; }
      .table-head, .table-row { display:grid; grid-template-columns:minmax(280px,2fr) minmax(220px,1.5fr) minmax(150px,0.9fr); gap:12px; align-items:center; }
      .table-head { padding:9px 12px; border-bottom:1px solid ${theme.rowBorder}; color:${theme.headText}; font-size:12px; }
      .table-body { max-height:620px; overflow:auto; }
      .table-row { padding:10px 12px; border-bottom:1px solid ${theme.rowBorder}; font-size:13px; }
      .table-row:last-child { border-bottom:0; }
      .name-title { font-size:14px; font-weight:700; line-height:1.3; color:${theme.title}; }
      .muted { color:${theme.text}; font-size:12px; }
      .inline-chips { display:flex; flex-wrap:wrap; gap:6px; margin-top:4px; }
      .inline-chip { border-radius:999px; background:${theme.chipBg}; color:${theme.chipText}; padding:3px 8px; font-size:11px; }
      .empty { padding:18px 14px; color:${theme.text}; font-size:14px; }
      .note { color:${theme.muted}; font-size:11px; line-height:1.45; }
    </style>
    <div class="shell">
      <section class="hero">
        <p class="eyebrow">Zendesk</p>
        <h1>${escapeHtml(title)}</h1>
        <p class="subhead">${escapeHtml(subtitle)}</p>
        <div class="chips">${chips.map((chip) => `<span class="chip">${escapeHtml(chip)}</span>`).join('')}</div>
      </section>
      <section class="panel">
        ${body}
      </section>
      <p class="note">Queue and user views stay compact so support status, assignee, and role signals remain easier to scan than raw JSON.</p>
    </div>
  `;

  notifySizeChanged();
}

function renderTicketRows(tickets: ZendeskTicket[]): string {
  if (tickets.length === 0) {
    return '<div class="empty">No tickets matched this request.</div>';
  }

  return `
    <div class="table-head">
      <div>Ticket</div>
      <div>Summary</div>
      <div>Updated</div>
    </div>
    <div class="table-body">
      ${tickets
        .map((ticket) => {
          const chips = [
            ticket.status ?? '',
            ticket.priority ?? '',
            ticket.type ?? '',
            ticket.assignee_id ? `Assignee ${ticket.assignee_id}` : '',
          ].filter(Boolean);
          return `
            <div class="table-row">
              <div>
                <div class="name-title">${escapeHtml(ticket.subject ?? `Ticket #${ticket.id ?? 'Unknown'}`)}</div>
                <div class="inline-chips">${chips.map((chip) => `<span class="inline-chip">${escapeHtml(chip)}</span>`).join('')}</div>
              </div>
              <div class="muted">${escapeHtml(`Requester ${ticket.requester_id ?? 'Unknown'} · ${ticket.tags?.length ? `${ticket.tags.length} tags` : 'No tags'}`)}</div>
              <div class="muted">${escapeHtml(formatDate(ticket.updated_at ?? ticket.created_at))}</div>
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}

function renderUserRows(users: ZendeskUser[]): string {
  if (users.length === 0) {
    return '<div class="empty">No users matched this request.</div>';
  }

  return `
    <div class="table-head">
      <div>User</div>
      <div>Summary</div>
      <div>Updated</div>
    </div>
    <div class="table-body">
      ${users
        .map((user) => {
          const chips = [
            user.role ?? '',
            user.active === false ? 'Inactive' : 'Active',
            user.verified ? 'Verified' : 'Unverified',
          ].filter(Boolean);
          return `
            <div class="table-row">
              <div>
                <div class="name-title">${escapeHtml(user.name ?? `User #${user.id ?? 'Unknown'}`)}</div>
                <div class="inline-chips">${chips.map((chip) => `<span class="inline-chip">${escapeHtml(chip)}</span>`).join('')}</div>
              </div>
              <div class="muted">${escapeHtml(`${user.email ?? 'No email'}${user.organization_id ? ` · Org ${user.organization_id}` : ''}`)}</div>
              <div class="muted">${escapeHtml(formatDate(user.updated_at ?? user.created_at))}</div>
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}

app.ontoolresult = (result) => {
  render((result.structuredContent ?? {}) as BrowserPayload);
};

app.onhostcontextchanged = () => {
  applyHost();
  if ('kind' in currentPayload) render(currentPayload);
};

void app.connect(new PostMessageTransport(window.parent, window.parent)).then(() => {
  applyHost();
});
