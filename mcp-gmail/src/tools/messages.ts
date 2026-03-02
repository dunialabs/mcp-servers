import { gmail_v1 } from 'googleapis';
import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';
import { getGmailClient, summarizeMessage, withGmailRetry, buildRawEmail } from '../utils/gmail-api.js';
import { createMcpError, GmailErrorCode, validateStringArrayOrThrow } from '../utils/errors.js';

const MAX_RESULTS_LIMIT = 100;
const MAX_INLINE_ATTACHMENT_BYTES = 1024 * 1024;

export const ListMessagesInputSchema = {
  q: z.string().optional().describe('Gmail search query, e.g. "from:alice newer_than:7d"'),
  labelIds: z.array(z.string()).optional().describe('Label IDs filter, e.g. ["INBOX", "UNREAD"]'),
  maxResults: z.number().int().min(1).max(MAX_RESULTS_LIMIT).optional().describe('Result count (1-100, default 20)'),
  pageToken: z.string().optional().describe('Pagination token from previous response'),
  includeMessageDetails: z.boolean().optional().describe('Fetch per-message metadata (from/to/subject/date). Defaults to false to avoid N+1 API calls.'),
};

export const GetMessageInputSchema = {
  messageId: z.string().min(1).describe('Gmail message ID'),
  format: z.enum(['metadata', 'full']).optional().describe('Message format (default metadata)'),
  metadataHeaders: z.array(z.string()).optional().describe('Header names when format=metadata'),
};

export const SendMessageInputSchema = {
  to: z.array(z.string().email()).min(1).describe('Recipient list'),
  cc: z.array(z.string().email()).optional().describe('CC recipient list'),
  bcc: z.array(z.string().email()).optional().describe('BCC recipient list'),
  subject: z.string().min(1).describe('Email subject'),
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

export const ModifyLabelsInputSchema = {
  messageId: z.string().min(1).describe('Gmail message ID'),
  addLabelIds: z.array(z.string()).optional().describe('Labels to add'),
  removeLabelIds: z.array(z.string()).optional().describe('Labels to remove'),
};

export const TrashMessageInputSchema = {
  messageId: z.string().min(1).describe('Gmail message ID'),
};

export const UntrashMessageInputSchema = {
  messageId: z.string().min(1).describe('Gmail message ID'),
};

export const BatchModifyMessagesInputSchema = {
  messageIds: z.array(z.string().min(1)).min(1).describe('List of Gmail message IDs'),
  addLabelIds: z.array(z.string()).optional().describe('Labels to add to all messages'),
  removeLabelIds: z.array(z.string()).optional().describe('Labels to remove from all messages'),
};

export const GetAttachmentInputSchema = {
  messageId: z.string().min(1).describe('Gmail message ID'),
  attachmentId: z.string().min(1).describe('Attachment ID from message payload part.body.attachmentId'),
  decodeBase64: z.boolean().optional().describe('Decode and return UTF-8 text content (best for text attachments)'),
};

export const DownloadAttachmentInputSchema = {
  messageId: z.string().min(1).describe('Gmail message ID'),
  attachmentId: z.string().min(1).describe('Attachment ID from message payload part.body.attachmentId'),
  outputPath: z.string().min(1).describe('Output file path to write attachment bytes'),
};

export interface ListMessagesParams {
  q?: string;
  labelIds?: string[];
  maxResults?: number;
  pageToken?: string;
  includeMessageDetails?: boolean;
}

export interface GetMessageParams {
  messageId: string;
  format?: 'metadata' | 'full';
  metadataHeaders?: string[];
}

export interface SendMessageParams {
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

export interface ModifyLabelsParams {
  messageId: string;
  addLabelIds?: string[];
  removeLabelIds?: string[];
}

export interface TrashMessageParams {
  messageId: string;
}

export interface BatchModifyMessagesParams {
  messageIds: string[];
  addLabelIds?: string[];
  removeLabelIds?: string[];
}

export interface GetAttachmentParams {
  messageId: string;
  attachmentId: string;
  decodeBase64?: boolean;
}

export interface DownloadAttachmentParams {
  messageId: string;
  attachmentId: string;
  outputPath: string;
}

function normalizeBase64Url(input: string): string {
  const replaced = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = replaced.length % 4;
  if (pad === 0) {
    return replaced;
  }
  return replaced + '='.repeat(4 - pad);
}

function getAttachmentBytesOrThrow(encodedData: string | null | undefined, context: string): Buffer {
  if (!encodedData || encodedData.trim().length === 0) {
    throw createMcpError(
      GmailErrorCode.NotFound,
      `${context}: attachment payload is empty or unavailable`
    );
  }

  const normalized = normalizeBase64Url(encodedData);
  return Buffer.from(normalized, 'base64');
}

function resolveSafeOutputPath(outputPath: string): string {
  const baseDir = path.resolve(process.env.GMAIL_ATTACHMENT_OUTPUT_DIR || '/tmp/gmail-attachments');
  const resolvedPath = path.resolve(outputPath);
  const relative = path.relative(baseDir, resolvedPath);
  const isInsideBase = relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));

  if (!isInsideBase) {
    throw createMcpError(
      GmailErrorCode.InvalidParams,
      `outputPath must be inside allowed directory: ${baseDir}`
    );
  }

  return resolvedPath;
}

