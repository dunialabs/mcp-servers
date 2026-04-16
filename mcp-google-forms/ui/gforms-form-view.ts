import {
  App,
  PostMessageTransport,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from '@modelcontextprotocol/ext-apps';
import { baseShellStyles, detectDarkTheme, escapeHtml, getTheme } from './gforms-shared.js';

type FormItem = {
  index?: number;
  itemId?: string | null;
  title?: string | null;
  description?: string | null;
  kind?: string | null;
  required?: boolean;
  questionId?: string | null;
  options?: string[];
};

type FormPayload = {
  kind?: 'gforms-form-detail';
  form?: {
    formId?: string;
    title?: string;
    documentTitle?: string;
    responderUri?: string;
    revisionId?: string;
    linkedSheetId?: string;
    questionCount?: number;
    itemCount?: number;
  } | null;
  items?: FormItem[];
};

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing root element');

const app = new App({ name: 'gforms-form-view', version: '0.1.0' }, {}, { autoResize: true });
let payload: FormPayload = {};
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
  const form = payload.form;
  const items = payload.items ?? [];
  const revisionLabel = form?.revisionId ? String(Number.parseInt(form.revisionId, 10) || form.revisionId) : 'Unknown';

  root.innerHTML = `
    <style>
      ${baseShellStyles(t)}
      .item-list { display: grid; gap: 10px; }
      .item-card { padding: 12px; border-radius: 14px; background: ${t.contentBg}; border: 1px solid ${t.rowBorder}; }
      .item-title { font-size: 15px; font-weight: 700; color: ${t.title}; }
      .item-subtitle { margin-top: 4px; font-size: 12px; line-height: 1.45; color: ${t.text}; }
      .item-card .chips { margin-top: 8px; }
    </style>
    <div class="shell">
      <section class="hero">
        <p class="eyebrow">Google Forms</p>
        <h1>${escapeHtml(form?.title ?? 'Form')}</h1>
        <p class="subtitle">${escapeHtml(form?.documentTitle ?? 'Form structure preview')}</p>
        <div class="chips">
          <span class="chip">Questions: ${form?.questionCount ?? 0}</span>
          <span class="chip">Items: ${form?.itemCount ?? 0}</span>
          ${form?.linkedSheetId ? '<span class="chip">Linked Sheet</span>' : ''}
          <span class="chip">Form ID: ${escapeHtml(form?.formId ?? 'Unknown')}</span>
          <span class="chip">Revision: ${escapeHtml(revisionLabel)}</span>
          <span class="chip">Responses: ${form?.responderUri ? 'Open' : 'Unavailable'}</span>
        </div>
      </section>
      <section class="panel">
        <div class="panel-head">
          <h2>Structure</h2>
          ${form?.responderUri ? `<a href="${escapeHtml(form.responderUri)}" target="_blank" rel="noopener noreferrer">Open Form</a>` : ''}
        </div>
        <div class="content">
          ${
            items.length
              ? `<div class="item-list">${items
                  .map(
                    (item) => `
                      <div class="item-card">
                        <div class="item-title">${escapeHtml(item.title ?? `Item ${(item.index ?? 0) + 1}`)}</div>
                        <div class="item-subtitle">${escapeHtml(item.description ?? 'No description')}</div>
                        <div class="chips">
                          <span class="chip">${escapeHtml(item.kind ?? 'item')}</span>
                          ${item.required ? '<span class="chip">Required</span>' : ''}
                          ${(item.options ?? []).slice(0, 3).map((option) => `<span class="chip">${escapeHtml(option)}</span>`).join('')}
                        </div>
                      </div>
                    `
                  )
                  .join('')}</div>`
              : '<div class="empty">No form items found.</div>'
          }
        </div>
      </section>
    </div>
  `;
  notifySizeChanged();
}

app.ontoolresult = (result) => {
  payload = (result.structuredContent ?? {}) as FormPayload;
  render();
};

app.onhostcontextchanged = () => {
  applyHost();
  if ('kind' in payload) render();
};

void app.connect(new PostMessageTransport(window.parent, window.parent)).then(() => {
  applyHost();
});
