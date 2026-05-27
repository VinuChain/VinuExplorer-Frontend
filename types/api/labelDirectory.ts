// Response shape for `GET /api/v2/labels/categories` — the Labels
// directory backing the `/labels` page. Each entry describes one
// category-typed tag (mirrors the backend's
// `Explorer.Chain.AddressTagSearch.@category_tag_types` list) with
// the distinct-address count attached to it.
//
// `display_name` is the backend's fallback (lowest-id `display_name`
// of any DB row that carries the `tag_type`, falling back to a
// canonical human label). The frontend may override it via
// `getCategoryLabel(tagType)` to keep the directory UI strings
// consistent with the badge labels rendered elsewhere.

export interface LabelDirectoryCategory {
  tag_type: string;
  display_name: string;
  count: number;
}

export interface LabelDirectoryResponse {
  categories: Array<LabelDirectoryCategory>;
}
