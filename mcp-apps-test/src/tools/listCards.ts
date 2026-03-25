import { z } from 'zod';
import { buildCards } from '../utils/mock-data.js';

export const ListCardsInputSchema = {
  title: z.string().optional().describe('Optional board title'),
  count: z.number().int().min(1).max(24).optional().describe('Number of cards to generate'),
  category: z.string().optional().describe('Category filter, e.g. design or all'),
  layout: z.enum(['grid', 'list']).optional().describe('Preferred layout for the view'),
  revision: z.number().int().min(0).optional().describe('Internal refresh revision used by the MCP App view'),
};

export async function playgroundListCards(params: {
  title?: string;
  count?: number;
  category?: string;
  layout?: 'grid' | 'list';
  revision?: number;
}) {
  const title = params.title ?? 'Mock Card Board';
  const count = params.count ?? 6;
  const layout = params.layout ?? 'grid';
  const revision = params.revision ?? 0;
  const cards = buildCards(count, params.category, revision);
  const statusCounts = cards.reduce<Record<string, number>>((accumulator, card) => {
    accumulator[card.status] = (accumulator[card.status] ?? 0) + 1;
    return accumulator;
  }, {});
  const lines = [
    `Board: ${title}`,
    `Layout: ${layout}`,
    `Cards: ${cards.length}`,
    `Revision: ${revision + 1}`,
    `Status counts: new=${statusCounts.new ?? 0}, active=${statusCounts.active ?? 0}, paused=${statusCounts.paused ?? 0}`,
    '',
    ...cards.map(
      (card, index) =>
        `${index + 1}. ${card.title} | ${card.category} | score ${card.score} | status ${card.status}\n   ${card.summary}`
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
      view: 'cards',
      title,
      count: cards.length,
      layout,
      revision,
      statusCounts,
      cards,
    },
  };
}
