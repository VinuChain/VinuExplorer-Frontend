# Plan 001: Deep-link VNS search results to domain detail pages

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report. Do not improvise. When done, update the status row for this plan in
> `plans/README.md`, unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat f18b415..HEAD -- ui/snippets/searchBar/SearchBarSuggest/SearchBarSuggestItem.tsx ui/searchResults/SearchResultTableItem.tsx ui/searchResults/SearchResultListItem.tsx ui/shared/entities/ens/EnsEntity.tsx ui/pages/NameDomain.tsx ui/snippets/searchBar/SearchBarDesktop.pw.tsx ui/snippets/searchBar/SearchBarMobile.pw.tsx ui/pages/SearchResults.pw.tsx lib/vns/encodeVnsName.spec.ts`
>
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding. On a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `f18b415`, 2026-06-18

## Why this matters

VNS search results currently send users to the resolved address page even
though the app already has domain detail pages with details and history tabs.
That makes the search result label feel less useful than the address hash next
to it. The fix is small: route VNS search hits through the same encoded domain
URL that `EnsEntity` already uses, while keeping the resolved address visible
as secondary context.

## Current state

- `README.md:9-12` says this fork is customized for VinuChain features,
  including public labels/tags, VNS, and gas-stats enrichment.
- `docs/FORK.md:38-42` lists VNS as a fork delta and points to `lib/vns/`
  with unit tests.
- `ui/shared/entities/ens/EnsEntity.tsx` is the route exemplar for a domain
  link:

```tsx
// ui/shared/entities/ens/EnsEntity.tsx:9
import { encodeVnsName } from 'lib/vns/encodeVnsName';

// ui/shared/entities/ens/EnsEntity.tsx:22
const defaultHref = route({ pathname: '/name-services/domains/[name]', query: { name: encodeVnsName(props.domain) } });
```

- `ui/pages/NameDomain.tsx` is already prepared to decode encoded domain
  names and query the domain details endpoint:

```tsx
// ui/pages/NameDomain.tsx:29-36
const rawDomainName = getQueryParamString(router.query.name);
const decodedDomain = tryDecodeVnsName(rawDomainName);
const isValid = isValidVnsName(decodedDomain);
const domainName = isValid ? decodedDomain : '';

