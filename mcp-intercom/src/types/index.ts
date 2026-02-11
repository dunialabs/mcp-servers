/**
 * Type definitions for Intercom MCP Server
 * Based on Intercom API v2.11
 */

export interface ServerConfig {
  name: string;
  version: string;
  description?: string;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// ==================== Contact Types ====================

export type ContactRole = 'user' | 'lead';

export interface Contact {
  type: 'contact';
  id: string;
  workspace_id: string;
  external_id?: string;
  role: ContactRole;
  email?: string;
  phone?: string;
  name?: string;
  avatar?: string;
  owner_id?: number;
  social_profiles?: {
    type: 'social_profile.list';
    data: SocialProfile[];
  };
  has_hard_bounced?: boolean;
  marked_email_as_spam?: boolean;
  unsubscribed_from_emails?: boolean;
  created_at: number;
  updated_at: number;
  signed_up_at?: number;
  last_seen_at?: number;
  last_replied_at?: number;
  last_contacted_at?: number;
  last_email_opened_at?: number;
  last_email_clicked_at?: number;
  language_override?: string;
  browser?: string;
  browser_version?: string;
  browser_language?: string;
  os?: string;
  location?: ContactLocation;
  android_app_name?: string;
  android_app_version?: string;
  android_device?: string;
  android_os_version?: string;
  android_sdk_version?: string;
  android_last_seen_at?: number;
  ios_app_name?: string;
  ios_app_version?: string;
  ios_device?: string;
  ios_os_version?: string;
  ios_sdk_version?: string;
  ios_last_seen_at?: number;
  custom_attributes?: Record<string, unknown>;
  tags?: {
    type: 'tag.list';
    data: Tag[];
    url: string;
    total_count: number;
    has_more: boolean;
  };
  notes?: {
    type: 'note.list';
    data: Note[];
    url: string;
    total_count: number;
    has_more: boolean;
  };
  companies?: {
    type: 'company.list';
    data: Company[];
    url: string;
    total_count: number;
    has_more: boolean;
  };
}

export interface ContactLocation {
  type: 'location';
  country?: string;
  region?: string;
  city?: string;
  country_code?: string;
  continent_code?: string;
}

export interface SocialProfile {
  type: 'social_profile';
  name: string;
  url: string;
}

export interface ContactList {
  type: 'list';
  data: Contact[];
  total_count: number;
  pages?: {
    type: 'pages';
    next?: {
      page: number;
      starting_after: string;
    };
    page: number;
    per_page: number;
    total_pages: number;
  };
}

export interface CreateContactRequest {
  role?: ContactRole;
  external_id?: string;
  email?: string;
  phone?: string;
  name?: string;
  avatar?: string;
  signed_up_at?: number;
  last_seen_at?: number;
  owner_id?: number;
  unsubscribed_from_emails?: boolean;
  custom_attributes?: Record<string, unknown>;
}

export interface UpdateContactRequest {
  role?: ContactRole;
  external_id?: string | null;
  email?: string;
  phone?: string | null;
  name?: string | null;
  avatar?: string | null;
  signed_up_at?: number;
  last_seen_at?: number;
  owner_id?: number | null;
  unsubscribed_from_emails?: boolean;
  custom_attributes?: Record<string, unknown>;
}

export interface SearchContactsRequest {
  query: SearchQuery;
  pagination?: PaginationRequest;
}

// ==================== Conversation Types ====================

export type ConversationState = 'open' | 'closed' | 'snoozed';

export interface Conversation {
  type: 'conversation';
  id: string;
  title?: string;
  created_at: number;
  updated_at: number;
  waiting_since?: number;
  snoozed_until?: number;
  open: boolean;
  state: ConversationState;
  read: boolean;
  priority: 'priority' | 'not_priority';
  admin_assignee_id?: number;
  team_assignee_id?: string;
  tags?: {
    type: 'tag.list';
    tags: Tag[];
  };
  conversation_rating?: ConversationRating;
  source: ConversationSource;
  contacts: {
    type: 'contact.list';
    contacts: ContactReference[];
  };
  teammates?: {
    type: 'admin.list';
    admins: AdminReference[];
  };
  first_contact_reply?: {
    created_at: number;
    type: string;
    url?: string;
  };
  sla_applied?: SlaApplied;
  statistics?: ConversationStatistics;
  conversation_parts?: {
    type: 'conversation_part.list';
    conversation_parts: ConversationPart[];
    total_count: number;
  };
  custom_attributes?: Record<string, unknown>;
}

export interface ConversationRating {
  rating: number;
  remark?: string;
  created_at: number;
  contact: ContactReference;
  teammate: AdminReference;
}

export interface ConversationSource {
  type: string;
  id: string;
  delivered_as: string;
  subject?: string;
  body: string;
  author: Author;
  attachments?: Attachment[];
  url?: string;
  redacted?: boolean;
}

export interface Author {
  type: 'admin' | 'user' | 'lead' | 'bot' | 'team';
  id: string;
  name?: string;
  email?: string;
}

export interface Attachment {
  type: 'upload';
  name: string;
  url: string;
  content_type: string;
  filesize: number;
  width?: number;
  height?: number;
}

export interface ContactReference {
  type: 'contact';
  id: string;
  external_id?: string;
}

export interface AdminReference {
  type: 'admin';
  id: string;
  name?: string;
  email?: string;
}

export interface SlaApplied {
  type: 'sla_applied';
  sla_name: string;
  sla_status: 'hit' | 'missed' | 'active';
}

export interface ConversationStatistics {
  type: 'conversation_statistics';
  time_to_assignment?: number;
  time_to_admin_reply?: number;
  time_to_first_close?: number;
  time_to_last_close?: number;
  median_time_to_reply?: number;
  first_contact_reply_at?: number;
  first_assignment_at?: number;
  first_admin_reply_at?: number;
  first_close_at?: number;
  last_assignment_at?: number;
  last_assignment_admin_reply_at?: number;
  last_contact_reply_at?: number;
  last_admin_reply_at?: number;
  last_close_at?: number;
  last_closed_by_id?: string;
  count_reopens?: number;
  count_assignments?: number;
  count_conversation_parts?: number;
}

export interface ConversationPart {
  type: 'conversation_part';
  id: string;
  part_type: string;
  body?: string;
  created_at: number;
  updated_at: number;
  notified_at: number;
  assigned_to?: AdminReference;
  author: Author;
  attachments?: Attachment[];
  external_id?: string;
  redacted?: boolean;
}

export interface ConversationList {
  type: 'conversation.list';
  conversations: Conversation[];
  total_count: number;
  pages?: {
    type: 'pages';
    next?: {
      page: number;
      starting_after: string;
    };
    page: number;
    per_page: number;
    total_pages: number;
  };
}

export interface ListConversationsRequest {
  per_page?: number;
  starting_after?: string;
}

export interface SearchConversationsRequest {
  query: SearchQuery;
  pagination?: PaginationRequest;
}

export interface ReplyToConversationRequest {
  message_type: 'comment' | 'note';
  type: 'admin' | 'user';
  body: string;
  admin_id?: string;
  intercom_user_id?: string;
  user_id?: string;
  email?: string;
  attachment_urls?: string[];
  attachment_files?: AttachmentFile[];
}

export interface AttachmentFile {
  content_type: string;
  data: string;
  name: string;
}

export interface CloseConversationRequest {
  admin_id: string;
  body?: string;
}

export interface AssignConversationRequest {
  admin_id?: string;
  assignee_id: string | number;
  body?: string;
}

// ==================== Company Types ====================

export interface Company {
  type: 'company';
  id: string;
  company_id?: string;
  name?: string;
  created_at: number;
  updated_at: number;
  remote_created_at?: number;
  last_request_at?: number;
  session_count?: number;
  monthly_spend?: number;
  user_count?: number;
  size?: number;
  website?: string;
  industry?: string;
  plan?: {
    type: 'plan';
    id: string;
    name: string;
  };
  custom_attributes?: Record<string, unknown>;
  tags?: {
    type: 'tag.list';
    tags: Tag[];
  };
  segments?: {
    type: 'segment.list';
    segments: Segment[];
  };
}

export interface CompanyList {
  type: 'list';
  data: Company[];
  total_count: number;
  pages?: {
    type: 'pages';
    next?: {
      page: number;
      starting_after: string;
    };
    page: number;
    per_page: number;
    total_pages: number;
  };
}

// ==================== Tag Types ====================

export interface Tag {
  type: 'tag';
  id: string;
  name: string;
  applied_at?: number;
  applied_by?: AdminReference;
}

export interface TagList {
  type: 'tag.list';
  data: Tag[];
}

// ==================== Note Types ====================

export interface Note {
  type: 'note';
  id: string;
  created_at: number;
  body: string;
  author?: AdminReference;
  contact?: ContactReference;
}

export interface NoteList {
  type: 'list';
  data: Note[];
  total_count: number;
  pages?: {
    type: 'pages';
    page: number;
    per_page: number;
    total_pages: number;
  };
}

export interface CreateNoteRequest {
  body: string;
  admin_id?: string;
}

// ==================== Segment Types ====================

export interface Segment {
  type: 'segment';
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
  person_type: 'user' | 'lead';
  count?: number;
}

// ==================== Admin Types ====================

export interface Admin {
  type: 'admin';
  id: string;
  name?: string;
  email: string;
  job_title?: string;
  away_mode_enabled: boolean;
  away_mode_reassign: boolean;
  has_inbox_seat: boolean;
  team_ids?: string[];
  avatar?: string;
  team_priority_level?: {
    primary_team_ids?: string[];
    secondary_team_ids?: string[];
  };
}

export interface AdminList {
  type: 'admin.list';
  admins: Admin[];
}

// ==================== Search Types ====================

export interface SearchQuery {
  operator: 'AND' | 'OR';
  value: SearchQueryValue[];
}

export type SearchQueryValue =
  | SingleFilterSearchRequest
  | MultipleFilterSearchRequest;

export interface SingleFilterSearchRequest {
  field: string;
  operator: SearchOperator;
  value: string | number | boolean;
}

export interface MultipleFilterSearchRequest {
  operator: 'AND' | 'OR';
  value: SingleFilterSearchRequest[];
}

export type SearchOperator =
  | '='
  | '!='
  | '>'
  | '<'
  | '~'
  | '!~'
  | 'IN'
  | 'NIN'
  | 'contains'
  | 'starts_with';

export interface PaginationRequest {
  per_page?: number;
  starting_after?: string;
}

export interface SearchResponse<T> {
  type: string;
  data: T[];
  total_count: number;
  pages?: {
    type: 'pages';
    next?: {
      page: number;
      starting_after: string;
    };
    page: number;
    per_page: number;
    total_pages: number;
  };
}

// ==================== Me Types ====================

export interface Me {
  type: 'admin';
  id: string;
  email: string;
  name?: string;
  email_verified: boolean;
  app: {
    type: 'app';
    id_code: string;
    name: string;
    created_at: number;
    secure: boolean;
    identity_verification: boolean;
    timezone: string;
    region: string;
  };
  avatar?: {
    type: 'avatar';
    image_url: string;
  };
}

// ==================== Error Types ====================

export interface IntercomErrorResponse {
  type: 'error.list';
  errors: Array<{
    code: string;
    message: string;
    field?: string;
  }>;
  request_id?: string;
}
