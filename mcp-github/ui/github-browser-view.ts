import { App, PostMessageTransport, applyDocumentTheme, applyHostFonts, applyHostStyleVariables } from '@modelcontextprotocol/ext-apps';

type RepositoryItem = {
  name?: string;
  full_name?: string;
  description?: string | null;
  owner?: string | null;
  private?: boolean;
  fork?: boolean;
  updated_at?: string;
  language?: string | null;
  stargazers_count?: number;
  forks_count?: number;
  open_issues_count?: number;
  url?: string;
};

type IssueItem = {
  number?: number;
  title?: string;
  body?: string | null;
  state?: string;
  user?: string | null;
  labels?: string[];
  comments?: number;
  created_at?: string;
  updated_at?: string;
  closed_at?: string | null;
  url?: string;
  repository_url?: string;
  repo?: string | null;
  pull_request?: boolean;
};

type PullRequestItem = {
  number?: number;
  title?: string;
  body?: string | null;
  state?: string;
  user?: string | null;
  head?: string | null;
  base?: string | null;
  draft?: boolean;
  merged?: boolean;
  comments?: number;
  commits?: number;
  additions?: number;
  deletions?: number;
  changed_files?: number;
  updated_at?: string;
  url?: string;
};

type BrowserPayload =
  | {
      kind?: 'github-repository-list';
      mode?: 'list' | 'search';
      username?: string | null;
      query?: string;
      count?: number;
      total_count?: number;
      incomplete_results?: boolean;
      repositories?: RepositoryItem[];
    }
  | {
      kind?: 'github-issue-list';
      mode?: 'list' | 'search';
      repo?: string;
      query?: string;
      state?: string;
      count?: number;
      total_count?: number;
      incomplete_results?: boolean;
      issues?: IssueItem[];
    }
  | {
      kind?: 'github-pull-request-list';
      repo?: string;
      state?: string;
      count?: number;
      pullRequests?: PullRequestItem[];
    };

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing root element');

const app = new App({ name: 'github-browser-view', version: '0.1.0' }, {}, { autoResize: true });
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

function summarizeText(value?: string | null, fallback = 'No description'): string {
  if (!value) return fallback;
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > 120 ? `${normalized.slice(0, 117)}...` : normalized;
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
        headText: '#8b949e',
        rowBorder: 'rgba(88, 166, 255, 0.08)',
        link: '#79c0ff',
        shadow: '0 10px 24px rgba(0, 0, 0, 0.32)',
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
        headText: '#6e7781',
        rowBorder: 'rgba(9, 105, 218, 0.08)',
        link: '#0969da',
        shadow: '0 8px 20px rgba(15, 23, 42, 0.06)',
      };
}

function browserHeader(payload: BrowserPayload) {
  if (payload.kind === 'github-repository-list') {
    return {
      title: payload.mode === 'search' ? 'Repository Search' : 'Repositories',
      subtitle:
        payload.mode === 'search'
          ? `Showing repositories for query "${payload.query ?? ''}".`
          : `Showing repositories for ${payload.username ?? 'the authenticated user'}.`,
      chips: [
        `${payload.mode === 'search' ? 'Results' : 'Count'}: ${payload.count ?? 0}`,
        payload.mode === 'search' && payload.total_count ? `Total: ${payload.total_count}` : null,
      ].filter(Boolean) as string[],
    };
  }

  if (payload.kind === 'github-pull-request-list') {
    return {
      title: 'Pull Requests',
      subtitle: `Showing pull requests for ${payload.repo ?? 'repository'}.`,
      chips: [`Count: ${payload.count ?? 0}`, payload.state ? `State: ${payload.state}` : null].filter(Boolean) as string[],
    };
  }

  return {
    title: payload.mode === 'search' ? 'Issue Search' : 'Issues',
    subtitle:
      payload.mode === 'search'
        ? `Showing issues and pull requests for query "${payload.query ?? ''}".`
        : `Showing issues for ${payload.repo ?? 'repository'}.`,
    chips: [
      `${payload.mode === 'search' ? 'Results' : 'Count'}: ${payload.count ?? 0}`,
      payload.mode === 'list' && payload.state ? `State: ${payload.state}` : null,
      payload.mode === 'search' && payload.total_count ? `Total: ${payload.total_count}` : null,
    ].filter(Boolean) as string[],
  };
}

