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

export async function formsListResponses(params: ListResponsesParams) {
  const response = await withFormsRetry(
    () =>
      callFormsApi<ListResponsesResponse>(`/forms/${params.formId}/responses`, {
        query: {
          pageSize: params.pageSize ?? 100,
          pageToken: params.pageToken,
          filter: params.filter,
        },
      }),
    'formsListResponses'
  );

  const responses = response.responses ?? [];

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
  };
}

export async function formsGetResponse(params: GetResponseParams) {
  const response = await withFormsRetry(
    () => callFormsApi<FormResponse>(`/forms/${params.formId}/responses/${params.responseId}`),
    'formsGetResponse'
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            formId: params.formId,
            response: summarizeResponse(response),
          },
          null,
          2
        ),
      },
    ],
  };
}
