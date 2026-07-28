import type { PublicTagType } from './addressMetadata';

export type PublicTagApplicationStatus = 'pending' | 'processing' | 'approved' | 'rejected';
export type PublicTagApplicationSubmissionType = 'create' | 'update';

// Mirrors the moderator-facing payload validated by
// Explorer.Account.PublicTagSubmission.Meta on the backend. Optional
// because legacy submissions predate the meta payload.
export interface PublicTagApplicationMeta {
  bgColor?: string;
  textColor?: string;
  tagUrl?: string;
  tagIcon?: string;
  tooltipDescription?: string;
  // Submitter attestation captured at form time. Visible to the
  // submitter on their own My Requests view; stripped before public
  // read. See Meta.sanitize/1.
  ownerStatement?: 'owner' | 'not_owner';
  addressSource?: string;
}

export interface PublicTagApplicationRow {
  id: number;
  address_hash: string;
  tag_name: string;
  tag_type: PublicTagType['type'] | null;
  submission_type: PublicTagApplicationSubmissionType;
  company_name: string | null;
  company_website: string | null;
  description: string | null;
  status: PublicTagApplicationStatus;
  inserted_at: string; // ISO 8601
  reject_reason: string | null;
  meta: PublicTagApplicationMeta | null;
}

export interface PublicTagApplicationsResponse {
  items: Array<PublicTagApplicationRow>;
  next_page_params: { items_count: number; page_number: number } | null;
}
