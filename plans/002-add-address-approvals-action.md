# Plan 002: Add an address-level approvals action to the Revoke dapp

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report. Do not improvise. When done, update the status row for this plan in
> `plans/README.md`, unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat f18b415..HEAD -- ui/shared/AccountActionsMenu ui/pages/Address.tsx ui/marketplace/essentialDapps/revoke ui/marketplace/essentialDapps/EssentialDappCard.tsx types/client/marketplace.ts configs/app/features/marketplace.ts docs/ENVS.md icons/revoke.svg nextjs/nextjs-routes.d.ts`
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

The Revoke essential dapp already supports opening with an address query
parameter, but address pages do not expose a direct "check approvals" action.
Users inspecting a wallet or contract should be able to jump from that address
to its token approvals without copying and pasting. The right integration point
is `AccountActionsMenu`, because the address page already renders it and the
menu already centralizes address-related actions.

## Current state

- `ui/pages/Address.tsx:472` renders the shared action menu on address pages:

```tsx
<AccountActionsMenu isLoading={ isLoading }/>
```

- `ui/shared/AccountActionsMenu/AccountActionsMenu.tsx:26-56` builds the
  current menu from a gated `items` array:

```tsx
const hash = getQueryParamString(router.query.hash);
const isTokenPage = router.pathname === '/token/[hash]';
const isTokenInstancePage = router.pathname === '/token/[hash]/instance/[id]';
const isTxPage = router.pathname === '/tx/[hash]';

