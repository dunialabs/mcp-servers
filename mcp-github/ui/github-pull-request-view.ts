import { App, PostMessageTransport, applyDocumentTheme, applyHostFonts, applyHostStyleVariables } from '@modelcontextprotocol/ext-apps';

type PullRequestDetail = {
  number?: number;
  title?: string;
  body?: string | null;
  state?: string;
  user?: string | null;
  draft?: boolean;
  merged?: boolean;
  mergeable?: boolean | null;
  mergeable_state?: string | null;
  comments?: number;
  commits?: number;
  additions?: number;
  deletions?: number;
  changed_files?: number;
  created_at?: string;
  updated_at?: string;
  merged_at?: string | null;
  closed_at?: string | null;
  url?: string;
  head?: { ref?: string; sha?: string; repo?: string };
  base?: { ref?: string; sha?: string; repo?: string };
};

type DetailPayload = {
  kind?: 'github-pull-request-detail';
  repo?: string;
  pullRequest?: PullRequestDetail | null;
};

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing root element');

const app = new App({ name: 'github-pull-request-view', version: '0.1.0' }, {}, { autoResize: true });
let currentPayload: DetailPayload = {};
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

function getTheme() {
  return isDarkTheme
    ? {
        accent: '#58a6ff',
        shellBg:
          'radial-gradient(circle at top left, rgba(88, 166, 255, 0.14), transparent 34%), linear-gradient(180deg, #0d1117 0%, #090d12 100%)',
        panelBg: 'rgba(22, 27, 34, 0.96)',
        panelBorder: 'rgba(88, 166, 255, 0.12)',
        title: '#e6edf3',
        text: '#adbac7',
        muted: '#768390',
        chipBg: '#0c2d6b',
        chipText: '#79c0ff',
        link: '#79c0ff',
        shadow: '0 10px 24px rgba(0, 0, 0, 0.32)',
        contentBg: '#0d1117',
      }
    : {
        accent: '#0969da',
        shellBg:
          'radial-gradient(circle at top left, rgba(9, 105, 218, 0.12), transparent 34%), linear-gradient(180deg, #f6f8ff 0%, #eef4ff 100%)',
        panelBg: 'rgba(255,255,255,0.94)',
        panelBorder: 'rgba(9, 105, 218, 0.14)',
        title: '#0d1117',
        text: '#24292f',
        muted: '#57606a',
        chipBg: '#dbeafe',
        chipText: '#1d4ed8',
        link: '#0969da',
        shadow: '0 8px 20px rgba(15, 23, 42, 0.06)',
        contentBg: '#ffffff',
      };
}

