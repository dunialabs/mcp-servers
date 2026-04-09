import { App, PostMessageTransport, applyDocumentTheme, applyHostFonts, applyHostStyleVariables } from '@modelcontextprotocol/ext-apps';

type GmailHeader = { name?: string | null; value?: string | null };
type GmailPayloadPart = {
  mimeType?: string | null;
  filename?: string | null;
  body?: { data?: string | null; size?: number | null; attachmentId?: string | null } | null;
  headers?: GmailHeader[] | null;
  parts?: GmailPayloadPart[] | null;
};

type HeaderMessage = {
  id?: string | null;
  threadId?: string | null;
  labelIds?: string[] | null;
  snippet?: string | null;
  internalDate?: string | null;
  sizeEstimate?: number | null;
  subject?: string | null;
  from?: string | null;
  to?: string | null;
  date?: string | null;
  payload?: GmailPayloadPart | null;
  historyId?: string | null;
};

type MessagePayload = {
  kind?: 'gmail-message';
  format?: 'metadata' | 'full';
  message?: HeaderMessage;
};

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing root element');

const app = new App({ name: 'gmail-message-view', version: '0.1.0' }, {}, { autoResize: true });
let currentPayload: MessagePayload = {};
let currentMode: 'text' | 'html' = 'html';
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

function normalizeBase64Url(input: string): string {
  const replaced = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = replaced.length % 4;
  return pad === 0 ? replaced : replaced + '='.repeat(4 - pad);
}

function decodeBase64ToUtf8(input: string): string {
  try {
    const binary = atob(normalizeBase64Url(input));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return '';
  }
}

function sanitizeHtml(input: string): string {
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '');
}

function extractTextFromPart(part?: GmailPayloadPart | null): string {
  if (!part) return '';
  if ((part.mimeType === 'text/plain' || part.mimeType === 'text/html') && part.body?.data) {
    const decoded = decodeBase64ToUtf8(part.body.data);
    return part.mimeType === 'text/html' ? decoded.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : decoded.trim();
  }
  for (const child of part.parts ?? []) {
    const text = extractTextFromPart(child);
    if (text) return text;
  }
  return '';
}

function extractHtmlFromPart(part?: GmailPayloadPart | null): string {
  if (!part) return '';
  if (part.mimeType === 'text/html' && part.body?.data) {
    return sanitizeHtml(decodeBase64ToUtf8(part.body.data));
  }
  for (const child of part.parts ?? []) {
    const html = extractHtmlFromPart(child);
    if (html) return html;
  }
  return '';
}

