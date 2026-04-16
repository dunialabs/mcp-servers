import { z } from 'zod';
import { callFormsApi, withFormsRetry } from '../utils/forms-api.js';

export const ListResponsesInputSchema = {
  formId: z.string().min(1).describe('Google Form ID'),
  pageSize: z.number().int().min(1).max(5000).optional().describe('Page size, max 5000'),
  pageToken: z.string().optional().describe('Next page token from previous response'),
  filter: z.string().optional().describe('Forms API filter expression'),
};

export const GetResponseInputSchema = {
  formId: z.string().min(1).describe('Google Form ID'),
  responseId: z.string().min(1).describe('Response ID'),
};

export interface ListResponsesParams {
  formId: string;
  pageSize?: number;
  pageToken?: string;
  filter?: string;
}

export interface GetResponseParams {
  formId: string;
  responseId: string;
}

interface FormResponse {
  responseId?: string;
  createTime?: string;
  lastSubmittedTime?: string;
  respondentEmail?: string;
  answers?: Record<string, unknown>;
}

interface ListResponsesResponse {
  responses?: FormResponse[];
  nextPageToken?: string;
}

interface FormShape {
  formId?: string;
  info?: {
    title?: string;
    documentTitle?: string;
  };
  responderUri?: string;
  items?: Array<{
    title?: string;
    questionItem?: {
      question?: {
        questionId?: string;
      };
    };
  }>;
}

function summarizeResponse(response: FormResponse) {
  return {
    responseId: response.responseId,
    createTime: response.createTime,
    lastSubmittedTime: response.lastSubmittedTime,
    respondentEmail: response.respondentEmail,
    answerCount: Object.keys(response.answers ?? {}).length,
    answers: response.answers,
  };
}

function summarizeAnswers(
  answers?: Record<string, unknown>,
  questionTitleMap: Record<string, string> = {}
) {
  return Object.entries(answers ?? {}).map(([questionId, value]) => {
    const answerRecord = value as Record<string, unknown>;
    const textAnswers = (answerRecord.textAnswers as { answers?: Array<{ value?: string }> } | undefined)?.answers;
    const choiceAnswers = (answerRecord.choiceAnswers as { answers?: Array<{ value?: string }> } | undefined)?.answers;
    const fileUploadAnswers = (answerRecord.fileUploadAnswers as { answers?: Array<{ fileId?: string; fileName?: string }> } | undefined)?.answers;

    return {
      questionId,
      questionTitle: questionTitleMap[questionId] ?? null,
      text: textAnswers?.map((item) => item.value ?? '').filter(Boolean) ?? [],
      choices: choiceAnswers?.map((item) => item.value ?? '').filter(Boolean) ?? [],
      files:
        fileUploadAnswers?.map((item) => ({
          fileId: item.fileId ?? null,
          fileName: item.fileName ?? null,
        })) ?? [],
    };
  });
}

function buildQuestionTitleMap(form?: FormShape | null) {
  return Object.fromEntries(
    (form?.items ?? [])
      .map((item, index) => {
        const questionId = item.questionItem?.question?.questionId;
        if (!questionId) {
          return null;
        }

        return [questionId, item.title?.trim() || `Question ${index + 1}`] as const;
      })
      .filter((entry): entry is readonly [string, string] => entry !== null)
  );
}

export async function formsListResponses(params: ListResponsesParams) {
  const [response, form] = await Promise.all([
    withFormsRetry(
      () =>
        callFormsApi<ListResponsesResponse>(`/forms/${params.formId}/responses`, {
          query: {
            pageSize: params.pageSize ?? 100,
            pageToken: params.pageToken,
            filter: params.filter,
          },
        }),
      'formsListResponses'
    ),
    withFormsRetry(
      () => callFormsApi<FormShape>(`/forms/${params.formId}`),
      'formsListResponses.getForm'
    ),
  ]);

  const responses = response.responses ?? [];
  const questionTitleMap = buildQuestionTitleMap(form);

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            formId: params.formId,
            count: responses.length,
            nextPageToken: response.nextPageToken,
            responses: responses.map((item) => summarizeResponse(item)),
          },
          null,
          2
        ),
      },
    ],
    structuredContent: {
      kind: 'gforms-response-list',
      formId: params.formId,
      form: {
        formId: form.formId ?? params.formId,
        title: form.info?.title ?? form.info?.documentTitle ?? 'Form',
        documentTitle: form.info?.documentTitle ?? null,
        responderUri: form.responderUri ?? null,
      },
      count: responses.length,
      nextPageToken: response.nextPageToken ?? null,
      responses: responses.map((item) => {
        const summary = summarizeResponse(item);
        return {
          ...summary,
          answerPreview: summarizeAnswers(item.answers, questionTitleMap)
            .flatMap((entry) => {
              const values = [
                ...(entry.text ?? []),
                ...(entry.choices ?? []),
                ...((entry.files ?? []).map((file) => file.fileName ?? file.fileId ?? 'File')),
              ].filter(Boolean);

              if (!values.length) {
                return [];
              }

              return [
                {
                  questionTitle: entry.questionTitle ?? 'Question',
                  value: values.join(', '),
                },
              ];
            }),
        };
      }),
    },
  };
}

export async function formsGetResponse(params: GetResponseParams) {
  const [response, form] = await Promise.all([
    withFormsRetry(
      () => callFormsApi<FormResponse>(`/forms/${params.formId}/responses/${params.responseId}`),
      'formsGetResponse'
    ),
    withFormsRetry(
      () => callFormsApi<FormShape>(`/forms/${params.formId}`),
      'formsGetResponse.getForm'
    ),
  ]);

  const summary = summarizeResponse(response);
  const questionTitleMap = buildQuestionTitleMap(form);

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            formId: params.formId,
            response: summary,
          },
          null,
          2
        ),
      },
    ],
    structuredContent: {
      kind: 'gforms-response-detail',
      formId: params.formId,
      form: {
        formId: form.formId ?? params.formId,
        title: form.info?.title ?? form.info?.documentTitle ?? 'Form',
        documentTitle: form.info?.documentTitle ?? null,
        responderUri: form.responderUri ?? null,
      },
      response: summary,
      answerEntries: summarizeAnswers(response.answers, questionTitleMap),
    },
  };
}
