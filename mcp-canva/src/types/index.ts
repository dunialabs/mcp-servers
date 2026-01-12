/**
 * Type definitions for Canva MCP Server
 * Based on Canva Connect API v1
 */

export interface ServerConfig {
  name: string;
  version: string;
  description?: string;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// ==================== Design Types ====================

export interface Design {
  id: string;
  created_at: number;
  updated_at: number;
  thumbnail?: {
    url: string;
  };
  title?: string;
  urls: {
    edit_url: string;
    view_url: string;
  };
}

export interface DesignPage {
  id: string;
  thumbnail?: {
    url: string;
  };
}

export type DesignType =
  | { type: 'preset'; name: 'doc' | 'whiteboard' | 'presentation' }
  | { type: 'custom'; width: number; height: number };

export interface CreateDesignRequest {
  design_type: DesignType;
  asset_id?: string;
  title?: string;
}

export interface ListDesignsRequest {
  query?: string;
  ownership?: 'any' | 'owned' | 'shared';
  sort_by?: 'relevance' | 'modified_descending' | 'modified_ascending' | 'title_descending' | 'title_ascending';
  continuation?: string;
  limit?: number;
}

export interface ListDesignsResponse {
  items: Design[];
  continuation?: string;
}

export interface GetDesignResponse {
  design: Design;
}

export interface ListDesignPagesResponse {
  items: DesignPage[];
  continuation?: string;
}

export interface ExportFormat {
  format_type: 'pdf' | 'jpg' | 'png' | 'pptx' | 'gif' | 'mp4' | 'svg';
}

export interface GetExportFormatsResponse {
  export_formats: ExportFormat[];
}

// ==================== Asset Types ====================

export interface Asset {
  id: string;
  name: string;
  tags: string[];
  created_at: number;
  updated_at: number;
  thumbnail?: {
    url: string;
    width: number;
    height: number;
  };
}

export interface AssetUploadJob {
  job: {
    id: string;
    status: 'in_progress' | 'success' | 'failed';
    error?: {
      code: string;
      message: string;
    };
  };
}

export interface AssetUploadJobResult extends AssetUploadJob {
  job: AssetUploadJob['job'] & {
    asset?: {
      id: string;
    };
  };
}

export interface UrlAssetUploadRequest {
  name: string;
  url: string;
}

export interface UpdateAssetRequest {
  name?: string;
  tags?: string[];
}

// ==================== Export Types ====================

export type CreateExportFormat =
  | { type: 'pdf'; export_quality?: 'regular' | 'pro'; size?: 'a4' | 'a3' | 'letter' | 'legal'; pages?: number[] }
  | { type: 'jpg'; export_quality?: 'regular' | 'pro'; quality: number; height?: number; width?: number; pages?: number[] }
  | { type: 'png'; export_quality?: 'regular' | 'pro'; height?: number; width?: number; lossless?: boolean; transparent_background?: boolean; as_single_image?: boolean; pages?: number[] }
  | { type: 'pptx'; pages?: number[] }
  | { type: 'gif'; export_quality?: 'regular' | 'pro'; height?: number; width?: number; pages?: number[] }
  | { type: 'mp4'; export_quality?: 'regular' | 'pro'; quality: 'horizontal_480p' | 'horizontal_720p' | 'horizontal_1080p' | 'horizontal_4k' | 'vertical_480p' | 'vertical_720p' | 'vertical_1080p' | 'vertical_4k'; pages?: number[] }
  | { type: 'svg'; pages?: number[] };

export interface CreateExportRequest {
  design_id: string;
  format: CreateExportFormat;
}

export interface ExportJob {
  id: string;
  status: 'in_progress' | 'success' | 'failed';
  error?: {
    code: string;
    message: string;
  };
}

export interface ExportJobResult extends ExportJob {
  urls?: Array<{
    url: string;
    page?: number;
  }>;
}

export interface GetExportResponse {
  job: ExportJobResult;
}

// ==================== Import Types ====================

export interface ImportJob {
  id: string;
  status: 'in_progress' | 'success' | 'failed';
  error?: {
    code: string;
    message: string;
  };
}

export interface ImportJobResult extends ImportJob {
  design?: {
    id: string;
    title: string;
    urls: {
      edit_url: string;
      view_url: string;
    };
  };
}

export interface GetImportResponse {
  job: ImportJobResult;
}

export interface UrlImportRequest {
  title: string;
  url: string;
  mime_type?: string;
}

// ==================== Folder Types ====================

export interface Folder {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
}

export interface CreateFolderRequest {
  name: string;
  parent_folder_id: string;
}

export interface UpdateFolderRequest {
  name: string;
}

export interface FolderItem {
  id: string;
  type: 'design' | 'folder';
  name?: string;
  title?: string;
  created_at: number;
  updated_at: number;
  thumbnail?: {
    url: string;
  };
}

export interface ListFolderItemsRequest {
  continuation?: string;
  limit?: number;
  item_types?: Array<'design' | 'folder' | 'image'>;
  sort_by?: 'created_ascending' | 'created_descending' | 'modified_ascending' | 'modified_descending' | 'title_ascending' | 'title_descending';
}

export interface ListFolderItemsResponse {
  items: FolderItem[];
  continuation?: string;
}

export interface MoveFolderItemRequest {
  item_id: string;
  to_folder_id: string;
}

// ==================== Brand Template Types ====================

export interface BrandTemplate {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
  thumbnail?: {
    url: string;
  };
  urls: {
    edit_url: string;
    view_url: string;
  };
}

export interface ListBrandTemplatesRequest {
  query?: string;
  ownership?: 'any' | 'owned' | 'shared';
  sort_by?: 'relevance' | 'modified_descending' | 'modified_ascending' | 'title_descending' | 'title_ascending';
  continuation?: string;
  limit?: number;
  dataset?: 'any' | 'non_empty';
}

export interface ListBrandTemplatesResponse {
  items: BrandTemplate[];
  continuation?: string;
}

export interface DataField {
  id: string;
  name: string;
  type: 'text' | 'image' | 'chart';
}

export interface GetBrandTemplateDatasetResponse {
  dataset: {
    fields: DataField[];
  };
}

export interface DataTableCell {
  type: 'string' | 'number' | 'boolean' | 'date';
  value: string | number | boolean;
}

export interface DataTableRow {
  cells: DataTableCell[];
}

export interface DataTable {
  rows: DataTableRow[];
}

export type DatasetValue =
  | { type: 'text'; text: string }
  | { type: 'image'; asset_id: string }
  | { type: 'chart'; chart_data: DataTable };

export interface AutofillRequest {
  brand_template_id: string;
  title?: string;
  data: Record<string, DatasetValue>;
}

export interface AutofillJob {
  id: string;
  status: 'in_progress' | 'success' | 'failed';
  error?: {
    code: string;
    message: string;
  };
}

export interface AutofillJobResult extends AutofillJob {
  design?: {
    id: string;
    title: string;
    urls: {
      edit_url: string;
      view_url: string;
    };
  };
}

export interface GetAutofillResponse {
  job: AutofillJobResult;
}

// ==================== User Types ====================

export interface User {
  id: string;
  team_id?: string;
}

export interface UserProfile {
  id: string;
  display_name: string;
  email?: string;
}

export type UserCapability = 'autofill' | 'brand_template' | 'resize' | 'team_restricted_app';

export interface GetUserCapabilitiesResponse {
  capabilities: UserCapability[];
}
