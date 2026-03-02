import { z } from 'zod';
import { buildRawEmail, getGmailClient, withGmailRetry } from '../utils/gmail-api.js';
import { createMcpError, GmailErrorCode } from '../utils/errors.js';

export const CreateDraftInputSchema = {
  to: z.array(z.string().email()).min(1).describe('Recipient list'),
  cc: z.array(z.string().email()).optional().describe('CC recipient list'),
  bcc: z.array(z.string().email()).optional().describe('BCC recipient list'),
  subject: z.string().min(1).describe('Draft subject'),
  bodyText: z.string().optional().describe('Plain text body'),
  bodyHtml: z.string().optional().describe('HTML body'),
  replyTo: z.string().email().optional().describe('Optional Reply-To email address'),
  inReplyTo: z.string().optional().describe('Optional In-Reply-To message-id header for true email replies'),
  references: z.array(z.string()).optional().describe('Optional References message-id chain for true email replies'),
  threadId: z.string().optional().describe('Optional thread ID for reply context'),
  attachments: z
    .unknown()
    .optional()
    .describe('Not supported. If provided, the tool will return guidance to include file links in the email body.'),
};

export const SendDraftInputSchema = {
  draftId: z.string().min(1).describe('Gmail draft ID'),
};

export interface CreateDraftParams {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  replyTo?: string;
  inReplyTo?: string;
  references?: string[];
  threadId?: string;
  attachments?: unknown;
}

export interface SendDraftParams {
  draftId: string;
}

export async function gmailCreateDraft(params: CreateDraftParams) {
  if (params.attachments !== undefined) {
    throw createMcpError(
      GmailErrorCode.InvalidParams,
      'Attachments are not supported by gmailCreateDraft. Include file links in the email body instead.'
    );
  }

  const gmail = getGmailClient();

  const raw = buildRawEmail({
    to: params.to,
    cc: params.cc,
    bcc: params.bcc,
    subject: params.subject,
    bodyText: params.bodyText,
    bodyHtml: params.bodyHtml,
    replyTo: params.replyTo,
    inReplyTo: params.inReplyTo,
    references: params.references,
  });

  const response = await withGmailRetry(
    () =>
      gmail.users.drafts.create({
        userId: 'me',
        requestBody: {
          message: {
            raw,
            threadId: params.threadId,
          },
        },
      }),
    'gmailCreateDraft'
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            draftId: response.data.id,
            messageId: response.data.message?.id,
            threadId: response.data.message?.threadId,
            success: true,
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function gmailSendDraft(params: SendDraftParams) {
  const gmail = getGmailClient();

  const response = await withGmailRetry(
    () =>
      gmail.users.drafts.send({
        userId: 'me',
        requestBody: {
          id: params.draftId,
        },
      }),
    'gmailSendDraft'
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            messageId: response.data.id,
            threadId: response.data.threadId,
            labelIds: response.data.labelIds,
            success: true,
          },
          null,
          2
        ),
      },
    ],
  };
}
