import {
  App,
  PostMessageTransport,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from '@modelcontextprotocol/ext-apps';

type ConversationPart = {
  id?: string;
  part_type?: string;
  body?: string;
  created_at?: number;
  author?: { name?: string; type?: string };
};

type Conversation = {
  id?: string;
  title?: string;
  state?: string;
  priority?: string;
  read?: boolean;
  created_at?: number;
  updated_at?: number;
  source?: { subject?: string; body?: string; author?: { name?: string; type?: string } };
  contacts?: { contacts?: Array<{ id?: string; external_id?: string }> };
  conversation_parts?: { conversation_parts?: ConversationPart[]; total_count?: number };
};

type Payload = {
  kind?: 'intercom-conversation-detail';
  conversation?: Conversation | null;
};

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing root element');

const app = new App({ name: 'intercom-conversation-view', version: '0.1.0' }, {}, { autoResize: true });
let currentPayload: Payload = {};
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

function sanitizeHtml(input: string): string {
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '');
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
        contentBg: 'rgba(11, 16, 15, 0.96)',
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
        contentBg: 'rgba(255,255,255,0.96)',
      };
}

function render(payload: Payload) {
  currentPayload = payload;
  const styles = theme();
  const conversation = payload.conversation ?? {};
  const parts = conversation.conversation_parts?.conversation_parts ?? [];
  const chips = [
    conversation.state ?? '',
    conversation.priority ?? '',
    conversation.read === false ? 'Unread' : 'Read',
  ].filter(Boolean);

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
      .summary { display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:10px; }
      .summary-card { background:${styles.panelBg}; border:1px solid ${styles.panelBorder}; border-radius:14px; padding:10px; display:grid; gap:4px; }
      .label { text-transform:uppercase; letter-spacing:.14em; font-size:10px; color:${styles.headText}; }
      .value { font-size:14px; color:${styles.title}; line-height:1.3; word-break:break-word; }
      .panel { padding:12px; display:grid; gap:10px; }
      .thread { display:grid; gap:10px; }
      .entry { background:${styles.contentBg}; border:1px solid ${styles.rowBorder}; border-radius:14px; padding:12px; display:grid; gap:8px; }
      .entry-head { display:flex; flex-wrap:wrap; justify-content:space-between; gap:8px; }
      .entry-author { color:${styles.title}; font-size:13px; font-weight:700; }
      .entry-meta { color:${styles.muted}; font-size:12px; }
      .entry-body { color:${styles.text}; font-size:13px; line-height:1.6; word-break:break-word; }
      .source-body { background:${styles.contentBg}; border:1px solid ${styles.rowBorder}; border-radius:14px; padding:12px; color:${styles.text}; font-size:13px; line-height:1.6; }
      .empty { color:${styles.text}; font-size:14px; }
      .note { color:${styles.muted}; font-size:11px; line-height:1.45; }
      @media (max-width: 680px) { .summary { grid-template-columns:1fr; } }
    </style>
    <div class="shell">
      <section class="hero">
        <p class="eyebrow">Intercom</p>
        <h1>${escapeHtml(conversation.title || conversation.source?.subject || conversation.id || 'Conversation')}</h1>
        <p class="subhead">Conversation detail keeps the thread readable while keeping state and contact context visible above it.</p>
        <div class="chips">${chips.map((chip) => `<span class="chip">${escapeHtml(chip)}</span>`).join('')}</div>
      </section>
      <section class="panel">
        <div class="summary">
          <div class="summary-card"><div class="label">Conversation ID</div><div class="value">${escapeHtml(conversation.id || 'Unknown')}</div></div>
          <div class="summary-card"><div class="label">Updated</div><div class="value">${escapeHtml(formatUnix(conversation.updated_at || conversation.created_at))}</div></div>
          <div class="summary-card"><div class="label">Contact</div><div class="value">${escapeHtml(conversation.contacts?.contacts?.[0]?.id || 'None linked')}</div></div>
        </div>
      </section>
      <section class="panel">
        <div class="label">Source</div>
        <div class="source-body">${sanitizeHtml(conversation.source?.body || 'No source body available.')}</div>
      </section>
      <section class="panel">
        <div class="label">Thread</div>
        ${
          parts.length === 0
            ? '<p class="empty">No conversation parts were returned for this record.</p>'
            : `<div class="thread">${parts.map((part) => `
                <article class="entry">
                  <div class="entry-head">
                    <div class="entry-author">${escapeHtml(part.author?.name || part.author?.type || 'Unknown author')}</div>
                    <div class="entry-meta">${escapeHtml(formatUnix(part.created_at))}</div>
                  </div>
                  <div class="entry-meta">${escapeHtml(part.part_type || 'message')}</div>
                  <div class="entry-body">${sanitizeHtml(part.body || 'No body content')}</div>
                </article>
              `).join('')}</div>`
        }
      </section>
      <p class="note">Use this detail view for the active thread; list views stay focused on queue scanning.</p>
    </div>
  `;

  notifySizeChanged();
}

app.ontoolresult = (result) => {
  render((result.structuredContent ?? {}) as Payload);
};

app.onhostcontextchanged = () => {
  applyHost();
  if ('kind' in currentPayload) render(currentPayload);
};

void app.connect(new PostMessageTransport(window.parent, window.parent)).then(() => {
  applyHost();
});
