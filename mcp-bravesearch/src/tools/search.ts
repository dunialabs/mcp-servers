import { z } from 'zod';
import { callBraveApi, withBraveRetry } from '../utils/brave-api.js';

const WebCountSchema = z.number().int().min(1).max(20).optional();
const NewsVideoCountSchema = z.number().int().min(1).max(50).optional();
const ImageCountSchema = z.number().int().min(1).max(200).optional();
const OffsetSchema = z.number().int().min(0).max(9).optional();

const BaseSearchSchema = {
  query: z.string().min(1).max(400).describe('Search query text, max 400 chars.'),
  country: z.string().length(2).optional().describe('Country code, e.g. US, GB, DE.'),
  searchLang: z.string().min(2).max(10).optional().describe('Search language, e.g. en.'),
  uiLang: z.string().min(2).max(20).optional().describe('UI language, e.g. en-US.'),
  safesearch: z.enum(['off', 'moderate', 'strict']).optional(),
  freshness: z
    .string()
    .optional()
    .describe('Freshness filter: pd|pw|pm|py or date range like 2024-01-01to2024-01-31.'),
  spellcheck: z.boolean().optional(),
};

export const BraveSearchWebInputSchema = {
  ...BaseSearchSchema,
  count: WebCountSchema.describe('Results per page. Range 1-20.'),
  offset: OffsetSchema.describe('Pagination offset. Range 0-9.'),
  textDecorations: z.boolean().optional().describe('Include highlighting markers.'),
  resultFilter: z
    .array(z.enum(['discussions', 'faq', 'infobox', 'locations', 'news', 'query', 'summarizer', 'videos', 'web']))
    .min(1)
    .optional()
    .describe('Filter result sections from Brave response.'),
  goggles: z.array(z.string().min(1)).optional().describe('Custom Brave Goggles.'),
  units: z.enum(['metric', 'imperial']).optional(),
  extraSnippets: z.boolean().optional().describe('Pro plans only.'),
  summary: z.boolean().optional().describe('Set true to return summarizer key when available.'),
};

export const BraveSearchLocalInputSchema = {
  ...BaseSearchSchema,
  count: WebCountSchema.describe('Results per page. Range 1-20.'),
  offset: OffsetSchema.describe('Pagination offset. Range 0-9.'),
  textDecorations: z.boolean().optional().describe('Include highlighting markers.'),
  units: z.enum(['metric', 'imperial']).optional(),
};

export const BraveSearchNewsInputSchema = {
  ...BaseSearchSchema,
  count: NewsVideoCountSchema.describe('Results per page. Range 1-50.'),
  offset: OffsetSchema.describe('Pagination offset. Range 0-9.'),
  goggles: z.array(z.string().min(1)).optional(),
  extraSnippets: z.boolean().optional().describe('Pro plans only.'),
};

export const BraveSearchVideoInputSchema = {
  ...BaseSearchSchema,
  count: NewsVideoCountSchema.describe('Results per page. Range 1-50.'),
  offset: OffsetSchema.describe('Pagination offset. Range 0-9.'),
};

export const BraveSearchImageInputSchema = {
  query: z.string().min(1).max(400).describe('Search query text, max 400 chars.'),
  country: z.string().length(2).optional().describe('Country code, e.g. US, GB, DE.'),
  searchLang: z.string().min(2).max(10).optional().describe('Search language, e.g. en.'),
  count: ImageCountSchema.describe('Results per page. Range 1-200.'),
  safesearch: z.enum(['off', 'strict']).optional(),
  spellcheck: z.boolean().optional(),
};

export const BraveSummarizeByKeyInputSchema = {
  key: z.string().min(1).describe('Summary key from braveSearchWeb(summary=true).'),
  entityInfo: z.boolean().optional().describe('Include entity information.'),
  inlineReferences: z.boolean().optional().describe('Include inline source references.'),
};

interface WebLikeParams {
  query: string;
  country?: string;
  searchLang?: string;
  uiLang?: string;
  count?: number;
  offset?: number;
  safesearch?: 'off' | 'moderate' | 'strict';
  freshness?: string;
  spellcheck?: boolean;
}

