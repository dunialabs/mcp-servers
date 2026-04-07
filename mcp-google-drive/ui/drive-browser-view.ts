import { App, PostMessageTransport, applyDocumentTheme, applyHostFonts, applyHostStyleVariables } from '@modelcontextprotocol/ext-apps';

type DriveFile = {
  id?: string | null;
  name?: string | null;
  mimeType?: string | null;
  size?: string | null;
  modifiedTime?: string | null;
  owners?: string | null;
  webViewLink?: string | null;
  starred?: boolean | null;
  shared?: boolean | null;
  resourceUri?: string | null;
  isFolder?: boolean;
  kind?: 'folder' | 'file';
};

type DriveTreeNode = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  resourceUri: string;
  isFolder: boolean;
  children?: DriveTreeNode[];
};

type BrowserPayload = {
  kind?: 'drive-browser' | 'drive-tree';
  mode?: 'files' | 'search' | 'folder';
  query?: string | null;
  totalResults?: number;
  folderId?: string | null;
  filters?: {
    owner?: string | null;
    fileTypes?: string[];
    modifiedAfter?: string | null;
    sharedWithMe?: boolean;
    starred?: boolean;
    trashed?: boolean;
    limit?: number;
  };
  files?: DriveFile[];
  maxDepth?: number;
  root?: DriveTreeNode;
};

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing root element');

const app = new App({ name: 'drive-browser-view', version: '0.1.0' }, {}, { autoResize: true });
let currentArgs: Record<string, unknown> = {};
let currentTool = 'gdriveSearch';
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

function fileTypeLabel(mimeType?: string | null): string {
  if (!mimeType) return 'Unknown';
  if (mimeType === 'application/vnd.google-apps.folder') return 'Folder';
  if (mimeType.startsWith('application/vnd.google-apps')) {
    return mimeType.replace('application/vnd.google-apps.', '').replaceAll('-', ' ');
  }
  const slashIndex = mimeType.indexOf('/');
  return slashIndex > 0 ? mimeType.slice(slashIndex + 1) : mimeType;
}