function formatDate(value?: string | null, fallbackDate?: string | null): string {
  const source = value ?? fallbackDate;
  if (!source) return 'Unknown';
  const numeric = /^\d+$/.test(source) ? Number(source) : NaN;
  const date = Number.isNaN(numeric) ? new Date(source) : new Date(numeric);
  if (Number.isNaN(date.getTime())) return source;
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function render(payload: MessagePayload) {
  currentPayload = payload;
  const message = payload.message ?? {};
  const plainText = extractTextFromPart(message.payload) || message.snippet || '';
  const htmlContent = extractHtmlFromPart(message.payload);
  if (!htmlContent && currentMode === 'html') currentMode = 'text';
  const theme = isDarkTheme
    ? {
        text: '#e5e7eb',
        muted: '#a1a1aa',
        shellBg: 'radial-gradient(circle at top left, rgba(120, 53, 15, 0.18), transparent 35%), linear-gradient(180deg, #111111 0%, #18181b 100%)',
        panelBg: 'rgba(24,24,27,0.94)',
        panelBorder: 'rgba(244, 244, 245, 0.08)',
        shadow: '0 8px 20px rgba(0, 0, 0, 0.28)',
        eyebrow: '#fb923c',
        chipBg: '#332015',
        chipText: '#fdba74',
        subtleBg: 'rgba(39, 39, 42, 0.92)',
        subtleBorder: 'rgba(244, 244, 245, 0.08)',
        key: '#a1a1aa',
        value: '#d1d5db',
      }
    : {
        text: '#18212f',
        muted: '#5b6471',
        shellBg: 'radial-gradient(circle at top left, rgba(255, 245, 235, 0.92), transparent 35%), linear-gradient(180deg, #fffdf8 0%, #f8fbff 100%)',
        panelBg: 'rgba(255,255,255,0.93)',
        panelBorder: 'rgba(24,33,47,0.1)',
        shadow: '0 8px 20px rgba(15, 23, 42, 0.05)',
        eyebrow: '#b45309',
        chipBg: '#fff4e5',
        chipText: '#b45309',
        subtleBg: 'rgba(248, 251, 255, 0.82)',
        subtleBorder: 'rgba(24,33,47,0.08)',
        key: '#667085',
        value: '#273244',
      };
  root.innerHTML = `
    <style>
      html, body { margin: 0; padding: 0; min-height: 0; }
      body { font-family: Georgia, serif; color: ${theme.text}; background: transparent; padding: 0; }
      .shell {
        display: grid;
        gap: 12px;
        margin: 10px;
        padding: 10px;
        border-radius: 22px;
        overflow: hidden;
        background: ${theme.shellBg};
      }
      .hero, .panel, .grid > article {
        background: ${theme.panelBg};
        border: 1px solid ${theme.panelBorder};
        border-radius: 18px;
        box-shadow: ${theme.shadow};
      }
      .hero { padding: 12px; display: grid; gap: 8px; }
      .eyebrow { margin: 0; text-transform: uppercase; letter-spacing: 0.16em; font-size: 11px; color: ${theme.eyebrow}; }
      h1, p, pre { margin: 0; }
      h1 { font-size: 22px; line-height: 1.08; }
      .toolbar { display:flex; align-items:flex-end; justify-content:space-between; gap:12px; flex-wrap:nowrap; }
      .toolbar-main { min-width:0; display:grid; gap:6px; }
      .subhead { color:${theme.muted}; font-size:13px; line-height:1.4; }
      .chips { display:flex; flex-wrap:wrap; gap:6px; }
      .chip { display:inline-flex; align-items:center; gap:6px; border-radius:999px; background:${theme.chipBg}; color:${theme.chipText}; padding:4px 8px; font-size:11px; }
      .panel { padding:12px; }
      .label { text-transform:uppercase; letter-spacing:0.14em; font-size:11px; color:${theme.key}; margin-bottom:6px; }
      .subtle { color:${theme.muted}; font-size:13px; line-height:1.45; }
      .message-meta { display:grid; gap:8px; padding-bottom:10px; border-bottom:1px solid ${theme.subtleBorder}; margin-bottom:10px; }
      .meta-row { display:grid; grid-template-columns:84px minmax(0, 1fr); gap:10px; align-items:start; }
      .meta-key { color:${theme.key}; font-size:11px; text-transform:uppercase; letter-spacing:0.14em; padding-top:2px; }
      .meta-value { color:${theme.value}; font-size:13px; line-height:1.5; word-break:break-word; }
      .mode-tabs { display:flex; gap:8px; margin-bottom:10px; }
      .mode-tab { 
        border: 1px solid ${theme.subtleBorder};
        border-radius: 999px;
        padding: 4px 10px;
        background: ${theme.panelBg};
        color: ${theme.muted};
        font-size: 11px;
        cursor: pointer;
      }
      .mode-tab.active {
        background: ${theme.chipBg};
        color: ${theme.chipText};
        border-color: ${theme.subtleBorder};
      }
      pre { white-space: pre-wrap; word-break: break-word; font-family: "SFMono-Regular", "Menlo", monospace; font-size: 12px; line-height: 1.55; color: ${theme.value}; background: ${theme.subtleBg}; border: 1px solid ${theme.subtleBorder}; border-radius: 14px; padding: 12px; max-height: 720px; overflow: auto; }
      .html-frame {
        background: ${theme.subtleBg};
        border: 1px solid ${theme.subtleBorder};
        border-radius: 14px;
        padding: 12px;
        max-height: 720px;
        overflow: auto;
        font-size: 13px;
        line-height: 1.6;
        color: ${theme.value};
      }
      .html-frame img { max-width: 100%; height: auto; }
      .html-frame table { max-width: 100%; border-collapse: collapse; }
      @media (max-width: 640px) {
        .toolbar { flex-wrap:wrap; }
      }
    </style>
    <div class="shell">
      <section class="hero">
        <p class="eyebrow">Gmail</p>
        <h1>${escapeHtml(message.subject || 'Untitled message')}</h1>
        <div class="toolbar">
          <div class="toolbar-main">
            <p class="subhead">${escapeHtml(message.snippet || 'View message headers and readable content in one place.')}</p>
            <div class="chips">
              <span class="chip">Format: ${escapeHtml(payload.format || 'metadata')}</span>
              ${message.labelIds && message.labelIds.length > 0 ? `<span class="chip">${escapeHtml(message.labelIds.join(', '))}</span>` : ''}
            </div>
          </div>
        </div>
      </section>
      <section class="panel">
        <div class="message-meta">
          <div class="meta-row">
            <div class="meta-key">From</div>
            <div class="meta-value">${escapeHtml(message.from || 'Unknown')}</div>
          </div>
          <div class="meta-row">
            <div class="meta-key">To</div>
            <div class="meta-value">${escapeHtml(message.to || 'Unknown')}</div>
          </div>
          <div class="meta-row">
            <div class="meta-key">Date</div>
            <div class="meta-value">${escapeHtml(formatDate(message.internalDate, message.date))}</div>
          </div>
        </div>
        <div class="label">Content</div>
        <div class="mode-tabs">
          ${htmlContent ? `<button class="mode-tab ${currentMode === 'html' ? 'active' : ''}" data-mode="html">HTML preview</button>` : ''}
          <button class="mode-tab ${currentMode === 'text' ? 'active' : ''}" data-mode="text">Plain text</button>
        </div>
        ${
          currentMode === 'html' && htmlContent
            ? `<div class="html-frame">${htmlContent}</div>`
            : plainText
              ? `<pre>${escapeHtml(plainText)}</pre>`
              : `<p class="subtle">No readable content available in this message view.</p>`
        }
      </section>
    </div>
  `;

  bindModeSwitch();
  notifySizeChanged();
}

function bindModeSwitch() {
  root.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      const nextMode = button.dataset.mode === 'html' ? 'html' : 'text';
      if (nextMode === currentMode) return;
      currentMode = nextMode;
      render(currentPayload);
    });
  });
}

app.ontoolinput = ({ arguments: args }) => {
  currentArgs = args ?? {};
};

app.ontoolresult = (result) => {
  render((result.structuredContent ?? {}) as MessagePayload);
};

app.onhostcontextchanged = () => applyHost();
app.onhostcontextchanged = () => {
  applyHost();
  if (currentPayload.message) render(currentPayload);
};
app.connect(new PostMessageTransport(window.parent, window.parent)).then(applyHost);