function renderRepositoryRows(repositories: RepositoryItem[]): string {
  return repositories
    .map(
      (repo) => `
        <div class="browser-row">
          <div class="item-main">
            <div class="item-title">${escapeHtml(repo.full_name ?? repo.name ?? 'Repository')}</div>
            <div class="item-subtitle">${escapeHtml(summarizeText(repo.description, 'No repository description'))}</div>
            <div class="chips">
              ${repo.language ? `<span class="chip">${escapeHtml(repo.language)}</span>` : ''}
              <span class="chip">Stars: ${repo.stargazers_count ?? 0}</span>
              <span class="chip">Forks: ${repo.forks_count ?? 0}</span>
              ${repo.private ? '<span class="chip">Private</span>' : '<span class="chip">Public</span>'}
            </div>
          </div>
          <div class="cell">${escapeHtml(formatDate(repo.updated_at))}</div>
          <div class="cell">${repo.owner ? escapeHtml(repo.owner) : 'Unknown'}</div>
          <div class="cell actions">${repo.url ? `<a href="${escapeHtml(repo.url)}" target="_blank" rel="noopener noreferrer">Open in GitHub</a>` : '—'}</div>
        </div>
      `
    )
    .join('');
}

function renderIssueRows(issues: IssueItem[]): string {
  return issues
    .map(
      (issue) => `
        <div class="browser-row">
          <div class="item-main">
            <div class="item-title">${issue.pull_request ? 'PR' : 'Issue'} #${issue.number ?? '—'} · ${escapeHtml(issue.title ?? 'Untitled')}</div>
            <div class="item-subtitle">${escapeHtml(summarizeText(issue.body, 'No description'))}</div>
            <div class="chips">
              <span class="chip">${escapeHtml(issue.state ?? 'unknown')}</span>
              ${issue.repo ? `<span class="chip">${escapeHtml(issue.repo)}</span>` : ''}
              ${(issue.labels ?? []).slice(0, 3).map((label) => `<span class="chip">${escapeHtml(label)}</span>`).join('')}
            </div>
          </div>
          <div class="cell">${escapeHtml(formatDate(issue.updated_at))}</div>
          <div class="cell">${escapeHtml(issue.user ?? 'Unknown')}</div>
          <div class="cell actions">${issue.url ? `<a href="${escapeHtml(issue.url)}" target="_blank" rel="noopener noreferrer">Open in GitHub</a>` : '—'}</div>
        </div>
      `
    )
    .join('');
}

function renderPullRequestRows(pullRequests: PullRequestItem[]): string {
  return pullRequests
    .map(
      (pr) => `
        <div class="browser-row">
          <div class="item-main">
            <div class="item-title">PR #${pr.number ?? '—'} · ${escapeHtml(pr.title ?? 'Untitled')}</div>
            <div class="item-subtitle">${escapeHtml(summarizeText(pr.body, 'No pull request description'))}</div>
            <div class="chips">
              <span class="chip">${escapeHtml(pr.state ?? 'unknown')}</span>
              ${pr.draft ? '<span class="chip">Draft</span>' : ''}
              ${pr.merged ? '<span class="chip">Merged</span>' : ''}
              ${pr.base ? `<span class="chip">${escapeHtml(pr.head ?? 'head')} → ${escapeHtml(pr.base)}</span>` : ''}
            </div>
          </div>
          <div class="cell">${escapeHtml(formatDate(pr.updated_at))}</div>
          <div class="cell">${escapeHtml(pr.user ?? 'Unknown')}</div>
          <div class="cell actions">${pr.url ? `<a href="${escapeHtml(pr.url)}" target="_blank" rel="noopener noreferrer">Open in GitHub</a>` : '—'}</div>
        </div>
      `
    )
    .join('');
}