function renderDetail(payload: DetailPayload) {
  const pr = payload.pullRequest;
  const t = getTheme();

  if (!pr) {
    root.innerHTML = '';
    notifySizeChanged();
    return;
  }

  const chips = [
    pr.state ? `State: ${pr.state}` : null,
    pr.draft ? 'Draft' : null,
    pr.merged ? 'Merged' : null,
    pr.mergeable_state ? `Mergeable: ${pr.mergeable_state}` : null,
  ].filter(Boolean) as string[];

  const rows = [
    ['Repository', payload.repo ?? 'Unknown'],
    ['Author', pr.user ?? 'Unknown'],
    ['Head', pr.head?.ref ?? 'Unknown'],
    ['Base', pr.base?.ref ?? 'Unknown'],
    ['Updated', formatDate(pr.updated_at)],
  ];

  root.innerHTML = `
    <style>
      html, body { margin: 0; padding: 0; min-height: 0; background: transparent; }
      body { font-family: Georgia, serif; color: ${t.title}; }
      .shell { margin: 10px; padding: 10px; border-radius: 24px; background: ${t.shellBg}; display: grid; gap: 12px; }
      .hero, .panel { background: ${t.panelBg}; border: 1px solid ${t.panelBorder}; border-radius: 18px; box-shadow: ${t.shadow}; }
      .hero { padding: 12px; display: grid; gap: 8px; }
      .eyebrow { margin: 0; text-transform: uppercase; letter-spacing: 0.16em; font-size: 11px; color: ${t.accent}; }
      h1, h2, p { margin: 0; }
      h1 { font-size: 22px; line-height: 1.1; color: ${t.title}; }
      .subtitle { font-size: 13px; line-height: 1.45; color: ${t.text}; }
      .chips { display: flex; gap: 6px; flex-wrap: wrap; }
      .chip { display: inline-flex; align-items: center; border-radius: 999px; background: ${t.chipBg}; color: ${t.chipText}; padding: 4px 8px; font-size: 11px; }
      .summary { padding: 12px; display: grid; gap: 8px; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
      .summary-card { padding: 10px; border-radius: 14px; background: ${t.contentBg}; border: 1px solid ${t.panelBorder}; }
      .summary-label { color: ${t.muted}; font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; }
      .summary-value { margin-top: 6px; color: ${t.title}; font-size: 14px; line-height: 1.35; }
      .panel-head { padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid ${t.panelBorder}; }
      h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.16em; color: ${t.accent}; }
      .panel-head a { color: ${t.link}; text-decoration: none; font-weight: 600; font-size: 12px; }
      .panel-head a:hover { text-decoration: underline; }
      .content { padding: 12px; }
      .meta { display: grid; gap: 10px; }
      .meta-row { display: grid; grid-template-columns: 120px 1fr; gap: 10px; align-items: start; color: ${t.text}; font-size: 13px; line-height: 1.45; }
      .meta-key { color: ${t.muted}; }
      .markdown { padding: 12px; border-radius: 14px; background: ${t.contentBg}; border: 1px solid ${t.panelBorder}; color: ${t.text}; white-space: pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; line-height: 1.6; }
      @media (max-width: 720px) {
        .meta-row { grid-template-columns: 1fr; }
      }
    </style>
    <div class="shell">
      <section class="hero">
        <p class="eyebrow">GitHub</p>
        <h1>PR #${pr.number ?? '—'} · ${escapeHtml(pr.title ?? 'Untitled')}</h1>
        <p class="subtitle">${escapeHtml(payload.repo ?? 'Repository')} · ${escapeHtml(pr.user ?? 'Unknown')}</p>
        <div class="chips">${chips.map((chip) => `<span class="chip">${escapeHtml(chip)}</span>`).join('')}</div>
      </section>
      <section class="panel">
        <div class="summary">
          <div class="summary-card"><div class="summary-label">Commits</div><div class="summary-value">${pr.commits ?? 0}</div></div>
          <div class="summary-card"><div class="summary-label">Files</div><div class="summary-value">${pr.changed_files ?? 0}</div></div>
          <div class="summary-card"><div class="summary-label">Changes</div><div class="summary-value">+${pr.additions ?? 0} / -${pr.deletions ?? 0}</div></div>
        </div>
      </section>
      <section class="panel">
        <div class="panel-head">
          <h2>Overview</h2>
          ${pr.url ? `<a href="${escapeHtml(pr.url)}" target="_blank" rel="noopener noreferrer">Open in GitHub</a>` : ''}
        </div>
        <div class="content">
          <div class="meta">
            ${rows
              .map(
                ([label, value]) => `
                  <div class="meta-row">
                    <div class="meta-key">${escapeHtml(label)}</div>
                    <div>${escapeHtml(value)}</div>
                  </div>
                `
              )
              .join('')}
          </div>
        </div>
      </section>
      <section class="panel">
        <div class="panel-head"><h2>Description</h2></div>
        <div class="content">
          <div class="markdown">${escapeHtml(pr.body?.trim() || 'No pull request description provided.')}</div>
        </div>
      </section>
    </div>
  `;

  notifySizeChanged();
}

app.ontoolresult = (result) => {
  currentPayload = (result.structuredContent ?? {}) as DetailPayload;
  renderDetail(currentPayload);
};

app.onhostcontextchanged = () => {
  applyHost();
  if ('kind' in currentPayload) renderDetail(currentPayload);
};

void app.connect(new PostMessageTransport(window.parent, window.parent)).then(() => {
  applyHost();
});
