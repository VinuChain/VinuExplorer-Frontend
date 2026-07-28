import type { AddressMetadataTagType } from 'types/api/addressMetadata';
import type { PublicTagApplicationRow } from 'types/api/publicTagSubmissions';

export type OwnershipStatement = 'owner' | 'not_owner';

export interface FormFields {
  requesterName: string;
  requesterEmail: string;
  companyName: string | undefined;
  companyWebsite: string | undefined;
  // Required attestation captured at submit time — the moderator
  // needs to know whether the submitter has authority over the
  // address (lower moderation bar) or is tagging a third-party
  // address (higher moderation bar).
  ownership: OwnershipStatement;
  // Optional free-text/URL — moderators want to know how the
  // submitter found the address (e.g. "discovered via VinuRepublic
  // Discord", "https://etherscan.io/address/..."). Empty when not
  // provided.
  addressSource: string | undefined;
  addresses: Array<{ hash: string }>;
  tags: Array<FormFieldTag>;
  description: string | undefined;
}

export interface FormFieldTag {
  name: string;
  type: Array<AddressMetadataTagType>;
  url: string | undefined;
  iconUrl: string | undefined;
  bgColor: string | undefined;
  textColor: string | undefined;
  tooltipDescription: string | undefined;
}

export interface SubmitRequestBody {
  requesterName: string;
  requesterEmail: string;
  companyName?: string;
  companyWebsite?: string;
  address: string;
  name: string;
  tagType?: AddressMetadataTagType;
  submissionType?: 'create' | 'update';
  description?: string;
  meta: {
    bgColor?: string;
    textColor?: string;
    tagUrl?: string;
    tagIcon?: string;
    tooltipDescription?: string;
    // Submitter attestation copied from the top-level form — kept in
    // meta so moderators can review without joining additional tables.
    ownerStatement?: OwnershipStatement;
    // Optional free-text/URL "Where did you discover this address?"
    // captured at submit time. Same persistence rationale as
    // ownerStatement.
    addressSource?: string;
  };
}

export type FormSubmitResultItem =
  { status: 'ok'; payload: SubmitRequestBody; submission: PublicTagApplicationRow } |
  { status: 'error'; payload: SubmitRequestBody; error: string };

export type FormSubmitResult = Array<FormSubmitResultItem>;

export interface FormSubmitResultGrouped {
  requesterName: string;
  requesterEmail: string;
  companyName?: string;
  companyWebsite?: string;
  submissionType?: 'create' | 'update';
  items: Array<FormSubmitResultItemGrouped>;
}

export interface FormSubmitResultItemGrouped {
  error: string | null;
  addresses: Array<string>;
  tags: Array<Pick<SubmitRequestBody, 'name' | 'tagType' | 'meta'>>;
}

export interface PublicTagUpdateTarget {
  address: string;
  label: string;
  displayName: string;
}
