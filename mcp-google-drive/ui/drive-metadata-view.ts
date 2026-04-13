import { App, PostMessageTransport, applyDocumentTheme, applyHostFonts, applyHostStyleVariables } from '@modelcontextprotocol/ext-apps';

type Person = {
  displayName?: string | null;
  emailAddress?: string | null;
};

type DriveMetadata = {
  id?: string | null;
  name?: string | null;
  mimeType?: string | null;
  description?: string | null;
  webViewLink?: string | null;
  resourceUri?: string | null;
  size?: string | null;
  createdTime?: string | null;
  modifiedTime?: string | null;
  owners?: Person[] | null;
  parents?: string[];
  starred?: boolean;
  trashed?: boolean;
  shared?: boolean;
  isFolder?: boolean;
  isGoogleWorkspace?: boolean;
  permissionCount?: number;
};

type MetadataPayload = {
  kind?: 'drive-metadata';
  file?: DriveMetadata;
};

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing root element');

const app = new App({ name: 'drive-metadata-view', version: '0.1.0' }, {}, { autoResize: true });
let currentArgs: Record<string, unknown> = {};
let currentPayload: MetadataPayload = {};
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

function ownerLabel(owners?: Person[] | null): string {
  if (!owners || owners.length === 0) return 'Unknown';
  return owners
    .map((owner) => owner.displayName || owner.emailAddress)
    .filter(Boolean)
    .join(', ');
}

function getTheme() {
  return isDarkTheme
    ? {
        title: '#f5f5f5',
        text: '#d4d4d8',
        muted: '#a1a1aa',
        shellBg:
          'radial-gradient(circle at top left, rgba(103, 232, 249, 0.12), transparent 36%), linear-gradient(180deg, #0f172a 0%, #071e26 100%)',
        panelBg: 'rgba(24, 24, 27, 0.94)',
        panelBorder: 'rgba(103, 232, 249, 0.12)',
        shadow: '0 10px 24px rgba(2, 6, 23, 0.38)',
        accent: '#67e8f9',
        chipBg: '#164e63',
        chipText: '#67e8f9',
        statusChipBg: '#27272a',
        statusChipText: '#d4d4d8',
        headText: '#94a3b8',
        rowBorder: 'rgba(103, 232, 249, 0.1)',
        link: '#a5f3fc',
        buttonBg: '#f5f5f5',
        buttonText: '#111111',
      }
    : {
        title: '#0c1a1f',
        text: '#5b6471',
        muted: '#667085',
        shellBg:
          'radial-gradient(circle at top left, rgba(207, 250, 254, 0.85), transparent 35%), linear-gradient(180deg, #f0fdff 0%, #ecfeff 100%)',
        panelBg: 'rgba(255,255,255,0.93)',
        panelBorder: 'rgba(8, 145, 178, 0.1)',
        shadow: '0 8px 20px rgba(15, 23, 42, 0.05)',
        accent: '#0891b2',
        chipBg: '#ecfeff',
        chipText: '#0891b2',
        statusChipBg: '#f3f4f6',
        statusChipText: '#374151',
        headText: '#667085',
        rowBorder: 'rgba(8, 145, 178, 0.07)',
        link: '#164e63',
        buttonBg: '#0c1a1f',
        buttonText: '#ffffff',
      };
}

function render(payload: MetadataPayload) {
  currentPayload = payload;
  const file = payload.file;
  const t = getTheme();

  const statusChips = [
    file?.isFolder ? 'Folder' : 'File',
    file?.isGoogleWorkspace ? 'Google Workspace' : '',
    file?.shared ? 'Shared' : '',
    file?.starred ? 'Starred' : '',
    file?.trashed ? 'In Trash' : '',
    typeof file?.permissionCount === 'number' ? `${file.permissionCount} permission(s)` : '',
  ]
    .filter(Boolean)
    .map((label) => `<span class="status-chip">${escapeHtml(label)}</span>`)
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
      .status-chip {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        background: ${t.statusChipBg};
        color: ${t.statusChipText};
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
      .detail-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 0;
      }
      .detail-cell {
        padding: 10px 12px;
        border-bottom: 1px solid ${t.rowBorder};
        border-right: 1px solid ${t.rowBorder};
      }
      .detail-cell:nth-child(even) { border-right: 0; }
      .detail-cell:nth-last-child(-n+2) { border-bottom: 0; }
      .detail-label { text-transform: uppercase; letter-spacing: 0.13em; font-size: 11px; color: ${t.headText}; margin-bottom: 4px; }
      .detail-value { font-size: 14px; font-weight: 700; color: ${t.title}; line-height: 1.3; }
      .panel-body { padding: 10px 12px; }
      .subtle { color: ${t.text}; line-height: 1.5; font-size: 13px; }
      .file-link {
        display: inline-flex;
        align-items: center;
        color: ${t.link};
        text-decoration: none;
        font-weight: 600;
        font-size: 12px;
      }
      .file-link:hover { text-decoration: underline; }
      .note { color: ${t.muted}; font-size: 11px; line-height: 1.45; }
    </style>
    <div class="shell">
      <section class="hero">
        <p class="eyebrow">Google Drive</p>
        <h1>${escapeHtml(file?.name || 'Untitled')}</h1>
        <div class="toolbar">
          <div class="toolbar-main">
            <p class="subhead">${escapeHtml(file?.mimeType || 'Unknown type')}${file?.size ? ` · ${escapeHtml(file.size)}` : ''}</p>
            <div class="chips">${statusChips}</div>
          </div>
          <div class="toolbar-actions">
            <button id="refresh" ${isRefreshing ? 'disabled' : ''}>${isRefreshing ? 'Refreshing...' : 'Refresh'}</button>
          </div>
        </div>
      </section>
      <section class="panel">
        <div class="panel-head">
          <div class="label">Details</div>
        </div>
        <div class="detail-grid">
          <div class="detail-cell">
            <div class="detail-label">Owner</div>
            <div class="detail-value">${escapeHtml(ownerLabel(file?.owners))}</div>
          </div>
          <div class="detail-cell">
            <div class="detail-label">Updated</div>
            <div class="detail-value">${escapeHtml(formatDate(file?.modifiedTime))}</div>
          </div>
          <div class="detail-cell">
            <div class="detail-label">Created</div>
            <div class="detail-value">${escapeHtml(formatDate(file?.createdTime))}</div>
          </div>
          <div class="detail-cell">
            <div class="detail-label">Parents</div>
            <div class="detail-value">${escapeHtml(String(file?.parents?.length ?? 0))}</div>
          </div>
        </div>
      </section>
      <section class="panel">
        <div class="panel-head">
          <div class="label">Description</div>
        </div>
        <div class="panel-body">
          <p class="subtle">${escapeHtml(file?.description || 'No description available.')}</p>
        </div>
      </section>
      <section class="panel">
        <div class="panel-head">
          <div class="label">Links</div>
          ${file?.webViewLink ? `<a class="file-link" href="${escapeHtml(file.webViewLink)}" target="_blank" rel="noreferrer">Open in Drive</a>` : ''}
        </div>
      </section>
      <p class="note">Claude may block direct left-click navigation. If needed, use right-click and open the link in your browser.</p>
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
      const result = await app.callServerTool({ name: 'gdriveGetFileMetadata', arguments: currentArgs });
      render((result.structuredContent ?? {}) as MetadataPayload);
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
  render((result.structuredContent ?? {}) as MetadataPayload);
};

app.onhostcontextchanged = () => {
  applyHost();
  if (currentPayload.file) render(currentPayload);
};
app.connect(new PostMessageTransport(window.parent, window.parent)).then(applyHost);
