import type { PublicTagApplicationRow } from 'types/api/publicTagSubmissions';

export function isPublicTagApplicationEditable(item: PublicTagApplicationRow): boolean {
  return item.status === 'pending' && item.submission_type === 'create';
}

export function getPublicTagApplicationTypeLabel(item: PublicTagApplicationRow): string {
  if (item.submission_type === 'update') {
    return 'Name tag update';
  }

  return item.tag_type ?? 'Unknown';
}
