import { describe, expect, it } from 'vitest';
import { buildCards, buildTimeline } from '../src/utils/mock-data.js';

describe('mock data builders', () => {
  it('builds requested number of cards', () => {
    expect(buildCards(4).length).toBe(4);
  });

  it('builds timeline blocks across days', () => {
    expect(buildTimeline('2026-03-25', 3, 2).length).toBe(6);
  });
});
