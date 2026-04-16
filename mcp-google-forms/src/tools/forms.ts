import { z } from 'zod';
import { callFormsApi, isRfc3339Utc, withFormsRetry } from '../utils/forms-api.js';
import { createMcpError, FormsErrorCode } from '../utils/errors.js';

export const CreateFormInputSchema = {
  title: z.string().min(1).max(300).describe('Form title'),
  documentTitle: z.string().min(1).max(300).optional().describe('Optional document title'),
  autoPublish: z.boolean().optional().describe('Auto publish form after create. Default true'),
  isAcceptingResponses: z
    .boolean()
    .optional()
    .describe('Accept responses after publish. Default true'),
};

export const GetFormInputSchema = {
  formId: z.string().min(1).describe('Google Form ID'),
};

export const BatchUpdateFormInputSchema = {
  formId: z.string().min(1).describe('Google Form ID'),
  requests: z.array(z.record(z.unknown())).min(1).describe('BatchUpdate request list'),
  includeFormInResponse: z.boolean().optional().describe('Include updated form in response'),
  writeControl: z.record(z.unknown()).optional().describe('Write control payload'),
};

export const SetPublishSettingsInputSchema = {
  formId: z.string().min(1).describe('Google Form ID'),
  isPublished: z.boolean().describe('Whether the form is published'),
  isAcceptingResponses: z
    .boolean()
    .optional()
    .describe('Whether published form accepts new responses'),
};

export const GetFormSummaryInputSchema = {
  formId: z.string().min(1).describe('Google Form ID'),
  includeLatestResponse: z.boolean().optional().describe('Include the latest response preview'),
  latestResponseScanLimit: z
    .number()
    .int()
    .min(1)
    .max(5000)
    .optional()
    .describe('Max responses to scan when includeLatestResponse=true. Default 200'),
};

interface FormInfo {
  title?: string;
  documentTitle?: string;
}

interface FormShape {
  formId?: string;
  info?: FormInfo;
  settings?: Record<string, unknown>;
  items?: Array<Record<string, unknown>>;
  responderUri?: string;
  revisionId?: string;
  linkedSheetId?: string;
  publishSettings?: Record<string, unknown>;
}

interface FormItemShape {
  itemId?: string;
  title?: string;
  description?: string;
  questionItem?: {
    question?: {
      questionId?: string;
      required?: boolean;
      grading?: unknown;
      textQuestion?: {
        paragraph?: boolean;
      };
      choiceQuestion?: {
        type?: string;
        options?: Array<{ value?: string; isOther?: boolean }>;
      };
      fileUploadQuestion?: Record<string, unknown>;
      rowQuestion?: Record<string, unknown>;
      scaleQuestion?: Record<string, unknown>;
      dateQuestion?: Record<string, unknown>;
      timeQuestion?: Record<string, unknown>;
    };
  };
  pageBreakItem?: Record<string, unknown>;
  imageItem?: Record<string, unknown>;
  videoItem?: Record<string, unknown>;
}

interface BatchUpdateResponse {
  form?: FormShape;
  replies?: unknown[];
  writeControl?: Record<string, unknown>;
}

interface ListResponsesResponse {
  responses?: Array<Record<string, unknown>>;
  nextPageToken?: string;
}

interface PublishSettingsResponse {
  publishSettings?: Record<string, unknown>;
}

export interface CreateFormParams {
  title: string;
  documentTitle?: string;
  autoPublish?: boolean;
  isAcceptingResponses?: boolean;
}

export interface GetFormParams {
  formId: string;
}

export interface BatchUpdateFormParams {
  formId: string;
  requests: Array<Record<string, unknown>>;
  includeFormInResponse?: boolean;
  writeControl?: Record<string, unknown>;
}

export interface SetPublishSettingsParams {
  formId: string;
  isPublished: boolean;
  isAcceptingResponses?: boolean;
}

export interface GetFormSummaryParams {
  formId: string;
  includeLatestResponse?: boolean;
  latestResponseScanLimit?: number;
}