interface WebParams extends WebLikeParams {
  textDecorations?: boolean;
  resultFilter?: Array<'discussions' | 'faq' | 'infobox' | 'locations' | 'news' | 'query' | 'summarizer' | 'videos' | 'web'>;
  goggles?: string[];
  units?: 'metric' | 'imperial';
  extraSnippets?: boolean;
  summary?: boolean;
}

interface LocalParams extends WebLikeParams {
  textDecorations?: boolean;
  units?: 'metric' | 'imperial';
}

interface NewsParams extends WebLikeParams {
  goggles?: string[];
  extraSnippets?: boolean;
}

type VideoParams = WebLikeParams;

interface ImageParams {
  query: string;
  country?: string;
  searchLang?: string;
  count?: number;
  safesearch?: 'off' | 'strict';
  spellcheck?: boolean;
}

interface SummarizeParams {
  key: string;
  entityInfo?: boolean;
  inlineReferences?: boolean;
}

interface BraveQuerySection {
  original?: string;
  altered?: string;
  more_results_available?: boolean;
}

function formatToolResult(payload: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
  };
}

function normalizeCommonQuery(params: WebLikeParams) {
  return {
    q: params.query,
    country: params.country,
    search_lang: params.searchLang,
    ui_lang: params.uiLang,
    count: params.count,
    offset: params.offset,
    safesearch: params.safesearch,
    freshness: params.freshness,
    spellcheck: params.spellcheck,
  };
}

function summarizeWebResult(item: Record<string, unknown>) {
  return {
    title: item.title,
    url: item.url,
    description: item.description,
    age: item.age,
    language: item.language,
    familyFriendly: item.family_friendly,
    type: item.type,
    profile: item.profile,
    extraSnippets: item.extra_snippets,
  };
}

function summarizeNewsResult(item: Record<string, unknown>) {
  return {
    title: item.title,
    url: item.url,
    description: item.description,
    age: item.age,
    pageAge: item.page_age,
    source: item.meta_url,
  };
}

function summarizeVideoResult(item: Record<string, unknown>) {
  const video = (typeof item.video === 'object' && item.video !== null
    ? item.video
    : {}) as Record<string, unknown>;
  return {
    title: item.title,
    url: item.url,
    description: item.description,
    age: item.age,
    duration: video.duration,
    creator: video.creator,
    views: video.views,
    thumbnail: item.thumbnail,
  };
}

function summarizeImageResult(item: Record<string, unknown>) {
  return {
    title: item.title,
    url: item.url,
    pageUrl: item.page_url,
    source: item.source,
    width: item.width,
    height: item.height,
    thumbnail: item.thumbnail,
  };
}

function summarizeLocationResult(item: Record<string, unknown>) {
  return {
    id: item.id,
    title: item.title,
    url: item.url,
    description: item.description,
    address: item.address,
    phone: item.phone,
    rating: item.rating,
    reviewCount: item.review_count,
    coordinates: item.coordinates,
  };
}

function parseQuerySection(payload: unknown): BraveQuerySection {
  if (typeof payload !== 'object' || payload === null) {
    return {};
  }
  const typed = payload as Record<string, unknown>;
  const query = typed.query;
  if (typeof query !== 'object' || query === null) {
    return {};
  }
  return query as BraveQuerySection;
}

export async function braveSearchWeb(params: WebParams) {
  const payload = await withBraveRetry(
    () =>
      callBraveApi<Record<string, unknown>>('/res/v1/web/search', {
        query: {
          ...normalizeCommonQuery(params),
          text_decorations: params.textDecorations,
          result_filter: params.resultFilter?.join(','),
          goggles: params.goggles?.join(','),
          units: params.units,
          extra_snippets: params.extraSnippets,
          summary: params.summary,
        },
      }),
    'braveSearchWeb'
  );

  const query = parseQuerySection(payload);
  const webResults =
    (payload.web && typeof payload.web === 'object' && Array.isArray((payload.web as Record<string, unknown>).results)
      ? ((payload.web as Record<string, unknown>).results as Array<Record<string, unknown>>)
      : []);

  const newsResults =
    (payload.news && typeof payload.news === 'object' && Array.isArray((payload.news as Record<string, unknown>).results)
      ? ((payload.news as Record<string, unknown>).results as Array<Record<string, unknown>>)
      : []);

  const locations =
    (payload.locations &&
    typeof payload.locations === 'object' &&
    Array.isArray((payload.locations as Record<string, unknown>).results)
      ? ((payload.locations as Record<string, unknown>).results as Array<Record<string, unknown>>)
      : []);

  const summarizerKey =
    payload.summarizer && typeof payload.summarizer === 'object'
      ? (payload.summarizer as Record<string, unknown>).key
      : undefined;

  return formatToolResult({
    query,
    count: webResults.length,
    moreResultsAvailable: query.more_results_available,
    summarizerKey: typeof summarizerKey === 'string' ? summarizerKey : undefined,
    webResults: webResults.map((item) => summarizeWebResult(item)),
    newsResults: newsResults.map((item) => summarizeNewsResult(item)),
    locationResults: locations.map((item) => summarizeLocationResult(item)),
  });
}

