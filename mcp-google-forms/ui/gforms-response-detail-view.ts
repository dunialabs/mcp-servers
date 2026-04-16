import {
  App,
  PostMessageTransport,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from '@modelcontextprotocol/ext-apps';
import { baseShellStyles, detectDarkTheme, escapeHtml, formatDate, getTheme } from './gforms-shared.js';

type AnswerEntry = {
  questionId?: string;
  questionTitle?: string | null;
  text?: string[];
  choices?: string[];
  files?: Array<{ fileId?: string | null; fileName?: string | null }>;
};

type FormSummary = {
  formId?: string;
  title?: string;
  documentTitle?: string | null;
  responderUri?: string | null;
};

type ResponseSummary = {
  responseId?: string;
  createTime?: string;
  lastSubmittedTime?: string;
  respondentEmail?: string;
  answerCount?: number;
};

type Payload = {
  kind?: 'gforms-response-detail';
  formId?: string;
  form?: FormSummary | null;
  response?: ResponseSummary | null;
  answerEntries?: AnswerEntry[];
};

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing root element');

const app = new App({ name: 'gforms-response-detail-view', version: '0.1.0' }, {}, { autoResize: true });
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
  const response = payload.response;
  const answers = payload.answerEntries ?? [];
  const respondentLabel = response?.respondentEmail ?? 'Anonymous respondent';
  const formTitle = form?.title ?? form?.documentTitle ?? 'Form response';

  root.innerHTML = `
    <style>
      ${baseShellStyles(t)}
      .answer-list { display: grid; gap: 10px; }
      .answer-card { padding: 12px; border-radius: 14px; background: ${t.contentBg}; border: 1px solid ${t.rowBorder}; }
      .answer-title { font-size: 14px; font-weight: 700; color: ${t.title}; }
      .answer-body { margin-top: 6px; color: ${t.text}; font-size: 12px; line-height: 1.55; }
      .answer-card .chips { margin-top: 8px; }
      .answer-link { color: ${t.accent}; font-size: 13px; font-weight: 600; text-decoration: none; }
      .answer-link:hover { text-decoration: underline; }
    </style>
    <div class="shell">
      <section class="hero">
        <p class="eyebrow">Google Forms</p>
        <h1>${escapeHtml(formTitle)}</h1>
        <p class="subtitle">${escapeHtml(respondentLabel)}</p>
        <div class="chips">
          <span class="chip">Answers: ${response?.answerCount ?? 0}</span>
          <span class="chip">Submitted: ${escapeHtml(formatDate(response?.lastSubmittedTime ?? response?.createTime))}</span>
        </div>
      </section>
      <section class="panel">
        <div class="panel-head">
          <h2>Answers</h2>
          ${
            form?.responderUri
              ? `<a class="answer-link" href="${escapeHtml(form.responderUri)}" target="_blank" rel="noopener noreferrer">Open in Forms</a>`
              : ''
          }
        </div>
        <div class="content">
          ${
            answers.length
              ? `<div class="answer-list">${answers
                  .map(
                    (entry) => `
                      <div class="answer-card">
                        <div class="answer-title">${escapeHtml(entry.questionTitle ?? 'Question')}</div>
                        <div class="answer-body">
                          ${escapeHtml(
                            [
                              ...(entry.text ?? []),
                              ...(entry.choices ?? []),
                              ...((entry.files ?? []).map((file) => file.fileName ?? file.fileId ?? 'File')),
                            ].join(' | ') || 'No answer content'
                          )}
                        </div>
                      </div>
                    `
                  )
                  .join('')}</div>`
              : '<div class="empty">No answer entries found.</div>'
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
