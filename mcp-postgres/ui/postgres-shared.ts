import { App } from '@modelcontextprotocol/ext-apps';

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
  accent: '#336791',
  shellBg:
    'radial-gradient(circle at top left, rgba(51, 103, 145, 0.12), transparent 34%), linear-gradient(180deg, #f0f4f9 0%, #e4edf5 100%)',
  panelBg: 'rgba(255, 255, 255, 0.94)',
  panelBorder: 'rgba(51, 103, 145, 0.14)',
  shadow: '0 8px 20px rgba(10, 30, 60, 0.06)',
  title: '#0d1f33',
  text: '#1a3550',
  muted: '#4a7a9b',
  chipBg: '#e4edf5',
  chipText: '#245a82',
  headText: '#5b8db0',
  rowBorder: 'rgba(51, 103, 145, 0.08)',
  contentBg: 'rgba(255, 255, 255, 0.96)',
  link: '#336791',
};

const darkTheme: Theme = {
  accent: '#5b9bd5',
  shellBg:
    'radial-gradient(circle at top left, rgba(91, 155, 213, 0.14), transparent 34%), linear-gradient(180deg, #060e18 0%, #040a12 100%)',
  panelBg: 'rgba(6, 14, 28, 0.96)',
  panelBorder: 'rgba(91, 155, 213, 0.12)',
  shadow: '0 10px 24px rgba(0, 0, 0, 0.40)',
  title: '#e8f0fa',
  text: '#a8c4e0',
  muted: '#5b8db0',
  chipBg: '#071020',
  chipText: '#7ab8e8',
  headText: '#5b8db0',
  rowBorder: 'rgba(91, 155, 213, 0.08)',
  contentBg: 'rgba(3, 8, 16, 0.96)',
  link: '#5b9bd5',
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

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
      display: grid;
      gap: 10px;
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
    .hero h1 {
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
      color: var(--muted);
      font-size: 12px;
    }
    .empty {
      color: var(--muted);
      font-size: 13px;
      padding: 10px 0 4px;
    }
    .muted { color: var(--muted); }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th {
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--head-text);
      padding: 10px 12px;
      border-bottom: 1px solid var(--row-border);
      vertical-align: top;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid var(--row-border);
      vertical-align: top;
      font-size: 13px;
      color: var(--text);
    }
    tr:last-child td { border-bottom: 0; }
  `;
}
