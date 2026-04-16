export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function formatDate(value?: string | null): string {
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

type HostContextProvider = {
  getHostContext: () => {
    theme?: { mode?: string; appearance?: string; colorScheme?: string };
  } | null | undefined;
};

export function detectDarkTheme(app: HostContextProvider): boolean {
  const context = app.getHostContext();
  const theme = context?.theme as { mode?: string; appearance?: string; colorScheme?: string } | undefined;
  const mode = (theme?.mode ?? theme?.appearance ?? theme?.colorScheme ?? '').toLowerCase();
  if (mode.includes('dark')) return true;
  if (mode.includes('light')) return false;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function getTheme(isDarkTheme: boolean) {
  return isDarkTheme
    ? {
        accent: '#b39ddb',
        shellBg:
          'radial-gradient(circle at top left, rgba(179, 157, 219, 0.14), transparent 34%), linear-gradient(180deg, #12091f 0%, #0b0514 100%)',
        panelBg: 'rgba(24, 16, 38, 0.96)',
        panelBorder: 'rgba(179, 157, 219, 0.12)',
        shadow: '0 10px 24px rgba(0, 0, 0, 0.36)',
        title: '#ede7f6',
        text: '#cfc0e8',
        muted: '#9e89bb',
        chipBg: '#2a1a4a',
        chipText: '#ce93d8',
        headText: '#9e89bb',
        rowBorder: 'rgba(179, 157, 219, 0.08)',
        contentBg: 'rgba(18, 9, 31, 0.96)',
        link: '#ce93d8',
      }
    : {
        accent: '#673ab7',
        shellBg:
          'radial-gradient(circle at top left, rgba(103, 58, 183, 0.12), transparent 34%), linear-gradient(180deg, #faf8ff 0%, #f3eeff 100%)',
        panelBg: 'rgba(255, 255, 255, 0.94)',
        panelBorder: 'rgba(103, 58, 183, 0.14)',
        shadow: '0 8px 20px rgba(15, 23, 42, 0.06)',
        title: '#1e0a3c',
        text: '#3d2b6b',
        muted: '#6b5b8a',
        chipBg: '#ede7f6',
        chipText: '#4527a0',
        headText: '#7e6a9e',
        rowBorder: 'rgba(103, 58, 183, 0.08)',
        contentBg: 'rgba(255, 255, 255, 0.96)',
        link: '#673ab7',
      };
}

export function baseShellStyles(t: ReturnType<typeof getTheme>): string {
  return `
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
    .panel-head { padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid ${t.panelBorder}; }
    h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.16em; color: ${t.accent}; }
    .panel-head a { color: ${t.link}; text-decoration: none; font-weight: 600; font-size: 12px; }
    .panel-head a:hover { text-decoration: underline; }
    .content { padding: 12px; }
    .empty { padding: 18px 12px; color: ${t.muted}; font-size: 13px; }
  `;
}
