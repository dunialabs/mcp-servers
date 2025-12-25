/**
 * Zendesk API Type Definitions
 */

// Zendesk Ticket
export interface ZendeskTicket {
  id: number;
  url: string;
  subject: string;
  description: string;
  status: 'new' | 'open' | 'pending' | 'hold' | 'solved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent' | null;
  type: 'problem' | 'incident' | 'question' | 'task' | null;
  requester_id: number;
  submitter_id: number;
  assignee_id: number | null;
  organization_id: number | null;
  group_id: number | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

// Zendesk User
export interface ZendeskUser {
  id: number;
  url: string;
  name: string;
  email: string | null;
  role: 'end-user' | 'agent' | 'admin';
  verified: boolean;
  active: boolean;
  organization_id: number | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

// Zendesk Comment
export interface ZendeskComment {
  id: number;
  type: 'Comment' | 'VoiceComment';
  body: string;
  html_body: string;
  plain_body: string;
  public: boolean;
  author_id: number;
  created_at: string;
}

// Zendesk Organization
export interface ZendeskOrganization {
  id: number;
  url: string;
  name: string;
  domain_names: string[];
  details: string | null;
  notes: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

// API Response wrappers
export interface ZendeskTicketResponse {
  ticket: ZendeskTicket;
}

export interface ZendeskTicketsResponse {
  tickets: ZendeskTicket[];
  count?: number;
  next_page: string | null;
  previous_page: string | null;
}

export interface ZendeskUserResponse {
  user: ZendeskUser;
}

export interface ZendeskUsersResponse {
  users: ZendeskUser[];
  count?: number;
  next_page: string | null;
  previous_page: string | null;
}

export interface ZendeskCommentsResponse {
  comments: ZendeskComment[];
}

export interface ZendeskOrganizationResponse {
  organization: ZendeskOrganization;
}

export interface ZendeskOrganizationsResponse {
  organizations: ZendeskOrganization[];
  count?: number;
  next_page: string | null;
  previous_page: string | null;
}

// Search result
export interface ZendeskSearchResult {
  results: Array<ZendeskTicket | ZendeskUser | ZendeskOrganization>;
  count: number;
  next_page: string | null;
  previous_page: string | null;
}

// Log level
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
