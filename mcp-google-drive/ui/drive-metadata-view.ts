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
let isRefreshing = false;

function applyHost() {
  const context = app.getHostContext();
  if (context?.theme) applyDocumentTheme(context.theme);
  if (context?.styles?.variables) applyHostStyleVariables(context.styles.variables);
  if (context?.styles?.css?.fonts) applyHostFonts(context.styles.css.fonts);
}

function notifySizeChanged() {
  requestAnimationFrame(() => {
    const width = Math.ceil(document.documentElement.scrollWidth);
    const height = Math.ceil(document.documentElement.scrollHeight);
    void app.sendSizeChanged({ width, height });
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

function render(payload: MetadataPayload) {
  const file = payload.file;
  root.innerHTML = `
    <style>
      html, body { margin: 0; padding: 0; min-height: 0; }
      body {
        font-family: Georgia, serif;
        color: #1c2430;
        background:
          radial-gradient(circle at top left, rgba(232, 244, 255, 0.9), transparent 35%),
          linear-gradient(180deg, #fffdf9 0%, #f8fbff 100%);
        padding: 14px;
      }
      .shell { display: grid; gap: 12px; }
      .hero, .panel, .detail-grid > article {
        background: rgba(255,255,255,0.93);
        border: 1px solid rgba(28,36,48,0.1);
        border-radius: 18px;
        box-shadow: 0 14px 35px rgba(15, 23, 42, 0.08);
      }
      .hero { padding: 14px; display: flex; justify-content: space-between; gap: 14px; align-items: flex-start; }
      .eyebrow { margin: 0 0 6px; text-transform: uppercase; letter-spacing: 0.16em; font-size: 11px; color: #7c3aed; }
      h1, h2, p { margin: 0; }
      h1 { font-size: 26px; line-height: 1.08; }
      .meta { margin-top: 8px; color: #5b6471; line-height: 1.4; font-size: 14px; }
      .detail-grid { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
      .detail-grid > article, .panel { padding: 14px; }
      .label { text-transform: uppercase; letter-spacing: 0.14em; font-size: 11px; color: #667085; margin-bottom: 6px; }
      .value { font-size: 19px; line-height: 1.2; }
      .subtle { color: #5b6471; line-height: 1.45; font-size: 14px; }
      .chips { display: flex; flex-wrap: wrap; gap: 6px; }
      .chip { border-radius: 999px; background: #f3f4f6; color: #374151; padding: 5px 9px; font-size: 11px; }
      .actions { display: flex; flex-wrap: wrap; gap: 8px; }
      .actions a {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: #14532d;
        text-decoration: none;
        font-weight: 600;
        font-size: 13px;
      }
      .actions a:hover { text-decoration: underline; }
      .note { color: #667085; font-size: 11px; line-height: 1.45; }
      button { border: 0; border-radius: 999px; padding: 8px 14px; font: inherit; background: #1c2430; color: white; cursor: pointer; min-width: 96px; }
      button:disabled { opacity: 0.65; cursor: default; }
      @media (max-width: 720px) {
        body { padding: 12px; }
        .hero { display: grid; }
        h1 { font-size: 24px; }
      }
    </style>
    <div class="shell">
      <section class="hero">
        <div>
          <p class="eyebrow">Google Drive</p>
          <h1>${escapeHtml(file?.name || 'Untitled')}</h1>
          <p class="meta">${escapeHtml(file?.mimeType || 'Unknown type')} · ${escapeHtml(file?.size || 'N/A')}</p>
        </div>
        <button id="refresh" ${isRefreshing ? 'disabled' : ''}>${isRefreshing ? 'Refreshing...' : 'Refresh'}</button>
      </section>
      <section class="detail-grid">
        <article><div class="label">Owner</div><div class="value">${escapeHtml(ownerLabel(file?.owners))}</div></article>
        <article><div class="label">Updated</div><div class="value">${escapeHtml(formatDate(file?.modifiedTime))}</div></article>
        <article><div class="label">Created</div><div class="value">${escapeHtml(formatDate(file?.createdTime))}</div></article>
        <article><div class="label">Parents</div><div class="value">${escapeHtml(String(file?.parents?.length ?? 0))}</div></article>
      </section>
      <section class="panel">
        <div class="label">Status</div>
        <div class="chips">
          ${file?.isFolder ? '<span class="chip">Folder</span>' : '<span class="chip">File</span>'}
          ${file?.isGoogleWorkspace ? '<span class="chip">Google Workspace</span>' : ''}
          ${file?.shared ? '<span class="chip">Shared</span>' : ''}
          ${file?.starred ? '<span class="chip">Starred</span>' : ''}
          ${file?.trashed ? '<span class="chip">In Trash</span>' : ''}
          ${typeof file?.permissionCount === 'number' ? `<span class="chip">${file.permissionCount} permission(s)</span>` : ''}
        </div>
      </section>
      <section class="panel">
        <div class="label">Description</div>
        <p class="subtle">${escapeHtml(file?.description || 'No description available.')}</p>
      </section>
      <section class="panel">
        <div class="label">Links</div>
        <div class="actions">
          ${file?.webViewLink ? `<a href="${escapeHtml(file.webViewLink)}" target="_blank" rel="noreferrer">Open in Drive</a>` : ''}
        </div>
        <p class="note">Claude may block direct left-click navigation. If needed, use right-click and open the link in your browser.</p>
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
      const result = await app.callServerTool({
        name: 'gdriveGetFileMetadata',
        arguments: currentArgs,
      });
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

app.onhostcontextchanged = () => applyHost();
app.connect(new PostMessageTransport(window.parent, window.parent)).then(applyHost);