function summarizeForm(form: FormShape | null | undefined) {
  if (!form) {
    return null;
  }

  const items = form.items ?? [];
  const questionCount = items.filter((item) => (item.questionItem as unknown) !== undefined).length;

  return {
    formId: form.formId,
    title: form.info?.title,
    documentTitle: form.info?.documentTitle,
    responderUri: form.responderUri,
    revisionId: form.revisionId,
    linkedSheetId: form.linkedSheetId,
    questionCount,
    itemCount: items.length,
    settings: form.settings,
    publishSettings: form.publishSettings,
  };
}

function summarizeFormItems(items: FormItemShape[] = []) {
  return items.map((item, index) => {
    const question = item.questionItem?.question;
    let kind = 'item';
    let details: Record<string, unknown> = {};

    if (question?.textQuestion) {
      kind = question.textQuestion.paragraph ? 'paragraph' : 'text';
    } else if (question?.choiceQuestion) {
      kind = question.choiceQuestion.type?.toLowerCase() ?? 'choice';
      details = {
        options: (question.choiceQuestion.options ?? []).map((option) => option.value ?? 'Other'),
      };
    } else if (question?.fileUploadQuestion) {
      kind = 'file-upload';
    } else if (question?.rowQuestion) {
      kind = 'row';
    } else if (question?.scaleQuestion) {
      kind = 'scale';
    } else if (question?.dateQuestion) {
      kind = 'date';
    } else if (question?.timeQuestion) {
      kind = 'time';
    } else if (item.pageBreakItem) {
      kind = 'section-break';
    } else if (item.imageItem) {
      kind = 'image';
    } else if (item.videoItem) {
      kind = 'video';
    }

    return {
      index,
      itemId: item.itemId,
      title: item.title ?? `Item ${index + 1}`,
      description: item.description ?? null,
      kind,
      required: question?.required ?? false,
      questionId: question?.questionId ?? null,
      ...details,
    };
  });
}

function summarizeResponse(response: Record<string, unknown> | null | undefined) {
  if (!response) {
    return null;
  }
  return {
    responseId: response.responseId,
    createTime: response.createTime,
    lastSubmittedTime: response.lastSubmittedTime,
    respondentEmail: response.respondentEmail,
    answerCount: Object.keys((response.answers as Record<string, unknown> | undefined) ?? {}).length,
    answers: response.answers,
  };
}

interface LatestResponseResult {
  latestResponse: Record<string, unknown> | null;
  scannedCount: number;
  reachedLimit: boolean;
}

async function fetchLatestResponse(formId: string, scanLimit: number): Promise<LatestResponseResult> {
  let pageToken: string | undefined;
  let latest: Record<string, unknown> | null = null;
  let scannedCount = 0;
  let reachedLimit = false;

  do {
    const list = await withFormsRetry(
      () =>
        callFormsApi<ListResponsesResponse>(`/forms/${formId}/responses`, {
          query: {
            pageSize: 500,
            pageToken,
          },
        }),
      'formsGetFormSummary.listResponses'
    );

    for (const item of list.responses ?? []) {
      scannedCount += 1;
      if (!latest) {
        latest = item;
      } else {
        const currentTs = String(item.lastSubmittedTime ?? item.createTime ?? '');
        const latestTs = String(latest.lastSubmittedTime ?? latest.createTime ?? '');
        if (currentTs > latestTs) {
          latest = item;
        }
      }

      if (scannedCount >= scanLimit) {
        reachedLimit = true;
        break;
      }
    }

    if (reachedLimit) {
      break;
    }

    pageToken = list.nextPageToken;
  } while (pageToken);

  return {
    latestResponse: latest,
    scannedCount,
    reachedLimit,
  };
}

export async function formsSetPublishSettings(params: SetPublishSettingsParams) {
  const apiResponse = await setPublishSettingsRaw(params);

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            success: true,
            formId: params.formId,
            publishSettings: apiResponse.publishSettings ?? null,
          },
          null,
          2
        ),
      },
    ],
  };
}

async function setPublishSettingsRaw(params: SetPublishSettingsParams): Promise<PublishSettingsResponse> {
  const isAcceptingResponses = params.isPublished
    ? (params.isAcceptingResponses ?? true)
    : false;

  return withFormsRetry(
    () =>
      callFormsApi<PublishSettingsResponse>(`/forms/${params.formId}:setPublishSettings`, {
        method: 'POST',
        body: {
          publishSettings: {
            publishState: {
              isPublished: params.isPublished,
              isAcceptingResponses,
            },
          },
          updateMask: 'publishState',
        },
      }),
    'formsSetPublishSettings'
  );
}