function shell(title: string, subtitle: string, body: string, options?: { compactRefresh?: boolean }): string {
  return `
    <style>
      :root {
        color-scheme: light;
      }
      html, body {
        margin: 0;
        padding: 0;
        height: auto;
        min-height: 0;
      }
      body {
        font-family: Georgia, serif;
        background:
          radial-gradient(circle at top left, rgba(230, 243, 255, 0.9), transparent 35%),
          linear-gradient(180deg, #f8fbff 0%, #fffdf8 100%);
        color: #18212f;
        padding: 14px;
      }
      #app {
        display: block;
        width: 100%;
      }
      .shell {
        display: grid;
        gap: 12px;
      }
      .hero, .panel, .tile, .item, .tree-shell {
        background: rgba(255,255,255,0.92);
        border: 1px solid rgba(24,33,47,0.1);
        border-radius: 18px;
        box-shadow: 0 14px 35px rgba(15, 23, 42, 0.08);
      }
      .hero {
        padding: 14px;
        display: grid;
        gap: 8px;
      }
      .hero-main {
        min-width: 0;
      }
      .toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .toolbar-main {
        min-width: 0;
        display: grid;
        gap: 8px;
      }
      .toolbar-actions {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
      }
      .eyebrow {
        margin: 0 0 8px;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        font-size: 11px;
        color: #0f766e;
      }
      h1, h2, h3, p { margin: 0; }
      h1 {
        font-size: 28px;
        line-height: 1.05;
      }
      .meta {
        margin-top: 8px;
        color: #5b6471;
        line-height: 1.4;
        font-size: 14px;
      }
      button {
        border: 0;
        border-radius: 999px;
        padding: 6px 12px;
        font: inherit;
        background: #18212f;
        color: white;
        cursor: pointer;
        min-width: 78px;
        font-size: 12px;
      }
      .button-compact {
        padding: 4px 10px;
        min-width: 64px;
        font-size: 11px;
      }
      button:disabled {
        opacity: 0.65;
        cursor: default;
      }
      .stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 10px;
      }
      .tile {
        padding: 12px 14px;
      }
      .tile-label {
        text-transform: uppercase;
        letter-spacing: 0.14em;
        font-size: 11px;
        color: #667085;
        margin-bottom: 6px;
      }
      .tile-value {
        font-size: 22px;
        line-height: 1;
      }
      .panel {
        padding: 14px;
        display: grid;
        gap: 8px;
      }
      .panel-text {
        color: #5b6471;
        line-height: 1.45;
        font-size: 14px;
      }
      .note {
        color: #667085;
        font-size: 11px;
        line-height: 1.45;
      }
      .filters {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border-radius: 999px;
        background: #eef6ff;
        color: #1d4ed8;
        padding: 5px 9px;
        font-size: 11px;
      }
      .browser-shell {
        overflow: hidden;
      }
      .browser-head,
      .browser-row {
        display: grid;
        grid-template-columns: minmax(260px, 2.8fr) minmax(170px, 1.4fr) minmax(90px, 0.7fr) minmax(120px, 1fr);
        gap: 12px;
        align-items: center;
      }
      .browser-head {
        padding: 10px 14px;
        border-bottom: 1px solid rgba(24, 33, 47, 0.08);
        color: #667085;
        font-size: 12px;
      }
      .browser-body {
        max-height: 520px;
        overflow: auto;
      }
      .browser-row {
        padding: 8px 14px;
        border-bottom: 1px solid rgba(24, 33, 47, 0.06);
        font-size: 13px;
      }
      .browser-row:last-child {
        border-bottom: 0;
      }
      .item-entry {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .item-icon {
        flex: 0 0 auto;
        width: 20px;
        text-align: center;
        font-size: 17px;
        line-height: 1;
      }
      .item-main {
        min-width: 0;
      }
      .item-title {
        font-size: 14px;
        line-height: 1.3;
        font-weight: 700;
      }
      .item-subtitle {
        color: #5b6471;
        margin-top: 2px;
        font-size: 12px;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .actions a {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: #14532d;
        text-decoration: none;
        font-weight: 600;
        font-size: 13px;
      }
      .actions a:hover {
        text-decoration: underline;
      }
      .tree-shell {
        padding: 0;
        overflow: hidden;
      }
      .tree {
        list-style: none;
        margin: 0;
        padding-left: 0;
        display: block;
      }
      .tree details {
        display: block;
      }
      .tree details > summary {
        list-style: none;
        cursor: pointer;
      }
      .tree details > summary::-webkit-details-marker {
        display: none;
      }
      .tree ul {
        list-style: none;
        margin: 0;
        padding-left: 0;
        border-left: 0;
      }
      .tree-entry {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .tree-caret {
        flex: 0 0 auto;
        width: 16px;
        color: #667085;
        font-size: 16px;
        line-height: 1;
        transform: translateY(1px);
      }
      .tree-placeholder {
        flex: 0 0 auto;
        width: 16px;
      }
      .tree-icon {
        flex: 0 0 auto;
        width: 18px;
        text-align: center;
        font-size: 16px;
        line-height: 1;
      }
      .tree-title {
        font-weight: 700;
        font-size: 14px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .tree-name-cell,
      .tree-date-cell,
      .tree-size-cell,
      .tree-kind-cell {
        min-width: 0;
      }
      .tree-name-cell {
        display: flex;
        align-items: center;
      }
      .tree-date-cell,
      .tree-size-cell,
      .tree-kind-cell {
        color: #667085;
        font-size: 12px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .muted {
        color: #667085;
        font-size: 12px;
      }
      .empty {
        padding: 12px 0 2px;
      }
      @media (max-width: 720px) {
        body { padding: 12px; }
        h1 { font-size: 24px; }
        .item-top { grid-template-columns: 1fr; display: grid; }
        .toolbar {
          align-items: flex-start;
        }
      }
    </style>
    <div class="shell">
      <section class="hero">
        <div class="hero-main">
          <p class="eyebrow">Google Drive</p>
          <h1>${escapeHtml(title)}</h1>
          <p class="meta">${escapeHtml(subtitle)}</p>
        </div>
      </section>
      ${body}
    </div>
  `;
}

