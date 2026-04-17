import type { App } from '@modelcontextprotocol/ext-apps';

type Theme = {
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
  accent: '#7d2ae8',
  shellBg:
    'radial-gradient(circle at top left, rgba(125, 42, 232, 0.12), transparent 34%), linear-gradient(180deg, #faf7ff 0%, #f3eaff 100%)',
  panelBg: 'rgba(255, 255, 255, 0.94)',
  panelBorder: 'rgba(125, 42, 232, 0.14)',
  shadow: '0 8px 20px rgba(15, 23, 42, 0.06)',
  title: '#1a0533',
  text: '#3b1f5e',
  muted: '#6d5589',
  chipBg: '#f0e5ff',
  chipText: '#6d28d9',
  headText: '#8b6aab',
  rowBorder: 'rgba(125, 42, 232, 0.08)',
  contentBg: 'rgba(255, 255, 255, 0.96)',
  link: '#7d2ae8',
};

const darkTheme: Theme = {
  accent: '#c084fc',
  shellBg:
    'radial-gradient(circle at top left, rgba(192, 132, 252, 0.14), transparent 34%), linear-gradient(180deg, #110820 0%, #0b0517 100%)',
  panelBg: 'rgba(22, 12, 40, 0.96)',
  panelBorder: 'rgba(192, 132, 252, 0.12)',
  shadow: '0 10px 24px rgba(0, 0, 0, 0.36)',
  title: '#f3e8ff',
  text: '#d8b4fe',
  muted: '#a78abf',
  chipBg: '#2e1060',
  chipText: '#e9d5ff',
  headText: '#a78abf',
  rowBorder: 'rgba(192, 132, 252, 0.08)',
  contentBg: 'rgba(14, 6, 28, 0.96)',
  link: '#c084fc',
};

export function detectDarkTheme(app: App): boolean {
  const context = app.getHostContext();
  const theme = context?.theme as
    | { mode?: string; appearance?: string; colorScheme?: string }
    | undefined;
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
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function formatDate(value?: number | null): string {
  if (!value) return 'Unknown';
  const date = new Date(value * 1000);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function baseShellStyles(t: Theme): string {
  return `
    :root { color-scheme: ${t === darkTheme ? 'dark' : 'light'}; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: transparent;
      font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: ${t.text};
    }
    a { color: ${t.link}; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .shell {
      background: ${t.shellBg};
      border-radius: 22px;
      padding: 10px;
      overflow: hidden;
    }
    .hero, .panel {
      background: ${t.panelBg};
      border: 1px solid ${t.panelBorder};
      border-radius: 18px;
      box-shadow: ${t.shadow};
    }
    .hero {
      padding: 16px 18px;
      margin-bottom: 10px;
    }
    .eyebrow {
      margin: 0 0 8px;
      color: ${t.accent};
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.22em;
      text-transform: uppercase;
    }
    h1 {
      margin: 0;
      color: ${t.title};
      font-size: 22px;
      line-height: 1.15;
    }
    .subtitle {
      margin: 8px 0 0;
      color: ${t.muted};
      font-size: 13px;
      line-height: 1.45;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }
    .chip {
      padding: 6px 10px;
      border-radius: 999px;
      background: ${t.chipBg};
      color: ${t.chipText};
      font-size: 12px;
      font-weight: 600;
      line-height: 1;
    }
    .panel {
      overflow: hidden;
    }
    .panel-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border-bottom: 1px solid ${t.rowBorder};
    }
    .panel-head h2 {
      margin: 0;
      color: ${t.title};
      font-size: 14px;
      line-height: 1.2;
    }
    .content {
      padding: 12px 14px;
      background: ${t.contentBg};
    }
    .empty {
      padding: 16px;
      color: ${t.muted};
      font-size: 13px;
      text-align: center;
    }
  `;
}