export async function formsCreateForm(params: CreateFormParams) {
  const form = await withFormsRetry(
    () =>
      callFormsApi<FormShape>('/forms', {
        method: 'POST',
        body: {
          info: {
            title: params.title,
            documentTitle: params.documentTitle,
          },
        },
      }),
    'formsCreateForm'
  );

  const formId = form.formId;
  let publishResult: PublishSettingsResponse | null = null;

  if ((params.autoPublish ?? true) && formId) {
    publishResult = await setPublishSettingsRaw({
      formId,
      isPublished: true,
      isAcceptingResponses: params.isAcceptingResponses ?? true,
    });
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            form: summarizeForm(form),
            autoPublished: params.autoPublish ?? true,
            publishResult: publishResult
              ? {
                  formId,
                  publishSettings: publishResult.publishSettings ?? null,
                }
              : null,
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function formsGetForm(params: GetFormParams) {
  const form = await withFormsRetry(
    () => callFormsApi<FormShape>(`/forms/${params.formId}`),
    'formsGetForm'
  );

  const summary = summarizeForm(form);
  const items = summarizeFormItems((form.items as FormItemShape[] | undefined) ?? []);

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({ form: summary }, null, 2),
      },
    ],
    structuredContent: {
      kind: 'gforms-form-detail',
      form: summary,
      items,
    },
  };
}

export async function formsBatchUpdateForm(params: BatchUpdateFormParams) {
  const response = await withFormsRetry(
    () =>
      callFormsApi<BatchUpdateResponse>(`/forms/${params.formId}:batchUpdate`, {
        method: 'POST',
        body: {
          requests: params.requests,
          includeFormInResponse: params.includeFormInResponse ?? false,
          writeControl: params.writeControl,
        },
      }),
    'formsBatchUpdateForm'
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            success: true,
            formId: params.formId,
            replyCount: (response.replies ?? []).length,
            writeControl: response.writeControl ?? null,
            form: summarizeForm(response.form),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function formsGetFormSummary(params: GetFormSummaryParams) {
  const form = await withFormsRetry(
    () => callFormsApi<FormShape>(`/forms/${params.formId}`),
    'formsGetFormSummary.getForm'
  );

  const publishState = (form.publishSettings as Record<string, unknown> | undefined)?.publishState as
    | Record<string, unknown>
    | undefined;

  const scanLimit = params.latestResponseScanLimit ?? 200;
  let latestResponse: Record<string, unknown> | null = null;
  let latestResponseMeta: Record<string, unknown> | null = null;
  if (params.includeLatestResponse ?? false) {
    const latest = await fetchLatestResponse(params.formId, scanLimit);
    latestResponse = latest.latestResponse;
    latestResponseMeta = {
      scanLimit,
      scannedCount: latest.scannedCount,
      reachedLimit: latest.reachedLimit,
    };
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            formId: form.formId,
            title: form.info?.title,
            documentTitle: form.info?.documentTitle,
            responderUri: form.responderUri,
            revisionId: form.revisionId,
            questionCount: (form.items ?? []).filter((item) => item.questionItem !== undefined).length,
            itemCount: (form.items ?? []).length,
            isPublished: publishState?.isPublished ?? null,
            isAcceptingResponses: publishState?.isAcceptingResponses ?? null,
            latestResponse: summarizeResponse(latestResponse),
            latestResponseMeta,
          },
          null,
          2
        ),
      },
    ],
  };
}

function buildCreateItemRequest(
  title: string,
  description: string | undefined,
  question: Record<string, unknown>,
  index: number
): Record<string, unknown> {
  return {
    createItem: {
      item: {
        title,
        description,
        questionItem: {
          question,
        },
      },
      location: {
        index,
      },
    },
  };
}