function renderFiles(payload: BrowserPayload) {
  const files = [...(payload.files ?? [])].sort((left, right) => {
    if ((left.isFolder ?? false) !== (right.isFolder ?? false)) {
      return left.isFolder ? -1 : 1;
    }
    return (left.name || '').localeCompare(right.name || '', undefined, { sensitivity: 'base' });
  });
  const title = payload.mode === 'folder'
    ? 'Folder Contents'
    : payload.mode === 'search'
      ? 'Search Results'
      : 'Drive Files';
  const subtitle = payload.mode === 'search'
    ? `Showing ${files.length} result(s) for ${payload.query ? `"${payload.query}"` : 'your filters'}.`
    : payload.mode === 'folder'
      ? `Showing ${files.length} item(s) from folder ${payload.folderId ?? 'current folder'}.`
      : `Showing ${files.length} recent file(s) from Google Drive.`;

  const filterChips = [
    payload.filters?.owner ? `Owner: ${payload.filters.owner}` : '',
    payload.filters?.modifiedAfter ? `Modified after: ${payload.filters.modifiedAfter}` : '',
    payload.filters?.sharedWithMe ? 'Shared with me' : '',
    payload.filters?.starred ? 'Starred' : '',
    payload.filters?.trashed ? 'Including trash' : '',
    ...(payload.filters?.fileTypes ?? []).map((type) => `Type: ${type}`),
  ].filter(Boolean);

  root.innerHTML = shell(
    title,
    subtitle,
    `
      <section class="panel">
        <div class="toolbar">
          <div class="toolbar-main">
            <div class="filters">
              <span class="chip">Results: ${payload.totalResults ?? files.length}</span>
              <span class="chip">Folders: ${files.filter((file) => file.isFolder).length}</span>
              <span class="chip">Files: ${files.filter((file) => !file.isFolder).length}</span>
            </div>
            <div class="filters">${filterChips.length > 0 ? filterChips.map((chip) => `<span class="chip">${escapeHtml(chip)}</span>`).join('') : '<span class="panel-text">No additional filters were applied.</span>'}</div>
          </div>
          <div class="toolbar-actions">
            <button id="refresh" class="button-compact" ${isRefreshing ? 'disabled' : ''}>${isRefreshing ? 'Refreshing...' : 'Refresh'}</button>
          </div>
        </div>
        <p class="note">Open in Drive links may not open on left-click inside Claude. If that happens, use right-click and open them in your browser.</p>
      </section>
      <section class="tree-shell browser-shell">
        <div class="browser-head">
          <div>名称</div>
          <div>修改日期</div>
          <div>大小</div>
          <div>种类</div>
        </div>
        <div class="browser-body">
        ${files.length > 0 ? files.map((file) => `
          <article class="browser-row">
            <div class="tree-name-cell">
              <div class="item-entry">
                <span class="item-icon" aria-hidden="true">${file.isFolder ? '📁' : '📄'}</span>
                <div class="item-main">
                  <div class="item-title">${escapeHtml(file.name || 'Untitled')}</div>
                  <div class="actions">
                    ${file.webViewLink ? `<a href="${escapeHtml(file.webViewLink)}" target="_blank" rel="noreferrer">Open in Drive</a>` : ''}
                  </div>
                </div>
              </div>
            </div>
            <div class="tree-date-cell">${file.modifiedTime ? escapeHtml(formatDate(file.modifiedTime)) : '—'}</div>
            <div class="tree-size-cell">${escapeHtml(file.size || '—')}</div>
            <div class="tree-kind-cell">${escapeHtml(fileTypeLabel(file.mimeType))}</div>
          </article>
        `).join('') : '<section class="panel empty"><p class="panel-text">No files matched the current query or folder filter.</p></section>'}
        </div>
      </section>
    `,
    { compactRefresh: true }
  );
  bindRefresh();
  notifySizeChanged();
}

function renderTreeNodeContent(node: DriveTreeNode, expandable: boolean, depth: number, lockExpanded: boolean): string {
  const childCount = node.children?.length ?? 0;
  const indent = depth * 18;
  return `
    <div class="browser-row">
      <div class="tree-name-cell" style="padding-left:${indent}px">
        <div class="tree-entry">
          ${expandable ? (lockExpanded ? '<span class="tree-placeholder" aria-hidden="true"></span>' : '<span class="tree-caret" aria-hidden="true">▸</span>') : '<span class="tree-placeholder" aria-hidden="true"></span>'}
          <span class="tree-icon" aria-hidden="true">${node.isFolder ? '📁' : '📄'}</span>
          <div class="item-main">
            <div class="tree-title">${escapeHtml(node.name)}</div>
            <div class="actions">
              ${node.webViewLink ? `<a href="${escapeHtml(node.webViewLink)}" target="_blank" rel="noreferrer">Open in Drive</a>` : ''}
            </div>
          </div>
        </div>
      </div>
      <div class="tree-date-cell">${node.modifiedTime ? escapeHtml(formatDate(node.modifiedTime)) : '—'}</div>
      <div class="tree-size-cell">${node.size ? escapeHtml(node.size) : '—'}</div>
      <div class="tree-kind-cell">${escapeHtml(node.isFolder ? `文件夹${childCount > 0 ? ` · ${childCount} 项` : ''}` : fileTypeLabel(node.mimeType))}</div>
    </div>
  `;
}

