import {
  App,
  type HostContext,
} from '@modelcontextprotocol/ext-apps';

export type Theme = {
  accent: string;
  shellBg: string;
  panelBg: string;
  panelBorder: string;
  shadow: string;
  title: string;
  text: string;
  muted: string;
  chipBg: string;
  chipText: string;
  headText: string;
  rowBorder: string;
  contentBg: string;
  link: string;
};

const lightTheme: Theme = {
  accent: '#a259ff',
  shellBg:
    'radial-gradient(circle at top left, rgba(162, 89, 255, 0.12), transparent 34%), linear-gradient(180deg, #fdf8ff 0%, #f5ecff 100%)',
  panelBg: 'rgba(255, 255, 255, 0.94)',
  panelBorder: 'rgba(162, 89, 255, 0.14)',
  shadow: '0 8px 20px rgba(15, 23, 42, 0.06)',
  title: '#1a0a2e',
  text: '#3d2460',
  muted: '#7057a0',
  chipBg: '#f0e5ff',
  chipText: '#7c3aed',
  headText: '#9370c8',
  rowBorder: 'rgba(162, 89, 255, 0.08)',
  contentBg: 'rgba(255, 255, 255, 0.96)',
  link: '#a259ff',
};

const darkTheme: Theme = {
  accent: '#d4aaff',
  shellBg:
    'radial-gradient(circle at top left, rgba(212, 170, 255, 0.14), transparent 34%), linear-gradient(180deg, #130b22 0%, #0c0618 100%)',
  panelBg: 'rgba(24, 14, 44, 0.96)',
  panelBorder: 'rgba(212, 170, 255, 0.12)',
  shadow: '0 10px 24px rgba(0, 0, 0, 0.36)',
  title: '#f5eeff',
  text: '#dfc8ff',
  muted: '#aa8fd0',
  chipBg: '#2c1254',
  chipText: '#e5ccff',
  headText: '#aa8fd0',
  rowBorder: 'rgba(212, 170, 255, 0.08)',
  contentBg: 'rgba(15, 7, 28, 0.96)',
  link: '#d4aaff',
};

export function detectDarkTheme(app: App): boolean {
  const context = app.getHostContext();
  const theme = context?.theme as { mode?: string; appearance?: string; colorScheme?: string } | undefined;
  const mode = (theme?.mode ?? theme?.appearance ?? theme?.colorScheme ?? '').toLowerCase();
  if (mode.includes('dark')) return true;
  if (mode.includes('light')) return false;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function getTheme(isDark: boolean): Theme {
  return isDark ? darkTheme : lightTheme;
}

export function applyHostTheme(app: App): { context: HostContext | undefined; isDark: boolean; theme: Theme } {
  const context = app.getHostContext();
  const isDark = detectDarkTheme(app);
  return { context, isDark, theme: getTheme(isDark) };
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatDate(value: unknown): string {
  if (!value) return '—';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function joinDefined(values: Array<unknown>, separator = ' · '): string {
  return values.filter((value) => value !== undefined && value !== null && value !== '').map(String).join(separator);
}

export function baseShellStyles(theme: Theme): string {
  return `
    :root {
      color-scheme: light dark;
      --accent: ${theme.accent};
      --shell-bg: ${theme.shellBg};
      --panel-bg: ${theme.panelBg};
      --panel-border: ${theme.panelBorder};
      --shadow: ${theme.shadow};
      --title: ${theme.title};
      --text: ${theme.text};
      --muted: ${theme.muted};
      --chip-bg: ${theme.chipBg};
      --chip-text: ${theme.chipText};
      --head-text: ${theme.headText};
      --row-border: ${theme.rowBorder};
      --content-bg: ${theme.contentBg};
      --link: ${theme.link};
      --radius: 22px;
    }

    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: transparent;
      color: var(--text);
    }
    a { color: var(--link); text-decoration: none; }
    a:hover { text-decoration: underline; }
    .shell {
      background: var(--shell-bg);
      border-radius: 28px;
      padding: 10px;
      overflow: hidden;
    }
    .panel {
      background: var(--panel-bg);
      border: 1px solid var(--panel-border);
      box-shadow: var(--shadow);
      border-radius: var(--radius);
    }
    .hero {
      padding: 18px 20px;
      display: grid;
      gap: 10px;
    }
    .eyebrow {
      font-size: 12px;
      line-height: 1;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--accent);
      font-weight: 700;
    }
    .title {
      margin: 0;
      font-size: 22px;
      line-height: 1.08;
      color: var(--title);
      font-weight: 800;
    }
    .subtitle {
      margin: 0;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.45;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border-radius: 999px;
      background: var(--chip-bg);
      color: var(--chip-text);
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
    }
    .content {
      background: var(--content-bg);
      border: 1px solid var(--panel-border);
      border-radius: 20px;
      padding: 14px 16px;
    }
    .section-title {
      margin: 0;
      color: var(--head-text);
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 11px;
      font-weight: 700;
    }
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 10px;
    }
    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--muted);
      font-size: 12px;
    }
    .table {
      display: grid;
      gap: 0;
      border-top: 1px solid var(--row-border);
    }
    .row {
      display: grid;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px solid var(--row-border);
      align-items: start;
    }
    .muted { color: var(--muted); }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 10px;
    }
    .meta-card {
      border: 1px solid var(--row-border);
      border-radius: 16px;
      padding: 12px 14px;
      background: rgba(255,255,255,0.02);
    }
    .meta-label {
      color: var(--head-text);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 6px;
      font-weight: 700;
    }
    .meta-value {
      color: var(--title);
      font-size: 13px;
      line-height: 1.45;
      word-break: break-word;
    }
    .empty {
      color: var(--muted);
      font-size: 13px;
      padding: 10px 0 4px;
    }
  `;
}