function findAttachmentPart(
  part: gmail_v1.Schema$MessagePart | undefined,
  attachmentId: string
): gmail_v1.Schema$MessagePart | undefined {
  if (!part) {
    return undefined;
  }

  if (part.body?.attachmentId === attachmentId) {
    return part;
  }

  const subParts = part.parts ?? [];
  for (const sub of subParts) {
    const found = findAttachmentPart(sub, attachmentId);
    if (found) {
      return found;
    }
  }

  return undefined;
}

export async function gmailListMessages(params: ListMessagesParams) {
  const gmail = getGmailClient();
  const maxResults = params.maxResults ?? 20;
  const includeMessageDetails = params.includeMessageDetails ?? false;

  const listResponse = await withGmailRetry(
    () =>
      gmail.users.messages.list({
        userId: 'me',
        q: params.q,
        labelIds: params.labelIds,
        maxResults,
        pageToken: params.pageToken,
        fields: 'messages/id,messages/threadId,nextPageToken,resultSizeEstimate',
      }),
    'gmailListMessages'
  );

  const refs = listResponse.data.messages ?? [];
  const basicMessages: Array<{ id: string; threadId?: string | null }> = refs.reduce(
    (acc, ref) => {
      if (ref.id) {
        acc.push({ id: ref.id, threadId: ref.threadId });
      }
      return acc;
    },
    [] as Array<{ id: string; threadId?: string | null }>
  );

  let detailed: Array<ReturnType<typeof summarizeMessage>> = [];
  if (includeMessageDetails) {
    const detailPromises = basicMessages.map((message) =>
      withGmailRetry(
        () =>
          gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'metadata',
            metadataHeaders: ['From', 'To', 'Subject', 'Date'],
            fields: 'id,threadId,labelIds,snippet,internalDate,sizeEstimate,payload/headers(name,value)',
          }),
        'gmailListMessages.get'
      )
    );
    const detailResponses = await Promise.all(detailPromises);
    detailed = detailResponses.map((response) => summarizeMessage(response.data));
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            maxResults,
            includeMessageDetails,
            resultSizeEstimate: listResponse.data.resultSizeEstimate,
            nextPageToken: listResponse.data.nextPageToken,
            messages: includeMessageDetails ? detailed : basicMessages,
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function gmailGetMessage(params: GetMessageParams) {
  const gmail = getGmailClient();
  const format = params.format ?? 'metadata';

  if (format === 'metadata' && params.metadataHeaders) {
    validateStringArrayOrThrow(params.metadataHeaders, 'metadataHeaders');
  }

  const response = await withGmailRetry(
    () =>
      gmail.users.messages.get({
        userId: 'me',
        id: params.messageId,
        format,
        metadataHeaders: format === 'metadata' ? params.metadataHeaders : undefined,
      }),
    'gmailGetMessage'
  );

  const message = response.data;

  const payload = format === 'full'
    ? {
        ...summarizeMessage(message),
        payload: message.payload,
        historyId: message.historyId,
      }
    : summarizeMessage(message);

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

export async function gmailSendMessage(params: SendMessageParams) {
  if (params.attachments !== undefined) {
    throw createMcpError(
      GmailErrorCode.InvalidParams,
      'Attachments are not supported by gmailSendMessage. Include file links in the email body instead.'
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
      gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw,
          threadId: params.threadId,
        },
      }),
    'gmailSendMessage'
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            id: response.data.id,
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

export async function gmailModifyMessageLabels(params: ModifyLabelsParams) {
  const gmail = getGmailClient();
  const addLabelIds = params.addLabelIds ?? [];
  const removeLabelIds = params.removeLabelIds ?? [];

  if (addLabelIds.length === 0 && removeLabelIds.length === 0) {
    throw createMcpError(GmailErrorCode.InvalidParams, 'At least one of addLabelIds or removeLabelIds must be provided');
  }

  const response = await withGmailRetry(
    () =>
      gmail.users.messages.modify({
        userId: 'me',
        id: params.messageId,
        requestBody: {
          addLabelIds,
          removeLabelIds,
        },
      }),
    'gmailModifyMessageLabels'
  );

  const modified = response.data as gmail_v1.Schema$Message;

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            id: modified.id,
            threadId: modified.threadId,
            labelIds: modified.labelIds,
            success: true,
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function gmailTrashMessage(params: TrashMessageParams) {
  const gmail = getGmailClient();

  const response = await withGmailRetry(
    () => gmail.users.messages.trash({ userId: 'me', id: params.messageId }),
    'gmailTrashMessage'
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({
          id: response.data.id,
          threadId: response.data.threadId,
          labelIds: response.data.labelIds,
          trashed: true,
        }, null, 2),
      },
    ],
  };
}