function renderTreeNode(node: DriveTreeNode, isRoot: boolean = false, depth: number = 0): string {
  const children = node.children ?? [];
  const expandable = node.isFolder && children.length > 0;
  const lockExpanded = depth === 0;

  if (!expandable) {
    return `<li>${renderTreeNodeContent(node, false, depth, false)}</li>`;
  }

  if (lockExpanded) {
    return `
      <li>
        ${renderTreeNodeContent(node, true, depth, true)}
        <ul>${children.map((child) => renderTreeNode(child, false, depth + 1)).join('')}</ul>
      </li>
    `;
  }

  return `
    <li>
      <details ${isRoot ? 'open' : ''}>
        <summary>${renderTreeNodeContent(node, true, depth, false)}</summary>
        <ul>${children.map((child) => renderTreeNode(child, false, depth + 1)).join('')}</ul>
      </details>
    </li>
  `;
}

function renderTree(payload: BrowserPayload) {
  const rootNode = payload.root;
  root.innerHTML = shell(
    'Folder Tree',
    `Showing tree from ${rootNode?.name ?? 'folder'} up to depth ${payload.maxDepth ?? 0}.`,
    `
      <section class="panel">
        <div class="toolbar">
          <div class="toolbar-main">
            <div class="filters">
              <span class="chip">Root: ${escapeHtml(rootNode?.name ?? 'Unknown')}</span>
              <span class="chip">Depth: ${payload.maxDepth ?? 0}</span>
              ${rootNode?.children ? `<span class="chip">Items: ${rootNode.children.length}</span>` : ''}
            </div>
          </div>
          <div class="toolbar-actions">
            <button id="refresh" class="button-compact" ${isRefreshing ? 'disabled' : ''}>${isRefreshing ? 'Refreshing...' : 'Refresh'}</button>
          </div>
        </div>
        <p class="note">Folders appear before files. Open in Drive links may require right-click if Claude blocks direct navigation.</p>
      </section>
      <section class="tree-shell browser-shell">
        <div class="browser-head">
          <div>名称</div>
          <div>修改日期</div>
          <div>大小</div>
          <div>种类</div>
        </div>
        <div class="browser-body">
          ${rootNode ? `<ul class="tree">${renderTreeNode(rootNode, true)}</ul>` : '<p class="panel-text">No tree data returned.</p>'}
        </div>
      </section>
    `,
    { compactRefresh: true }
  );
  root.querySelectorAll<HTMLDetailsElement>('.tree details').forEach((element) => {
    const summary = element.querySelector<HTMLElement>('summary');
    const caret = summary?.querySelector<HTMLElement>('.tree-caret');
    const syncCaret = () => {
      if (caret) caret.textContent = element.open ? '▾' : '▸';
    };
    syncCaret();
    element.addEventListener('toggle', () => {
      syncCaret();
      notifySizeChanged();
    });
  });
  bindRefresh();
  notifySizeChanged();
}

function render(result: BrowserPayload) {
  if (result.kind === 'drive-tree') {
    currentTool = 'gdriveGetTree';
    renderTree(result);
    return;
  }

  currentTool = 'gdriveSearch';
  renderFiles(result);
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
        name: currentTool,
        arguments: currentArgs,
      });
      render((result?.structuredContent ?? {}) as BrowserPayload);
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
  currentTool = app.getHostContext()?.toolInfo?.tool?.name ?? currentTool;
};

app.ontoolresult = (result) => {
  render((result.structuredContent ?? {}) as BrowserPayload);
};

app.onhostcontextchanged = () => applyHost();
app.connect(new PostMessageTransport(window.parent, window.parent)).then(applyHost);
