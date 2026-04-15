import {
  App,
  PostMessageTransport,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from '@modelcontextprotocol/ext-apps';

type Contact = {
  id?: string;
  role?: 'user' | 'lead';
  name?: string;
  email?: string;
  phone?: string;
  created_at?: number;
  updated_at?: number;
  last_seen_at?: number;
  custom_attributes?: Record<string, unknown>;
};

type Conversation = {
  id?: string;
  title?: string;
  created_at?: number;
  updated_at?: number;
  open?: boolean;
  read?: boolean;
  state?: string;
  priority?: string;
  source?: { subject?: string; body?: string; author?: { name?: string; type?: string } };
  contacts?: { contacts?: Array<{ id?: string; external_id?: string }> };
};

type BrowserPayload =
  | {
      kind?: 'intercom-contact-list';
      mode?: 'list' | 'search';
      query?: string | null;
      count?: number | null;
      hasMore?: boolean;
      nextCursor?: string | null;
      contacts?: Contact[];
    }
  | {
      kind?: 'intercom-conversation-list';
      count?: number | null;
      hasMore?: boolean;
      nextCursor?: string | null;
      conversations?: Conversation[];
    };

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing root element');

const app = new App({ name: 'intercom-browser-view', version: '0.1.0' }, {}, { autoResize: true });
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

function formatUnix(value?: number): string {
  if (!value) return 'Unknown';
  const date = new Date(value * 1000);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function theme() {
  return isDarkTheme
    ? {
        shellBg:
          'radial-gradient(circle at top left, rgba(90, 240, 232, 0.14), transparent 34%), linear-gradient(180deg, #0f2420 0%, #081715 100%)',
        panelBg: 'rgba(17, 24, 23, 0.94)',
        panelBorder: 'rgba(90, 240, 232, 0.12)',
        shadow: '0 10px 24px rgba(0,0,0,0.32)',
        title: '#f4f7f6',
        text: '#d2ddd9',
        muted: '#9eada8',
        accent: '#5af0e8',
        chipBg: '#15302b',
        chipText: '#9df7f1',
        headText: '#9fb0aa',
        rowBorder: 'rgba(90, 240, 232, 0.08)',
      }
    : {
        shellBg:
          'radial-gradient(circle at top left, rgba(13, 148, 136, 0.16), transparent 34%), linear-gradient(180deg, #f7fffe 0%, #f0fdfa 100%)',
        panelBg: 'rgba(255,255,255,0.94)',
        panelBorder: 'rgba(13, 148, 136, 0.12)',
        shadow: '0 8px 20px rgba(15, 23, 42, 0.05)',
        title: '#103534',
        text: '#4f6360',
        muted: '#6b7d79',
        accent: '#0d9488',
        chipBg: '#d7fbf7',
        chipText: '#0f766e',
        headText: '#667085',
        rowBorder: 'rgba(13, 148, 136, 0.08)',
      };
}

function render(payload: BrowserPayload) {
  currentPayload = payload;
  const styles = theme();
  const isContacts = payload.kind === 'intercom-contact-list';
  const title = isContacts ? (payload.mode === 'search' ? 'Contact Search' : 'Contacts') : 'Conversations';
  const subtitle = isContacts
    ? payload.mode === 'search'
      ? `Showing contacts that matched the current filter.`
      : 'Review people and leads with a denser support-friendly contact list.'
    : 'Scan conversation status, priority, and contact context in a single queue view.';
  const chips = isContacts
    ? [
        `Results: ${String(payload.count ?? payload.contacts?.length ?? 0)}`,
        payload.mode === 'search' && payload.query ? 'Filtered' : '',
        payload.hasMore ? 'More available' : '',
      ].filter(Boolean)
    : [
        `Results: ${String(payload.count ?? payload.conversations?.length ?? 0)}`,
        payload.hasMore ? 'More available' : '',
      ].filter(Boolean);
  const body = isContacts ? renderContacts(payload.contacts ?? []) : renderConversations(payload.conversations ?? []);

  root.innerHTML = `
    <style>
      html, body { margin:0; padding:0; min-height:0; }
      body { font-family: Georgia, serif; color:${styles.title}; background:transparent; }
      .shell { display:grid; gap:12px; margin:10px; padding:10px; border-radius:22px; overflow:hidden; background:${styles.shellBg}; }
      .hero, .panel { background:${styles.panelBg}; border:1px solid ${styles.panelBorder}; border-radius:18px; box-shadow:${styles.shadow}; }
      .hero { padding:12px; display:grid; gap:8px; }
      .eyebrow { margin:0; text-transform:uppercase; letter-spacing:.16em; font-size:11px; color:${styles.accent}; }
      h1, p { margin:0; }
      h1 { font-size:22px; line-height:1.08; color:${styles.accent}; }
      .subhead { color:${styles.text}; font-size:13px; line-height:1.4; }
      .chips { display:flex; flex-wrap:wrap; gap:6px; }
      .chip { display:inline-flex; align-items:center; gap:6px; border-radius:999px; background:${styles.chipBg}; color:${styles.chipText}; padding:4px 8px; font-size:11px; }
      .panel { overflow:hidden; }
      .table-head, .table-row { display:grid; grid-template-columns:minmax(280px,2fr) minmax(220px,1.4fr) minmax(160px,0.9fr); gap:12px; align-items:center; }
      .table-head { padding:9px 12px; border-bottom:1px solid ${styles.rowBorder}; color:${styles.headText}; font-size:12px; }
      .table-body { max-height:620px; overflow:auto; }
      .table-row { padding:10px 12px; border-bottom:1px solid ${styles.rowBorder}; font-size:13px; }
      .table-row:last-child { border-bottom:0; }
      .name-title { font-size:14px; font-weight:700; line-height:1.3; color:${styles.title}; }
      .muted { color:${styles.text}; font-size:12px; }
      .inline-chips { display:flex; flex-wrap:wrap; gap:6px; margin-top:4px; }
      .inline-chip { border-radius:999px; background:${styles.chipBg}; color:${styles.chipText}; padding:3px 8px; font-size:11px; }
      .empty { padding:18px 14px; color:${styles.text}; font-size:14px; }
      .note { color:${styles.muted}; font-size:11px; line-height:1.45; }
    </style>
    <div class="shell">
      <section class="hero">
        <p class="eyebrow">Intercom</p>
        <h1>${escapeHtml(title)}</h1>
        <p class="subhead">${escapeHtml(subtitle)}</p>
        <div class="chips">${chips.map((chip) => `<span class="chip">${escapeHtml(chip)}</span>`).join('')}</div>
      </section>
      <section class="panel">${body}</section>
      <p class="note">This view keeps contact and conversation queues compact so support context is faster to scan than raw JSON.</p>
    </div>
  `;

  notifySizeChanged();
}

function renderContacts(contacts: Contact[]): string {
  if (contacts.length === 0) return '<div class="empty">No contacts matched this request.</div>';
  return `
    <div class="table-head">
      <div>Contact</div>
      <div>Summary</div>
      <div>Updated</div>
    </div>
    <div class="table-body">
      ${contacts.map((contact) => {
        const chips = [
          contact.role ?? '',
          contact.custom_attributes?.company ? String(contact.custom_attributes.company) : '',
          contact.last_seen_at ? 'Seen' : '',
        ].filter(Boolean);
        return `
          <div class="table-row">
            <div>
              <div class="name-title">${escapeHtml(contact.name || contact.email || contact.id || 'Unnamed contact')}</div>
              <div class="inline-chips">${chips.map((chip) => `<span class="inline-chip">${escapeHtml(chip)}</span>`).join('')}</div>
            </div>
            <div class="muted">${escapeHtml(contact.email || contact.phone || 'No direct contact info')}</div>
            <div class="muted">${escapeHtml(formatUnix(contact.updated_at || contact.created_at))}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderConversations(conversations: Conversation[]): string {
  if (conversations.length === 0) return '<div class="empty">No conversations matched this request.</div>';
  return `
    <div class="table-head">
      <div>Conversation</div>
      <div>Summary</div>
      <div>Updated</div>
    </div>
    <div class="table-body">
      ${conversations.map((conversation) => {
        const chips = [
          conversation.state ?? '',
          conversation.priority ?? '',
          conversation.read === false ? 'Unread' : 'Read',
        ].filter(Boolean);
        const contactSummary = conversation.contacts?.contacts?.[0]?.id ? `Contact ${conversation.contacts.contacts[0].id}` : 'No linked contact';
        return `
          <div class="table-row">
            <div>
              <div class="name-title">${escapeHtml(conversation.title || conversation.source?.subject || conversation.id || 'Untitled conversation')}</div>
              <div class="inline-chips">${chips.map((chip) => `<span class="inline-chip">${escapeHtml(chip)}</span>`).join('')}</div>
            </div>
            <div class="muted">${escapeHtml(contactSummary)}${conversation.source?.author?.name ? ` · ${escapeHtml(conversation.source.author.name)}` : ''}</div>
            <div class="muted">${escapeHtml(formatUnix(conversation.updated_at || conversation.created_at))}</div>
          </div>
        `;
      }).join('')}
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
