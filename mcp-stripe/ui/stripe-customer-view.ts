import {
  App,
  PostMessageTransport,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from '@modelcontextprotocol/ext-apps';
import {
  baseShellStyles,
  detectDarkTheme,
  escapeHtml,
  formatCurrency,
  formatDate,
  getTheme,
} from './stripe-shared.js';

type CustomerPayload = {
  kind?: 'stripe-customer-detail';
  customer?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    description?: string | null;
    currency?: string | null;
    balance?: number | null;
    delinquent?: boolean | null;
    created?: number | null;
    address?: Record<string, string | null> | null;
    metadata?: Record<string, string>;
  } | null;
};

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing root element');

const app = new App({ name: 'stripe-customer-view', version: '0.1.0' }, {}, { autoResize: true });
let payload: CustomerPayload = {};
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

function render() {
  const t = getTheme(isDarkTheme);
  const customer = payload.customer;
  const metadataEntries = Object.entries(customer?.metadata ?? {});
  const address = customer?.address
    ? Object.values(customer.address).filter(Boolean).join(', ')
    : '';

  root.innerHTML = `
    <style>
      ${baseShellStyles(t)}
      .meta { display: grid; gap: 10px; }
      .meta-row { display: grid; grid-template-columns: 110px 1fr; gap: 12px; padding: 10px 0; border-top: 1px solid ${t.rowBorder}; }
      .meta-row:first-child { border-top: 0; padding-top: 0; }
      .meta-label { color: ${t.muted}; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }
      .meta-value { color: ${t.title}; font-size: 13px; line-height: 1.45; word-break: break-word; }
      .meta-grid { display: grid; gap: 8px; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); }
      .meta-card { padding: 12px; border-radius: 14px; background: ${t.contentBg}; border: 1px solid ${t.rowBorder}; }
      .meta-card-label { color: ${t.muted}; font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; }
      .meta-card-value { margin-top: 6px; color: ${t.title}; font-size: 14px; line-height: 1.35; }
    </style>
    <div class="shell">
      <section class="hero">
        <p class="eyebrow">Stripe</p>
        <h1>${escapeHtml(customer?.name ?? customer?.email ?? 'Customer')}</h1>
        <p class="subtitle">${escapeHtml(customer?.email ?? customer?.description ?? 'Customer detail')}</p>
        <div class="chips">
          <span class="chip">Created: ${escapeHtml(formatDate(customer?.created))}</span>
          ${customer?.currency ? `<span class="chip">Currency: ${escapeHtml(customer.currency.toUpperCase())}</span>` : ''}
          ${customer?.delinquent ? '<span class="chip">Delinquent</span>' : ''}
        </div>
      </section>
      <section class="panel">
        <div class="content">
          <div class="meta-grid">
            <div class="meta-card">
              <div class="meta-card-label">Balance</div>
              <div class="meta-card-value">${escapeHtml(formatCurrency(customer?.balance, customer?.currency))}</div>
            </div>
            <div class="meta-card">
              <div class="meta-card-label">Phone</div>
              <div class="meta-card-value">${escapeHtml(customer?.phone ?? '—')}</div>
            </div>
          </div>
        </div>
      </section>
      <section class="panel">
        <div class="panel-head"><h2>Details</h2></div>
        <div class="content">
          <div class="meta">
            <div class="meta-row"><div class="meta-label">Email</div><div class="meta-value">${escapeHtml(customer?.email ?? '—')}</div></div>
            <div class="meta-row"><div class="meta-label">Address</div><div class="meta-value">${escapeHtml(address || '—')}</div></div>
            <div class="meta-row"><div class="meta-label">Description</div><div class="meta-value">${escapeHtml(customer?.description ?? '—')}</div></div>
          </div>
        </div>
      </section>
      ${
        metadataEntries.length
          ? `<section class="panel">
              <div class="panel-head"><h2>Metadata</h2></div>
              <div class="content">
                <div class="meta">
                  ${metadataEntries
                    .map(
                      ([key, value]) => `<div class="meta-row"><div class="meta-label">${escapeHtml(key)}</div><div class="meta-value">${escapeHtml(value)}</div></div>`
                    )
                    .join('')}
                </div>
              </div>
            </section>`
          : ''
      }
    </div>
  `;

  notifySizeChanged();
}

app.ontoolresult = (result) => {
  payload = (result.structuredContent ?? {}) as CustomerPayload;
  render();
};

app.onhostcontextchanged = () => {
  applyHost();
  if ('kind' in payload) render();
};

void app.connect(new PostMessageTransport(window.parent, window.parent)).then(() => {
  applyHost();
});
