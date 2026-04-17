import {
  App,
  PostMessageTransport,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from '@modelcontextprotocol/ext-apps';
import { baseShellStyles, detectDarkTheme, escapeHtml, getTheme } from './figma-shared.js';

type TreeNode = {
  id?: string | null;
  name?: string | null;
  type?: string | null;
  children?: TreeNode[];
};

type NodePayload = {
  kind?: 'figma-file-detail' | 'figma-node-detail' | 'figma-file-metadata';
  title?: string;
  subtitle?: string;
  meta?: Array<{ label: string; value: string }>;
  badges?: string[];
  tree?: TreeNode[];
};

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing root element');

const app = new App({ name: 'figma-node-view', version: '0.1.0' }, {}, { autoResize: true });
let payload: NodePayload = {};
let isDarkTheme = false;

function applyHost() {
  const context = app.getHostContext();
  if (context?.theme) applyDocumentTheme(context.theme);
  if (context?.styles?.variables) applyHostStyleVariables(context.styles.variables);
  if (context?.styles?.css?.fonts) applyHostFonts(context.styles.css.fonts);
  isDarkTheme = detectDarkTheme(app);
}

function notifySizeChanged() {
  requestAnimationFrame(() => {
    void app.sendSizeChanged({
      width: Math.ceil(document.documentElement.scrollWidth),
      height: Math.ceil(document.documentElement.scrollHeight),
    });
  });
}

function renderTree(nodes: TreeNode[], depth = 0): string {
  return nodes.map((node) => `
    <details class="tree-item" ${depth < 1 ? 'open' : ''}>
      <summary>
        <span class="tree-name">${escapeHtml(node.name ?? 'Untitled node')}</span>
        <span class="tree-type">${escapeHtml(node.type ?? 'NODE')}</span>
      </summary>
      <div class="tree-meta muted">${escapeHtml(node.id ?? '')}</div>
      ${node.children?.length ? `<div class="tree-children">${renderTree(node.children, depth + 1)}</div>` : ''}
    </details>
  `).join('');
}

function render() {
  const theme = getTheme(isDarkTheme);
  const tree = payload.tree ?? [];
  const meta = payload.meta ?? [];

  root.innerHTML = `
    <style>
      ${baseShellStyles(theme)}
      .stack { display: grid; gap: 10px; }
      .tree-wrap { max-height: 520px; overflow: auto; padding-right: 4px; }
      .tree-item { border-left: 1px solid var(--row-border); margin-left: 8px; padding-left: 10px; }
      .tree-item summary { list-style: none; cursor: pointer; display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; color: var(--text); }
      .tree-item summary::-webkit-details-marker { display: none; }
      .tree-name { color: var(--title); font-size: 13px; font-weight: 600; }
      .tree-type { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; }
      .tree-meta { font-size: 11px; padding-bottom: 6px; word-break: break-all; }
      .tree-children { display: grid; gap: 4px; }
    </style>
    <div class="shell">
      <div class="panel hero">
        <div class="eyebrow">FIGMA</div>
        <h1 class="title">${escapeHtml(payload.title ?? 'Node Detail')}</h1>
        <p class="subtitle">${escapeHtml(payload.subtitle ?? 'Read node and file structure in a compact tree layout.')}</p>
        ${payload.badges?.length ? `<div class="chips">${payload.badges.map((badge) => `<span class="chip">${escapeHtml(badge)}</span>`).join('')}</div>` : ''}
      </div>
      <div class="panel content stack">
        ${meta.length ? `<div class="meta-grid">${meta.map((entry) => `<div class="meta-card"><div class="meta-label">${escapeHtml(entry.label)}</div><div class="meta-value">${escapeHtml(entry.value)}</div></div>`).join('')}</div>` : ''}
        <div>
          <div class="toolbar"><p class="section-title">Structure</p><div class="toolbar-right">Node tree / metadata panel</div></div>
          ${tree.length ? `<div class="tree-wrap">${renderTree(tree)}</div>` : '<div class="empty">No node tree available for this result.</div>'}
        </div>
      </div>
    </div>
  `;
  notifySizeChanged();
}

app.ontoolresult = (result) => {
  payload = (result?.structuredContent as NodePayload | undefined) ?? {};
  render();
};

app.onhostcontextchanged = () => {
  applyHost();
  if ('kind' in payload) render();
};

void app.connect(new PostMessageTransport(window.parent, window.parent)).then(() => {
  applyHost();
});