export const AddTextQuestionInputSchema = {
  formId: z.string().min(1).describe('Google Form ID'),
  title: z.string().min(1).max(300).describe('Question title'),
  description: z.string().max(1000).optional().describe('Question description'),
  required: z.boolean().optional().describe('Whether answer is required'),
  paragraph: z.boolean().optional().describe('Paragraph text if true, short text if false'),
  index: z.number().int().min(0).optional().describe('Insert index, default 0'),
};

export const AddMultipleChoiceQuestionInputSchema = {
  formId: z.string().min(1).describe('Google Form ID'),
  title: z.string().min(1).max(300).describe('Question title'),
  description: z.string().max(1000).optional().describe('Question description'),
  required: z.boolean().optional().describe('Whether answer is required'),
  options: z.array(z.string().min(1).max(300)).min(2).describe('Choice options'),
  type: z
    .enum(['RADIO', 'CHECKBOX', 'DROP_DOWN'])
    .optional()
    .describe('Choice question type, default RADIO'),
  shuffle: z.boolean().optional().describe('Shuffle options'),
  index: z.number().int().min(0).optional().describe('Insert index, default 0'),
};

export interface AddTextQuestionParams {
  formId: string;
  title: string;
  description?: string;
  required?: boolean;
  paragraph?: boolean;
  index?: number;
}

export interface AddMultipleChoiceQuestionParams {
  formId: string;
  title: string;
  description?: string;
  required?: boolean;
  options: string[];
  type?: 'RADIO' | 'CHECKBOX' | 'DROP_DOWN';
  shuffle?: boolean;
  index?: number;
}

export async function formsAddTextQuestion(params: AddTextQuestionParams) {
  const question = {
    required: params.required ?? false,
    textQuestion: {
      paragraph: params.paragraph ?? false,
    },
  };

  const request = buildCreateItemRequest(
    params.title,
    params.description,
    question,
    params.index ?? 0
  );

  return formsBatchUpdateForm({
    formId: params.formId,
    requests: [request],
    includeFormInResponse: true,
  });
}

export async function formsAddMultipleChoiceQuestion(params: AddMultipleChoiceQuestionParams) {
  if (params.options.length < 2) {
    throw createMcpError(
      FormsErrorCode.InvalidParams,
      'Multiple choice question requires at least 2 options'
    );
  }

  const question = {
    required: params.required ?? false,
    choiceQuestion: {
      type: params.type ?? 'RADIO',
      shuffle: params.shuffle ?? false,
      options: params.options.map((option) => ({ value: option })),
    },
  };

  const request = buildCreateItemRequest(
    params.title,
    params.description,
    question,
    params.index ?? 0
  );

  return formsBatchUpdateForm({
    formId: params.formId,
    requests: [request],
    includeFormInResponse: true,
  });
}

export const ListResponsesSinceInputSchema = {
  formId: z.string().min(1).describe('Google Form ID'),
  since: z.string().min(1).describe('RFC3339 UTC timestamp, e.g. 2026-03-17T00:00:00Z'),
  pageSize: z.number().int().min(1).max(5000).optional().describe('Page size, max 5000'),
  pageToken: z.string().optional().describe('Next page token from previous response'),
};

export interface ListResponsesSinceParams {
  formId: string;
  since: string;
  pageSize?: number;
  pageToken?: string;
}

export async function formsListResponsesSince(params: ListResponsesSinceParams) {
  if (!isRfc3339Utc(params.since)) {
    throw createMcpError(
      FormsErrorCode.InvalidParams,
      'since must be RFC3339 UTC format, e.g. 2026-03-17T00:00:00Z'
    );
  }

  const response = await withFormsRetry(
    () =>
      callFormsApi<ListResponsesResponse & { nextPageToken?: string }>(
        `/forms/${params.formId}/responses`,
        {
          query: {
            pageSize: params.pageSize ?? 100,
            pageToken: params.pageToken,
            filter: `timestamp >= ${params.since}`,
          },
        }
      ),
    'formsListResponsesSince'
  );

  const responses = response.responses ?? [];

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            formId: params.formId,
            since: params.since,
            count: responses.length,
            nextPageToken: response.nextPageToken,
            responses: responses.map((item) => summarizeResponse(item)),
          },
          null,
          2
        ),
      },
    ],
  };
}
