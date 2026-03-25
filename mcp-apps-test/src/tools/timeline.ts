import { z } from 'zod';
import { buildTimeline } from '../utils/mock-data.js';

export const TimelineInputSchema = {
  startDate: z.string().optional().describe('Start date in YYYY-MM-DD format'),
  days: z.number().int().min(1).max(14).optional().describe('Number of days to generate'),
  density: z.number().int().min(1).max(6).optional().describe('Number of timeline blocks per day'),
  theme: z.enum(['clean', 'warm']).optional().describe('Visual theme hint for the view'),
  revision: z.number().int().min(0).optional().describe('Internal refresh revision used by the MCP App view'),
};

export async function playgroundTimeline(params: {
  startDate?: string;
  days?: number;
  density?: number;
  theme?: 'clean' | 'warm';
  revision?: number;
}) {
  const startDate = params.startDate ?? new Date().toISOString().slice(0, 10);
  const days = params.days ?? 5;
  const density = params.density ?? 2;
  const theme = params.theme ?? 'clean';
  const revision = params.revision ?? 0;
  const items = buildTimeline(startDate, days, density, revision);
  const lines = [
    `Timeline start: ${startDate}`,
    `Days: ${days}`,
    `Density: ${density}`,
    `Theme: ${theme}`,
    `Revision: ${revision + 1}`,
    `Blocks: ${items.length}`,
    '',
    ...items.map(
      (item, index) =>
        `${index + 1}. ${item.title}\n   ${item.start} -> ${item.end}\n   lane ${item.lane} | status ${item.status}`
    ),
  ];

  return {
    content: [
      {
        type: 'text' as const,
        text: lines.join('\n'),
      },
    ],
    structuredContent: {
      view: 'timeline',
      startDate,
      days,
      density,
      theme,
      revision,
      items,
    },
  };
}