function renderBrowser(payload: BrowserPayload) {
  const t = getTheme();
  const header = browserHeader(payload);
  const rows =
    payload.kind === 'github-repository-list'
      ? renderRepositoryRows(payload.repositories ?? [])
      : payload.kind === 'github-pull-request-list'
        ? renderPullRequestRows(payload.pullRequests ?? [])
        : renderIssueRows(payload.issues ?? []);

  root.innerHTML = `
    <style>
      html, body { margin: 0; padding: 0; min-height: 0; background: transparent; }
      body { font-family: Georgia, serif; color: ${t.title}; }
      .shell { margin: 10px; padding: 10px; border-radius: 24px; background: ${t.shellBg}; display: grid; gap: 12px; }
      .hero, .panel { background: ${t.panelBg}; border: 1px solid ${t.panelBorder}; border-radius: 18px; box-shadow: ${t.shadow}; }
      .hero { padding: 12px; display: grid; gap: 8px; }
      .eyebrow { margin: 0; text-transform: uppercase; letter-spacing: 0.16em; font-size: 11px; color: ${t.accent}; }
      h1, p { margin: 0; }
      h1 { font-size: 22px; line-height: 1.08; color: ${t.title}; }
      .subtitle { font-size: 13px; line-height: 1.45; color: ${t.text}; }
      .chips { display: flex; gap: 6px; flex-wrap: wrap; }
      .chip { display: inline-flex; align-items: center; border-radius: 999px; background: ${t.chipBg}; color: ${t.chipText}; padding: 4px 8px; font-size: 11px; }
      .head, .browser-row { display: grid; grid-template-columns: minmax(320px, 3fr) minmax(170px, 1.2fr) minmax(120px, 0.9fr) minmax(130px, 1fr); gap: 12px; align-items: center; }
      .head { padding: 9px 12px; color: ${t.headText}; font-size: 12px; border-bottom: 1px solid ${t.rowBorder}; }
      .browser-body { max-height: 560px; overflow: auto; }
      .browser-row { padding: 10px 12px; border-bottom: 1px solid ${t.rowBorder}; }
      .browser-row:last-child { border-bottom: 0; }
      .item-title { font-size: 15px; font-weight: 700; color: ${t.title}; line-height: 1.3; }
      .item-subtitle { margin-top: 3px; color: ${t.text}; font-size: 12px; line-height: 1.45; }
      .item-main .chips { margin-top: 6px; }
      .cell { color: ${t.text}; font-size: 12px; }
      .actions a { color: ${t.link}; text-decoration: none; font-weight: 600; font-size: 12px; }
      .actions a:hover { text-decoration: underline; }
      .empty { padding: 18px 12px; color: ${t.muted}; font-size: 13px; }
      @media (max-width: 820px) {
        .head, .browser-row { grid-template-columns: 1fr; }
        .head { display: none; }
      }
    </style>
    <div class="shell">
      <section class="hero">
        <p class="eyebrow">GitHub</p>
        <h1>${escapeHtml(header.title)}</h1>
        <p class="subtitle">${escapeHtml(header.subtitle)}</p>
        <div class="chips">${header.chips.map((chip) => `<span class="chip">${escapeHtml(chip)}</span>`).join('')}</div>
      </section>
      <section class="panel">
        <div class="head">
          <div>Name</div>
          <div>Updated</div>
          <div>Author / Owner</div>
          <div>Link</div>
        </div>
        <div class="browser-body">
          ${rows || '<div class="empty">No results found.</div>'}
        </div>
      </section>
    </div>
  `;
  notifySizeChanged();
}

app.ontoolresult = (result) => {
  currentPayload = (result.structuredContent ?? {}) as BrowserPayload;
  renderBrowser(currentPayload);
};

app.onhostcontextchanged = () => {
  applyHost();
  if ('kind' in currentPayload) renderBrowser(currentPayload);
};

void app.connect(new PostMessageTransport(window.parent, window.parent)).then(() => {
  applyHost();
});
