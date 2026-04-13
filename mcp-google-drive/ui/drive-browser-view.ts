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
let currentPayload: BrowserPayload = {};
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

function fileTypeLabel(mimeType?: string | null): string {
  if (!mimeType) return 'Unknown';
  if (mimeType === 'application/vnd.google-apps.folder') return 'Folder';
  if (mimeType.startsWith('application/vnd.google-apps.')) {
    return mimeType.replace('application/vnd.google-apps.', '').replaceAll('-', ' ');
  }
  const slashIndex = mimeType.indexOf('/');
  return slashIndex > 0 ? mimeType.slice(slashIndex + 1) : mimeType;
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
        headText: '#94a3b8',
        rowBorder: 'rgba(103, 232, 249, 0.1)',
        link: '#a5f3fc',
        buttonBg: '#f5f5f5',
        buttonText: '#111111',
        caretColor: '#94a3b8',
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
        headText: '#667085',
        rowBorder: 'rgba(8, 145, 178, 0.07)',
        link: '#164e63',
        buttonBg: '#0c1a1f',
        buttonText: '#ffffff',
        caretColor: '#667085',
      };
}

function buildShell(
  eyebrow: string,
  title: string,
  subhead: string,
  chips: string,
  body: string,
  note?: string,
): string {
  const t = getTheme();
  return `
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
      .hero, .panel, .tree-shell {
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
      .tree-shell { overflow: hidden; }
      .browser-head, .browser-row {
        display: grid;
        grid-template-columns: minmax(260px, 2.8fr) minmax(170px, 1.4fr) minmax(90px, 0.7fr) minmax(120px, 1fr);
        gap: 12px;
        align-items: center;
      }
      .browser-head {
        padding: 9px 12px;
        border-bottom: 1px solid ${t.rowBorder};
        color: ${t.headText};
        font-size: 12px;
      }
      .browser-body { max-height: 520px; overflow: auto; }
      .browser-row {
        padding: 8px 12px;
        border-bottom: 1px solid ${t.rowBorder};
        font-size: 13px;
      }
      .browser-row:last-child { border-bottom: 0; }
      .item-entry { display: flex; align-items: center; gap: 8px; min-width: 0; }
      .item-icon { flex: 0 0 auto; width: 20px; text-align: center; font-size: 17px; line-height: 1; }
      .item-main { min-width: 0; }
      .item-title { font-size: 14px; font-weight: 700; line-height: 1.3; color: ${t.title}; }
      .item-subtitle { color: ${t.text}; margin-top: 2px; font-size: 12px; }
      .actions a {
        display: inline-flex;
        align-items: center;
        margin-top: 3px;
        color: ${t.link};
        text-decoration: none;
        font-weight: 600;
        font-size: 12px;
      }
      .actions a:hover { text-decoration: underline; }
      .tree { list-style: none; margin: 0; padding-left: 0; display: block; }
      .tree details { display: block; }
      .tree details > summary { list-style: none; cursor: pointer; }
      .tree details > summary::-webkit-details-marker { display: none; }
      .tree ul { list-style: none; margin: 0; padding-left: 0; border-left: 0; }
      .tree-entry { display: flex; align-items: center; gap: 8px; min-width: 0; }
      .tree-caret { flex: 0 0 auto; width: 16px; color: ${t.caretColor}; font-size: 16px; line-height: 1; transform: translateY(1px); }
      .tree-placeholder { flex: 0 0 auto; width: 16px; }
      .tree-icon { flex: 0 0 auto; width: 18px; text-align: center; font-size: 16px; line-height: 1; }
      .tree-title { font-weight: 700; font-size: 14px; color: ${t.title}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .tree-name-cell { display: flex; align-items: center; min-width: 0; }
      .tree-date-cell, .tree-size-cell, .tree-kind-cell { color: ${t.text}; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
      .muted { color: ${t.text}; font-size: 12px; }
      .empty { padding: 18px 12px; color: ${t.text}; font-size: 14px; }
      .note { color: ${t.muted}; font-size: 11px; line-height: 1.45; }
    </style>
    <div class="shell">
      <section class="hero">
        <p class="eyebrow">${escapeHtml(eyebrow)}</p>
        <h1>${escapeHtml(title)}</h1>
        <div class="toolbar">
          <div class="toolbar-main">
            <p class="subhead">${escapeHtml(subhead)}</p>
            <div class="chips">${chips}</div>
          </div>
          <div class="toolbar-actions">
            <button id="refresh" ${isRefreshing ? 'disabled' : ''}>${isRefreshing ? 'Refreshing...' : 'Refresh'}</button>
          </div>
        </div>
      </section>
      ${body}
      ${note ? `<p class="note">${escapeHtml(note)}</p>` : ''}
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

  const title =
    payload.mode === 'folder'
      ? 'Folder Contents'
      : payload.mode === 'search'
        ? 'Search Results'
        : 'Drive Files';

  const subhead =
    payload.mode === 'search'
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

  const chips = [
    `<span class="chip">Results: ${payload.totalResults ?? files.length}</span>`,
    `<span class="chip">Folders: ${files.filter((f) => f.isFolder).length}</span>`,
    `<span class="chip">Files: ${files.filter((f) => !f.isFolder).length}</span>`,
    ...filterChips.map((c) => `<span class="chip">${escapeHtml(c)}</span>`),
  ].join('');

  const rows =
    files.length === 0
      ? '<div class="empty">No files matched the current query or folder filter.</div>'
      : files
          .map(
            (file) => `
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
        `,
          )
          .join('');

  root.innerHTML = buildShell(
    'Google Drive',
    title,
    subhead,
    chips,
    `
      <section class="tree-shell">
        <div class="browser-head">
          <div>名称</div>
          <div>修改日期</div>
          <div>大小</div>
          <div>种类</div>
        </div>
        <div class="browser-body">${rows}</div>
      </section>
    `,
    'Open in Drive links may not open on left-click inside Claude. If that happens, use right-click and open them in your browser.',
  );

  bindRefresh();
  notifySizeChanged();
}

function renderTreeNodeContent(
  node: DriveTreeNode,
  expandable: boolean,
  depth: number,
  lockExpanded: boolean,
): string {
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

  const chips = [
    `<span class="chip">Root: ${escapeHtml(rootNode?.name ?? 'Unknown')}</span>`,
    `<span class="chip">Depth: ${payload.maxDepth ?? 0}</span>`,
    ...(rootNode?.children ? [`<span class="chip">Items: ${rootNode.children.length}</span>`] : []),
  ].join('');

  root.innerHTML = buildShell(
    'Google Drive',
    'Folder Tree',
    `Showing tree from ${rootNode?.name ?? 'folder'} up to depth ${payload.maxDepth ?? 0}.`,
    chips,
    `
      <section class="tree-shell">
        <div class="browser-head">
          <div>名称</div>
          <div>修改日期</div>
          <div>大小</div>
          <div>种类</div>
        </div>
        <div class="browser-body">
          ${rootNode ? `<ul class="tree">${renderTreeNode(rootNode, true)}</ul>` : '<div class="empty">No tree data returned.</div>'}
        </div>
      </section>
    `,
    'Folders appear before files. Open in Drive links may require right-click if Claude blocks direct navigation.',
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
  currentPayload = result;
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
      const result = await app.callServerTool({ name: currentTool, arguments: currentArgs });
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

app.onhostcontextchanged = () => {
  applyHost();
  if (currentPayload.kind) render(currentPayload);
};
app.connect(new PostMessageTransport(window.parent, window.parent)).then(applyHost);
