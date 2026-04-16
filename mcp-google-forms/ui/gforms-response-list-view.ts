import {
  App,
  PostMessageTransport,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from '@modelcontextprotocol/ext-apps';
import { baseShellStyles, detectDarkTheme, escapeHtml, formatDate, getTheme } from './gforms-shared.js';

type ResponseSummary = {
  responseId?: string;
  createTime?: string;
  lastSubmittedTime?: string;
  respondentEmail?: string;
  answerCount?: number;
  answerPreview?: Array<{ questionTitle?: string; value?: string }>;
};

type FormSummary = {
  formId?: string;
  title?: string;
  documentTitle?: string | null;
  responderUri?: string | null;
};

type Payload = {
  kind?: 'gforms-response-list';
  formId?: string;
  form?: FormSummary | null;
  count?: number;
  nextPageToken?: string | null;
  responses?: ResponseSummary[];
};

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing root element');

const app = new App({ name: 'gforms-response-list-view', version: '0.1.0' }, {}, { autoResize: true });
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

function render() {
  const t = getTheme(isDarkTheme);
  const form = payload.form;
  const responses = payload.responses ?? [];
  const formTitle = form?.title ?? form?.documentTitle ?? 'Responses';

  root.innerHTML = `
    <style>
      ${baseShellStyles(t)}
      .head, .row { display: grid; grid-template-columns: minmax(220px, 2fr) minmax(170px, 1.3fr) minmax(110px, 0.8fr); gap: 12px; align-items: center; }
      .head { padding: 9px 12px; color: ${t.headText}; font-size: 12px; border-bottom: 1px solid ${t.rowBorder}; }
      .body { max-height: 560px; overflow: auto; }
      .row { padding: 10px 12px; border-bottom: 1px solid ${t.rowBorder}; }
      .row:last-child { border-bottom: 0; }
      .item-title { font-size: 14px; font-weight: 700; color: ${t.title}; }
      .item-subtitle { margin-top: 3px; color: ${t.text}; font-size: 12px; }
      .preview-list { margin-top: 6px; display: grid; gap: 4px; }
      .preview-item { color: ${t.text}; font-size: 12px; line-height: 1.45; }
      .preview-label { color: ${t.muted}; }
      .cell { color: ${t.text}; font-size: 12px; }
      .panel-link { color: ${t.accent}; font-size: 13px; font-weight: 600; text-decoration: none; }
      .panel-link:hover { text-decoration: underline; }
      @media (max-width: 760px) { .head, .row { grid-template-columns: 1fr; } .head { display: none; } }
    </style>
    <div class="shell">
      <section class="hero">
        <p class="eyebrow">Google Forms</p>
        <h1>${escapeHtml(formTitle)}</h1>
        <p class="subtitle">Responses overview</p>
        <div class="chips">
          <span class="chip">Count: ${payload.count ?? 0}</span>
          ${payload.nextPageToken ? '<span class="chip">More available</span>' : ''}
        </div>
      </section>
      <section class="panel">
        <div class="panel-head">
          <h2>Responses</h2>
          ${
            form?.responderUri
              ? `<a class="panel-link" href="${escapeHtml(form.responderUri)}" target="_blank" rel="noopener noreferrer">Open in Forms</a>`
              : ''
          }
        </div>
        <div class="head">
          <div>Response</div>
          <div>Submitted</div>
          <div>Response ID</div>
        </div>
        <div class="body">
          ${
            responses.length
              ? responses
                  .map(
                    (item) => `
                      <div class="row">
                        <div>
                          <div class="item-title">${escapeHtml(item.respondentEmail ?? 'Anonymous respondent')}</div>
                          <div class="item-subtitle">${item.answerCount ?? 0} answer${(item.answerCount ?? 0) === 1 ? '' : 's'}</div>
                          ${
                            item.answerPreview?.length
                              ? `<div class="preview-list">${item.answerPreview
                                  .map(
                                    (entry) => `
                                      <div class="preview-item">
                                        <span class="preview-label">${escapeHtml(entry.questionTitle ?? 'Question')}:</span>
                                        ${escapeHtml(entry.value ?? '')}
                                      </div>
                                    `
                                  )
                                  .join('')}</div>`
                              : ''
                          }
                        </div>
                        <div class="cell">${escapeHtml(formatDate(item.lastSubmittedTime ?? item.createTime))}</div>
                        <div class="cell">Response ID: ${escapeHtml(item.responseId ?? 'Unknown')}</div>
                      </div>
                    `
                  )
                  .join('')
              : '<div class="empty">No responses found.</div>'
          }
        </div>
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
