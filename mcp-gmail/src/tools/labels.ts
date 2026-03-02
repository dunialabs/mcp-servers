import { z } from 'zod';
import { getGmailClient, withGmailRetry } from '../utils/gmail-api.js';

export const ListLabelsInputSchema = {
  includeSystem: z.boolean().optional().describe('Include system labels (default true)'),
  includeUser: z.boolean().optional().describe('Include user labels (default true)'),
};

export interface ListLabelsParams {
  includeSystem?: boolean;
  includeUser?: boolean;
}

export async function gmailListLabels(params: ListLabelsParams) {
  const gmail = getGmailClient();
  const includeSystem = params.includeSystem ?? true;
  const includeUser = params.includeUser ?? true;

  const response = await withGmailRetry(
    () =>
      gmail.users.labels.list({
        userId: 'me',
      }),
    'gmailListLabels'
  );

  const labels = (response.data.labels ?? []).filter((label) => {
    if (label.type === 'system' && !includeSystem) {
      return false;
    }
    if (label.type === 'user' && !includeUser) {
      return false;
    }
    return true;
  });

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            total: labels.length,
            labels: labels.map((label) => ({
              id: label.id,
              name: label.name,
              type: label.type,
              messageListVisibility: label.messageListVisibility,
              labelListVisibility: label.labelListVisibility,
              messagesTotal: label.messagesTotal,
              messagesUnread: label.messagesUnread,
              threadsTotal: label.threadsTotal,
              threadsUnread: label.threadsUnread,
            })),
          },
          null,
          2
        ),
      },
    ],
  };
}
