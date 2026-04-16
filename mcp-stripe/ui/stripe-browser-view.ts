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

type CustomerItem = {
  id?: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  currency?: string | null;
  balance?: number | null;
  created?: number | null;
};

type PaymentItem = {
  id?: string;
  customerId?: string | null;
  description?: string | null;
  amount?: number | null;
  currency?: string | null;
  status?: string | null;
  created?: number | null;
};

type InvoiceItem = {
  id?: string;
  number?: string | null;
  customerId?: string | null;
  amountDue?: number | null;
  amountPaid?: number | null;
  currency?: string | null;
  status?: string | null;
  dueDate?: number | null;
  created?: number | null;
};

type Payload = {
  kind?: 'stripe-customer-list' | 'stripe-payment-list' | 'stripe-invoice-list';
  count?: number;
  hasMore?: boolean;
  filters?: Record<string, string | null | undefined>;
  customers?: CustomerItem[];
  payments?: PaymentItem[];
  invoices?: InvoiceItem[];
};

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing root element');

const app = new App({ name: 'stripe-browser-view', version: '0.1.0' }, {}, { autoResize: true });
let payload: Payload = {};
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

function renderRows(kind: Payload['kind']) {
  if (kind === 'stripe-customer-list') {
    const rows = payload.customers ?? [];
    return {
      title: 'Customers',
      subtitle: 'Browse customer records in Stripe.',
      head: ['Customer', 'Created', 'Balance'],
      body: rows.length
        ? rows
            .map(
              (item) => `
                <div class="row">
                  <div>
                    <div class="item-title">${escapeHtml(item.name ?? item.email ?? 'Unnamed customer')}</div>
                    <div class="item-subtitle">${escapeHtml(item.email ?? item.phone ?? 'No contact details')}</div>
                  </div>
                  <div class="cell">${escapeHtml(formatDate(item.created))}</div>
                  <div class="cell">${escapeHtml(formatCurrency(item.balance, item.currency))}</div>
                </div>
              `
            )
            .join('')
        : '<div class="empty">No customers found.</div>',
    };
  }

  if (kind === 'stripe-invoice-list') {
    const rows = payload.invoices ?? [];
    return {
      title: 'Invoices',
      subtitle: 'Review billing records and invoice status.',
      head: ['Invoice', 'Status', 'Amount'],
      body: rows.length
        ? rows
            .map(
              (item) => `
                <div class="row">
                  <div>
                    <div class="item-title">${escapeHtml(item.number ?? item.id ?? 'Invoice')}</div>
                    <div class="item-subtitle">${escapeHtml(item.customerId ?? 'No customer')}</div>
                  </div>
                  <div class="cell">
                    ${escapeHtml(item.status ?? 'unknown')}
                    <div class="item-subtitle">${escapeHtml(formatDate(item.dueDate ?? item.created))}</div>
                  </div>
                  <div class="cell">${escapeHtml(formatCurrency(item.amountDue ?? item.amountPaid, item.currency))}</div>
                </div>
              `
            )
            .join('')
        : '<div class="empty">No invoices found.</div>',
    };
  }

  const rows = payload.payments ?? [];
  return {
    title: 'Payments',
    subtitle: 'Browse Stripe payment activity.',
    head: ['Payment', 'Status', 'Amount'],
    body: rows.length
      ? rows
          .map(
            (item) => `
              <div class="row">
                <div>
                  <div class="item-title">${escapeHtml(item.description ?? item.customerId ?? item.id ?? 'Payment')}</div>
                  <div class="item-subtitle">${escapeHtml(item.customerId ?? 'No customer')}</div>
                </div>
                <div class="cell">
                  ${escapeHtml(item.status ?? 'unknown')}
                  <div class="item-subtitle">${escapeHtml(formatDate(item.created))}</div>
                </div>
                <div class="cell">${escapeHtml(formatCurrency(item.amount, item.currency))}</div>
              </div>
            `
          )
          .join('')
      : '<div class="empty">No payments found.</div>',
  };
}

function render() {
  const t = getTheme(isDarkTheme);
  const { title, subtitle, head, body } = renderRows(payload.kind);
  const filterEntries = Object.entries(payload.filters ?? {}).filter(([, value]) => value);

  root.innerHTML = `
    <style>
      ${baseShellStyles(t)}
      .head, .row { display: grid; grid-template-columns: minmax(240px, 2fr) minmax(140px, 1fr) minmax(110px, 0.9fr); gap: 12px; align-items: center; }
      .head { padding: 10px 14px; color: ${t.headText}; font-size: 12px; border-bottom: 1px solid ${t.rowBorder}; }
      .body { max-height: 560px; overflow: auto; background: ${t.contentBg}; }
      .row { padding: 11px 14px; border-bottom: 1px solid ${t.rowBorder}; }
      .row:last-child { border-bottom: 0; }
      .item-title { color: ${t.title}; font-size: 14px; font-weight: 700; }
      .item-subtitle { margin-top: 4px; color: ${t.muted}; font-size: 12px; line-height: 1.4; }
      .cell { color: ${t.text}; font-size: 12px; line-height: 1.45; }
      @media (max-width: 760px) { .head, .row { grid-template-columns: 1fr; } .head { display: none; } }
    </style>
    <div class="shell">
      <section class="hero">
        <p class="eyebrow">Stripe</p>
        <h1>${escapeHtml(title)}</h1>
        <p class="subtitle">${escapeHtml(subtitle)}</p>
        <div class="chips">
          <span class="chip">Count: ${payload.count ?? 0}</span>
          ${payload.hasMore ? '<span class="chip">More available</span>' : ''}
          ${filterEntries
            .map(([key, value]) => `<span class="chip">${escapeHtml(key)}: ${escapeHtml(value)}</span>`)
            .join('')}
        </div>
      </section>
      <section class="panel">
        <div class="head">
          ${head.map((label) => `<div>${escapeHtml(label)}</div>`).join('')}
        </div>
        <div class="body">${body}</div>
      </section>
    </div>
  `;

  notifySizeChanged();
}

app.ontoolresult = (result) => {
  payload = (result.structuredContent ?? {}) as Payload;
  render();
};

app.onhostcontextchanged = () => {
  applyHost();
  if ('kind' in payload) render();
};

void app.connect(new PostMessageTransport(window.parent, window.parent)).then(() => {
  applyHost();
});