const items = [
  { render: (props: ItemProps) => <MetadataUpdateMenuItem { ...props }/>, enabled: isTokenInstancePage && showUpdateMetadataItem },
  { render: (props: ItemProps) => <TokenInfoMenuItem { ...props }/>, enabled: config.features.account.isEnabled && isTokenPage && config.features.addressVerification.isEnabled },
  { render: (props: ItemProps) => <PrivateTagMenuItem { ...props } entityType={ isTxPage ? 'tx' : 'address' }/>, enabled: config.features.account.isEnabled },
  { render: (props: ItemProps) => <PublicTagMenuItem { ...props }/>, enabled: config.features.account.isEnabled && !isTxPage && config.features.publicTagsSubmission.isEnabled },
].filter(({ enabled }) => enabled);
```

- `ui/shared/AccountActionsMenu/items/PublicTagMenuItem.tsx` is the menu-item
  pattern for route pushes:

```tsx
const handleClick = React.useCallback(() => {
  router.push({ pathname: '/public-tags/submit', query: { addresses: [ hash ] } });
}, [ hash, router ]);
```

- `ui/shared/AccountActionsMenu/parts/ButtonItem.tsx` accepts either an icon
  name or a React element and provides the tooltip/icon-button pattern.
- `icons/revoke.svg` exists, so this plan does not need new artwork.
- `types/client/marketplace.ts:56-58` defines Revoke essential dapp config:

```ts
revoke?: {
  chains: Array<string>;
};
```

- `configs/app/features/marketplace.ts:27` parses
  `NEXT_PUBLIC_MARKETPLACE_ESSENTIAL_DAPPS_CONFIG`, and the feature only
  exposes essential dapps when marketplace and blockchain interaction are both
  enabled.
- `docs/ENVS.md:620-628` documents essential dapps and the `revoke` config.
- `ui/marketplace/essentialDapps/revoke/Revoke.tsx:43-46` already reads
  address from the URL and initializes the search state with it:

```tsx
const addressFromQuery = getQueryParamString(router.query.address);
const [ selectedChainId, setSelectedChainId ] = useState<Array<string>>([ chainIdFromQuery || defaultChainId ]);
const [ searchAddress, setSearchAddress ] = useState(addressFromQuery || '');
```

- `ui/marketplace/essentialDapps/EssentialDappCard.tsx:43` links to Revoke
  with the typed route pattern:

```tsx
href={ route({ pathname: '/essential-dapps/[id]', query: { id } }) }
```

- `nextjs/nextjs-routes.d.ts:60` contains:

```ts
DynamicRoute<"/essential-dapps/[id]", { "id": string }>
```

Other dynamic routes in the app already pass extra query keys such as `tab`;
typecheck is the source of truth for whether `address` is accepted here.

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Install | `yarn install --frozen-lockfile` | exit 0 |
| Typecheck | `yarn lint:tsc` | exit 0, no TypeScript errors |
| Lint | `yarn lint:eslint` | exit 0, no ESLint errors |
| Menu tests | `yarn test:pw -- ui/shared/AccountActionsMenu/AccountActionsMenu.pw.tsx` | exit 0, all selected component tests pass |
| Revoke smoke | `yarn test:pw -- ui/marketplace/essentialDapps/revoke/Revoke.pw.tsx` | exit 0, all selected component tests pass |

## Scope

**In scope**:
- `ui/shared/AccountActionsMenu/AccountActionsMenu.tsx`
- `ui/shared/AccountActionsMenu/items/RevokeApprovalsMenuItem.tsx` (create)
- `ui/shared/AccountActionsMenu/AccountActionsMenu.pw.tsx`
- `ui/marketplace/essentialDapps/revoke/Revoke.pw.tsx` only if a focused
  prefilled-address regression can be added without broad mocking work

**Out of scope**:
- Revoke allowance search internals and wallet transaction flow.
- Marketplace config parsing and `docs/ENVS.md`.
- Address page layout outside the existing `AccountActionsMenu` call.
- Token, token instance, and transaction pages. The new item must not appear
  there unless the product owner explicitly asks for it.
- Creating new icons.

## Git workflow

- Branch: `advisor/002-address-approvals-action`
- Commit message style: conventional commit, for example
  `feat(address): add approvals action`
- Do not push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add a Revoke approvals menu item component

Create `ui/shared/AccountActionsMenu/items/RevokeApprovalsMenuItem.tsx`.
Follow the same shape as `PublicTagMenuItem`:

- Accept `ItemProps`.
- Use `useRouter`.
- On click, push to the Revoke essential dapp with the current hash:

```tsx
router.push({
  pathname: '/essential-dapps/[id]',
  query: { id: 'revoke', address: hash },
});
```

- For `type === 'button'`, render `ButtonItem` with:
  - label: `Check approvals`
  - icon: `revoke`
- For `type === 'menu_item'`, render `MenuItem` with:
  - `value="check-approvals"`
  - `<IconSvg name="revoke" boxSize={ 6 }/>`
  - text `Check approvals`

Do not wrap this item in `AuthGuard`. Revoke can inspect approvals for any
address; the dapp itself handles wallet connection before a user can revoke.

**Verify**: `yarn lint:tsc` -> exit 0.

### Step 2: Gate the item in AccountActionsMenu

In `ui/shared/AccountActionsMenu/AccountActionsMenu.tsx`:

- Import `RevokeApprovalsMenuItem`.
- Add `const isAddressPage = router.pathname === '/address/[hash]';`.
- Add a local boolean that mirrors Revoke availability:

```tsx
const revokeConfig = config.features.marketplace.isEnabled ? config.features.marketplace.essentialDapps?.revoke : undefined;
const isRevokeEnabledForCurrentChain = Boolean(revokeConfig?.chains.includes(config.chain.id as string));
```

- Add the item to `items` only when:
  - `isAddressPage` is true
  - `isRevokeEnabledForCurrentChain` is true

Place it near the public/private tag actions. Do not make it depend on account
login features.

**Verify**: `yarn lint:tsc` -> exit 0.

### Step 3: Extend AccountActionsMenu Playwright coverage

Update `ui/shared/AccountActionsMenu/AccountActionsMenu.pw.tsx`.

Add coverage for:

- Address page with marketplace/Revoke enabled:
  - mock envs:
    - `NEXT_PUBLIC_MARKETPLACE_ENABLED=true`
    - `NEXT_PUBLIC_MARKETPLACE_ESSENTIAL_DAPPS_CONFIG={"revoke":{"chains":["<current chain id>"]}}`
  - router query `{ hash: '<hash>' }`
  - router pathname `/address/[hash]`
  - menu contains `Check approvals`
- Click behavior:
  - click the menu item
  - assert the route push target includes `/essential-dapps/revoke` and
    `address=<hash>` if the test router exposes navigation state
  - if this fixture cannot assert push state, at minimum assert the item is
    visible and keep the route behavior covered by typecheck
- Negative coverage:
  - the item is absent when Revoke is not configured
  - the item is absent on `/tx/[hash]` and `/token/[hash]`

Use existing tests in this file as the structure pattern. Keep screenshots
small and deterministic.

**Verify**:
`yarn test:pw -- ui/shared/AccountActionsMenu/AccountActionsMenu.pw.tsx` -> exit 0.

### Step 4: Add a Revoke prefilled-address smoke if cheap

If `ui/marketplace/essentialDapps/revoke/Revoke.pw.tsx` can render a valid
address query using existing placeholder data without adding broad network
mocks, add a test that renders `<Revoke/>` with:

```ts
hooksConfig: {
  router: {
    query: { address: '<valid 0x address>' },
    isReady: true,
  },
}
```

Assert the address appears in the Revoke content. If this requires substantial
mocking of RPC/log calls, skip this step and leave Revoke internals unchanged.
The core behavior is already present in `Revoke.tsx`.

**Verify**:
`yarn test:pw -- ui/marketplace/essentialDapps/revoke/Revoke.pw.tsx` -> exit 0,
or document in the PR/implementation notes why this optional smoke was skipped.

### Step 5: Run final gates

**Verify**:

- `yarn lint:tsc` -> exit 0.
- `yarn lint:eslint` -> exit 0.
- `yarn test:pw -- ui/shared/AccountActionsMenu/AccountActionsMenu.pw.tsx` -> exit 0.

## Test plan

- Main regression test belongs in
  `ui/shared/AccountActionsMenu/AccountActionsMenu.pw.tsx`.
- Optional smoke belongs in
  `ui/marketplace/essentialDapps/revoke/Revoke.pw.tsx` if cheap.
- The tests should cover both enabled and disabled marketplace config, because
  this item must not show up unless Revoke is configured for the current chain.

## Done criteria

All must hold:

- [ ] On `/address/[hash]`, when Revoke is configured for the current chain,
      `AccountActionsMenu` contains `Check approvals`.
- [ ] Clicking `Check approvals` navigates to the Revoke essential dapp with
      `address=<hash>` in the query.
- [ ] The action does not appear on token, token instance, or tx pages.
- [ ] The action does not appear when marketplace/Revoke config is disabled or
      the current chain id is not in `revoke.chains`.
- [ ] Revoke still initializes from `router.query.address`.
- [ ] `yarn test:pw -- ui/shared/AccountActionsMenu/AccountActionsMenu.pw.tsx` exits 0.
- [ ] `yarn lint:tsc` exits 0.
- [ ] `yarn lint:eslint` exits 0.
- [ ] No files outside the in-scope list are modified, except snapshot files
      generated by the selected Playwright tests if the visual output
      intentionally changed.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report back if:

- The code at the current-state locations no longer matches this plan.
- Revoke no longer supports `router.query.address`.
- The typed route helper cannot represent an `address` query for
  `/essential-dapps/[id]`, and fixing that would require changing generated
  route infrastructure instead of local app code.
- The marketplace config shape has changed from `revoke: { chains: string[] }`.
- A correct implementation appears to require modifying Revoke allowance
  search, wallet write behavior, or backend APIs.
- Any verification command fails twice after a reasonable fix attempt.

## Maintenance notes

- Reviewers should confirm this item is visible only on address pages and only
  when Revoke is available for the current chain.
- Future essential dapp shortcuts should follow the same pattern: a tiny menu
  item component plus config gating in `AccountActionsMenu`.
- Keep Revoke read-only inspection available without login; wallet connection
  should remain required only for write/revoke actions.