export async function gmailUntrashMessage(params: TrashMessageParams) {
  const gmail = getGmailClient();

  const response = await withGmailRetry(
    () => gmail.users.messages.untrash({ userId: 'me', id: params.messageId }),
    'gmailUntrashMessage'
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({
          id: response.data.id,
          threadId: response.data.threadId,
          labelIds: response.data.labelIds,
          trashed: false,
        }, null, 2),
      },
    ],
  };
}

export async function gmailBatchModifyMessages(params: BatchModifyMessagesParams) {
  const gmail = getGmailClient();
  const addLabelIds = params.addLabelIds ?? [];
  const removeLabelIds = params.removeLabelIds ?? [];

  if (addLabelIds.length === 0 && removeLabelIds.length === 0) {
    throw createMcpError(GmailErrorCode.InvalidParams, 'At least one of addLabelIds or removeLabelIds must be provided');
  }

  await withGmailRetry(
    () => gmail.users.messages.batchModify({
      userId: 'me',
      requestBody: {
        ids: params.messageIds,
        addLabelIds,
        removeLabelIds,
      },
    }),
    'gmailBatchModifyMessages'
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({
          messageCount: params.messageIds.length,
          addLabelIds,
          removeLabelIds,
          success: true,
        }, null, 2),
      },
    ],
  };
}

export async function gmailGetAttachment(params: GetAttachmentParams) {
  const gmail = getGmailClient();

  const [attachmentResponse, messageResponse] = await Promise.all([
    withGmailRetry(
      () => gmail.users.messages.attachments.get({
        userId: 'me',
        messageId: params.messageId,
        id: params.attachmentId,
      }),
      'gmailGetAttachment.getAttachment'
    ),
    withGmailRetry(
      () => gmail.users.messages.get({
        userId: 'me',
        id: params.messageId,
        format: 'full',
      }),
      'gmailGetAttachment.getMessage'
    ),
  ]);

  const encodedData = attachmentResponse.data.data;
  const bytes = getAttachmentBytesOrThrow(encodedData, 'gmailGetAttachment');

  const part = findAttachmentPart(messageResponse.data.payload, params.attachmentId);
  const inlineAllowed = bytes.length <= MAX_INLINE_ATTACHMENT_BYTES;
  const normalized = inlineAllowed ? normalizeBase64Url(encodedData as string) : undefined;

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({
          messageId: params.messageId,
          attachmentId: params.attachmentId,
          filename: part?.filename,
          mimeType: part?.mimeType,
          size: attachmentResponse.data.size,
          dataBase64: normalized,
          truncated: !inlineAllowed,
          maxInlineBytes: MAX_INLINE_ATTACHMENT_BYTES,
          decodedText: params.decodeBase64 && inlineAllowed ? bytes.toString('utf8') : undefined,
        }, null, 2),
      },
    ],
  };
}

export async function gmailDownloadAttachment(params: DownloadAttachmentParams) {
  const gmail = getGmailClient();

  const [attachmentResponse, messageResponse] = await Promise.all([
    withGmailRetry(
      () => gmail.users.messages.attachments.get({
        userId: 'me',
        messageId: params.messageId,
        id: params.attachmentId,
      }),
      'gmailDownloadAttachment.getAttachment'
    ),
    withGmailRetry(
      () => gmail.users.messages.get({
        userId: 'me',
        id: params.messageId,
        format: 'full',
      }),
      'gmailDownloadAttachment.getMessage'
    ),
  ]);

  const encodedData = attachmentResponse.data.data;
  const bytes = getAttachmentBytesOrThrow(encodedData, 'gmailDownloadAttachment');

  const outputPath = resolveSafeOutputPath(params.outputPath);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, bytes);

  const part = findAttachmentPart(messageResponse.data.payload, params.attachmentId);

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({
          messageId: params.messageId,
          attachmentId: params.attachmentId,
          filename: part?.filename,
          mimeType: part?.mimeType,
          size: attachmentResponse.data.size,
          outputPath,
          success: true,
        }, null, 2),
      },
    ],
  };
}