export async function braveSearchLocal(params: LocalParams) {
  const payload = await withBraveRetry(
    () =>
      callBraveApi<Record<string, unknown>>('/res/v1/web/search', {
        query: {
          ...normalizeCommonQuery(params),
          text_decorations: params.textDecorations,
          units: params.units,
          result_filter: 'web,locations,query',
        },
      }),
    'braveSearchLocal'
  );

  const query = parseQuerySection(payload);
  const locations =
    (payload.locations &&
    typeof payload.locations === 'object' &&
    Array.isArray((payload.locations as Record<string, unknown>).results)
      ? ((payload.locations as Record<string, unknown>).results as Array<Record<string, unknown>>)
      : []);

  const webResults =
    (payload.web && typeof payload.web === 'object' && Array.isArray((payload.web as Record<string, unknown>).results)
      ? ((payload.web as Record<string, unknown>).results as Array<Record<string, unknown>>)
      : []);

  return formatToolResult({
    query,
    locationCount: locations.length,
    webCount: webResults.length,
    moreResultsAvailable: query.more_results_available,
    locationResults: locations.map((item) => summarizeLocationResult(item)),
    webResults: webResults.map((item) => summarizeWebResult(item)),
  });
}

export async function braveSearchNews(params: NewsParams) {
  const payload = await withBraveRetry(
    () =>
      callBraveApi<Record<string, unknown>>('/res/v1/news/search', {
        query: {
          ...normalizeCommonQuery(params),
          goggles: params.goggles?.join(','),
          extra_snippets: params.extraSnippets,
        },
      }),
    'braveSearchNews'
  );

  const results = Array.isArray(payload.results) ? (payload.results as Array<Record<string, unknown>>) : [];
  return formatToolResult({
    query: parseQuerySection(payload),
    count: results.length,
    results: results.map((item) => summarizeNewsResult(item)),
  });
}

export async function braveSearchVideo(params: VideoParams) {
  const payload = await withBraveRetry(
    () =>
      callBraveApi<Record<string, unknown>>('/res/v1/videos/search', {
        query: normalizeCommonQuery(params),
      }),
    'braveSearchVideo'
  );

  const results = Array.isArray(payload.results) ? (payload.results as Array<Record<string, unknown>>) : [];
  return formatToolResult({
    query: parseQuerySection(payload),
    count: results.length,
    results: results.map((item) => summarizeVideoResult(item)),
  });
}

export async function braveSearchImage(params: ImageParams) {
  const payload = await withBraveRetry(
    () =>
      callBraveApi<Record<string, unknown>>('/res/v1/images/search', {
        query: {
          q: params.query,
          country: params.country,
          search_lang: params.searchLang,
          count: params.count,
          safesearch: params.safesearch,
          spellcheck: params.spellcheck,
        },
      }),
    'braveSearchImage'
  );

  const results = Array.isArray(payload.results) ? (payload.results as Array<Record<string, unknown>>) : [];
  return formatToolResult({
    query: parseQuerySection(payload),
    count: results.length,
    results: results.map((item) => summarizeImageResult(item)),
  });
}

export async function braveSummarizeByKey(params: SummarizeParams) {
  const payload = await withBraveRetry(
    () =>
      callBraveApi<Record<string, unknown>>('/res/v1/summarizer/search', {
        query: {
          key: params.key,
          entity_info: params.entityInfo ? 1 : undefined,
          inline_references: params.inlineReferences,
        },
      }),
    'braveSummarizeByKey'
  );

  return formatToolResult({
    key: params.key,
    title: payload.title,
    summary: payload.summary,
    type: payload.type,
    entities: payload.entities,
    references: payload.references,
  });
}
