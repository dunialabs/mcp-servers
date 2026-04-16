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
  accent: '#635bff',
  shellBg:
    'radial-gradient(circle at top left, rgba(99, 91, 255, 0.12), transparent 34%), linear-gradient(180deg, #f8f8ff 0%, #f0efff 100%)',
  panelBg: 'rgba(255, 255, 255, 0.94)',
  panelBorder: 'rgba(99, 91, 255, 0.14)',
  shadow: '0 8px 20px rgba(15, 23, 42, 0.06)',
  title: '#0a0b1e',
  text: '#3c3d5c',
  muted: '#6b6c89',
  chipBg: '#ebebff',
  chipText: '#4338ca',
  headText: '#7c7d9c',
  rowBorder: 'rgba(99, 91, 255, 0.08)',
  contentBg: 'rgba(255, 255, 255, 0.96)',
  link: '#635bff',
};

const darkTheme: Theme = {
  accent: '#a09cff',
  shellBg:
    'radial-gradient(circle at top left, rgba(160, 156, 255, 0.14), transparent 34%), linear-gradient(180deg, #0d0d1f 0%, #08081a 100%)',
  panelBg: 'rgba(18, 18, 36, 0.96)',
  panelBorder: 'rgba(160, 156, 255, 0.12)',
  shadow: '0 10px 24px rgba(0, 0, 0, 0.36)',
  title: '#eeeeff',
  text: '#c4c3e8',
  muted: '#8e8daa',
  chipBg: '#1a1a3a',
  chipText: '#c7c4ff',
  headText: '#8e8daa',
  rowBorder: 'rgba(160, 156, 255, 0.08)',
  contentBg: 'rgba(10, 10, 28, 0.96)',
  link: '#a09cff',
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

export function formatDate(value?: number | string | null): string {
  if (!value) return 'Unknown';
  const date =
    typeof value === 'number' ? new Date(value * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatCurrency(
  amount?: number | null,
  currency?: string | null
): string {
  if (amount === null || amount === undefined) return '—';
  const code = (currency || 'usd').toUpperCase();
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${code}`;
  }
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
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
