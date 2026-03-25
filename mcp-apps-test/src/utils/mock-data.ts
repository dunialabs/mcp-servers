export type CardItem = {
  id: string;
  title: string;
  category: string;
  summary: string;
  score: number;
  status: 'new' | 'active' | 'paused';
};

export type TimelineItem = {
  id: string;
  title: string;
  start: string;
  end: string;
  lane: string;
  status: 'planned' | 'running' | 'done';
};

const categories = ['design', 'ops', 'sales', 'support'];
const statuses: Array<CardItem['status']> = ['new', 'active', 'paused'];
const timelineStatuses: Array<TimelineItem['status']> = ['planned', 'running', 'done'];

export function buildCards(count: number, category?: string, revision = 0): CardItem[] {
  return Array.from({ length: count }).map((_, index) => {
    const selectedCategory = category && category !== 'all' ? category : categories[index % categories.length];
    const shiftedIndex = index + revision;
    return {
      id: `card-${index + 1}`,
      title: `Card ${index + 1}`,
      category: selectedCategory,
      summary: `Mock card ${index + 1} for MCP Apps interaction testing, revision ${revision + 1}.`,
      score: 50 + ((shiftedIndex * 7) % 45),
      status: statuses[shiftedIndex % statuses.length],
    };
  });
}

export function buildTimeline(startDate: string, days: number, density: number, revision = 0): TimelineItem[] {
  const start = new Date(startDate);

  return Array.from({ length: Math.max(1, days * density) }).map((_, index) => {
    const itemStart = new Date(start);
    const shiftedIndex = index + revision;
    itemStart.setDate(start.getDate() + Math.floor(shiftedIndex / density));
    itemStart.setHours(9 + (shiftedIndex % density), 0, 0, 0);

    const itemEnd = new Date(itemStart);
    itemEnd.setHours(itemStart.getHours() + 1, 30, 0, 0);

    return {
      id: `slot-${index + 1}`,
      title: `Timeline Block ${index + 1}`,
      start: itemStart.toISOString(),
      end: itemEnd.toISOString(),
      lane: ['alpha', 'beta', 'gamma'][shiftedIndex % 3],
      status: timelineStatuses[shiftedIndex % timelineStatuses.length],
    };
  });
}