const infoQuery = useApiQuery('bens:domain_info', {
  pathParams: { name: domainName, chainId: config.chain.id },
```

- `ui/snippets/searchBar/SearchBarSuggest/SearchBarSuggestItem.tsx:73-74`
  currently sends VNS suggestions to the address page:

```tsx
case 'ens_domain': {
  return route({ pathname: '/address/[hash]', query: { hash: data.address_hash } });
}
```

- `ui/searchResults/SearchResultTableItem.tsx:439-449` renders the VNS name
  as the primary table link but points it to the address page:

```tsx
case 'ens_domain': {
  const expiresText = data.ens_info?.expiry_date ? ` expires ${ dayjs(data.ens_info.expiry_date).fromNow() }` : '';
  const hash = data.filecoin_robust_address || (addressFormat === 'bech32' ? toBech32Address(data.address_hash) : data.address_hash);

  return (
    <EnsEntity.Container>
      <EnsEntity.Icon protocol={ data.ens_info.protocol }/>
      <Link href={ route({ pathname: '/address/[hash]', query: { hash: data.address_hash } }) }>
```

- `ui/searchResults/SearchResultListItem.tsx:306-311` has the same address
  link for mobile search results:

```tsx
case 'ens_domain': {
  return (
    <EnsEntity.Container>
      <EnsEntity.Icon protocol={ data.ens_info.protocol }/>
      <Link href={ route({ pathname: '/address/[hash]', query: { hash: data.address_hash } }) }>
```

- Existing test files to update:
  - `ui/snippets/searchBar/SearchBarDesktop.pw.tsx`
  - `ui/snippets/searchBar/SearchBarMobile.pw.tsx`
  - `ui/pages/SearchResults.pw.tsx`
  - `lib/vns/encodeVnsName.spec.ts` already covers VNS name encoding, including
    slashes, query/hash characters, spaces, and non-ASCII names.

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Install | `yarn install --frozen-lockfile` | exit 0 |
| Typecheck | `yarn lint:tsc` | exit 0, no TypeScript errors |
| Lint | `yarn lint:eslint` | exit 0, no ESLint errors |
| VNS unit tests | `yarn test:vitest --run lib/vns/encodeVnsName.spec.ts` | exit 0, all tests pass |
| Search PW tests | `yarn test:pw -- ui/snippets/searchBar/SearchBarDesktop.pw.tsx ui/snippets/searchBar/SearchBarMobile.pw.tsx ui/pages/SearchResults.pw.tsx` | exit 0, all selected component tests pass |

## Scope

**In scope**:
- `ui/snippets/searchBar/SearchBarSuggest/SearchBarSuggestItem.tsx`
- `ui/searchResults/SearchResultTableItem.tsx`
- `ui/searchResults/SearchResultListItem.tsx`
- `ui/snippets/searchBar/SearchBarDesktop.pw.tsx`
- `ui/snippets/searchBar/SearchBarMobile.pw.tsx`
- `ui/pages/SearchResults.pw.tsx`
- `lib/vns/encodeVnsName.spec.ts` only if a missing encoding edge case is found

**Out of scope**:
- `ui/pages/NameDomain.tsx`; it already decodes and loads domain info.
- `ui/shared/entities/ens/EnsEntity.tsx`; use it as the route pattern, do not
  refactor it unless typecheck proves the pattern cannot be reused.
- Cluster search routing. `cluster` hits intentionally still route to an
  address when they have an EVM address.
- Backend search result shape.

## Git workflow

- Branch: `advisor/001-deep-link-vns-search-results`
- Commit message style: conventional commit, for example
  `feat(search): deep-link VNS domain results`
- Do not push or open a PR unless the operator instructed it.

## Steps

### Step 1: Route search suggestions through the VNS detail page

In `ui/snippets/searchBar/SearchBarSuggest/SearchBarSuggestItem.tsx`, import
`encodeVnsName` from `lib/vns/encodeVnsName`. Change only the
`case 'ens_domain'` href calculation so it returns:

```tsx
return route({
  pathname: '/name-services/domains/[name]',
  query: { name: encodeVnsName(data.ens_info.name) },
});
```

Keep the rendered suggestion content unchanged. The result should still show
the domain name and resolved address context through `SearchBarSuggestDomain`.

**Verify**: `yarn lint:tsc` -> exit 0.

### Step 2: Route table and mobile search results through the VNS detail page

In both `ui/searchResults/SearchResultTableItem.tsx` and
`ui/searchResults/SearchResultListItem.tsx`, import `encodeVnsName` and update
only the primary `ens_domain` name link to:

```tsx
href={ route({
  pathname: '/name-services/domains/[name]',
  query: { name: encodeVnsName(data.ens_info.name) },
}) }
```

Keep the resolved address column/row intact. The hash is useful secondary
context and should not disappear.

**Verify**: `yarn lint:tsc` -> exit 0.

### Step 3: Add focused regressions for VNS search links

Update the existing search Playwright tests instead of creating a new test
style.

Required coverage:

- Desktop search suggestion for an `ens_domain` result clicks through to
  `/name-services/domains/<encoded-name>` rather than `/address/<hash>`.
- Mobile search suggestion covers the same route behavior.
- Search results page table/list VNS result uses the domain detail href.
- At least one test fixture uses a domain name that proves encoding is applied
  correctly. `foo/bar.vinu` is a good fixture because it must become
  `foo%2Fbar.vinu` in the URL path.

If the existing mocks do not include `foo/bar.vinu`, add a local test fixture
next to the current VNS search mock. Do not change global stubs unless the
existing test pattern already does that.

**Verify**:
`yarn test:pw -- ui/snippets/searchBar/SearchBarDesktop.pw.tsx ui/snippets/searchBar/SearchBarMobile.pw.tsx ui/pages/SearchResults.pw.tsx` -> exit 0.

### Step 4: Run final gates

Run the relevant full checks for this plan.

**Verify**:

- `yarn test:vitest --run lib/vns/encodeVnsName.spec.ts` -> exit 0.
- `yarn lint:tsc` -> exit 0.
- `yarn lint:eslint` -> exit 0.

## Test plan

- Update existing Playwright component tests in:
  - `ui/snippets/searchBar/SearchBarDesktop.pw.tsx`
  - `ui/snippets/searchBar/SearchBarMobile.pw.tsx`
  - `ui/pages/SearchResults.pw.tsx`
- Keep the existing `lib/vns/encodeVnsName.spec.ts` tests passing. Add a test
  only if the route change exposes an untested encoding edge.
- The tests must assert the actual href or resulting URL, not only a screenshot.

## Done criteria

All must hold:

- [ ] `ens_domain` search suggestions route to `/name-services/domains/[name]`.
- [ ] `ens_domain` search result table rows route to `/name-services/domains/[name]`.
- [ ] `ens_domain` search result mobile list rows route to `/name-services/domains/[name]`.
- [ ] The resolved address hash remains visible as secondary context.
- [ ] Encoded VNS names with `/`, `?`, `#`, spaces, or non-ASCII characters do
      not break the URL.
- [ ] `yarn test:pw -- ui/snippets/searchBar/SearchBarDesktop.pw.tsx ui/snippets/searchBar/SearchBarMobile.pw.tsx ui/pages/SearchResults.pw.tsx` exits 0.
- [ ] `yarn test:vitest --run lib/vns/encodeVnsName.spec.ts` exits 0.
- [ ] `yarn lint:tsc` exits 0.
- [ ] `yarn lint:eslint` exits 0.
- [ ] No files outside the in-scope list are modified, except snapshot files
      generated by the selected Playwright tests if the visual output
      intentionally changed.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report back if:

- The code at the current-state locations no longer matches this plan.
- The `ens_domain` search result type no longer guarantees `data.ens_info.name`.
- The typed route helper rejects `/name-services/domains/[name]` even when
  using the existing `EnsEntity` pattern.
- Product direction has changed and VNS search results are now intentionally
  supposed to open resolved addresses first.
- Any verification command fails twice after a reasonable fix attempt.

## Maintenance notes

- Future VNS search variants should route primary domain labels to the domain
  detail page and keep addresses as secondary context.
- Reviewers should check that cluster routing was not accidentally changed.
- If route generation changes in this repo, keep `EnsEntity` and all VNS search
  links on the same encoding strategy.
