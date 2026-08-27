# VinuExplorer Frontend — Fork Guide

This repository is a VinuChain fork of [`blockscout/frontend`](https://github.com/blockscout/frontend).
This document covers the fork delta, the deployment pipeline, where runtime
configuration lives, and how to roll back. It is the operational runbook for the
explorer frontend; assume the original maintainer is unreachable and you must
deploy or recover using only this repository.

## 1. Fork ancestry

| | |
| --- | --- |
| Upstream remote | `https://github.com/blockscout/frontend.git` |
| Origin | `VinuChain/VinuExplorer-Frontend` |
| Merge-base with upstream | `fba6438be` (2025-12-13) — 33 commits before upstream `v2.6.0`; nearest tag `v2.5.0-alpha` |
| Default branch | `main` (production source) |
| Delta inventory | `scripts/fork-delta.sh` — diff vs the base, fork commits ahead, upstream commits behind and the latest upstream release tag; warns if `main` no longer merges from the recorded base |

`package.json` still carries the upstream identity (`name: blockscout-frontend`,
`version: 1.0.0`) — this is intentional, the fork tracks upstream packaging.

## 2. Networks

| Network | Chain ID | RPC | Explorer |
| --- | --- | --- | --- |
| Mainnet | **207** | `rpc.vinuchain.org` | `mainnet.vinuexplorer.org` (`vinuexplorer.org` 301s here) |
| Testnet | **206** | `vinufoundation-rpc.com` | `testnet.vinuexplorer.org` |

There is **no VinuChain env preset committed in `configs/envs/`**. Production
runtime configuration (chain config, API hosts, feature flags, secrets) is
supplied at container-run time and lives in the **`VinuChain/vinuexplorer-backend`**
repository, not here. Chain config is therefore not auditable from this repo
alone — see §5.

## 3. Fork delta (what this fork changes vs upstream)

The fork is a small, surgical delta over upstream. Major custom features:

1. **Public labels / tags** — label directory (`ui/pages/LabelsDirectory.tsx`),
   per-label address/token search (`ui/pages/AccountsLabelSearch.tsx`), labels in
   search suggest, metadata-hydration hooks (`lib/address/use*Metadata.ts`), and
   new API resources (`lib/api/services/general/label.ts`).
2. **VNS (Vinu Name Service)** — `lib/vns/` (with unit tests).
3. **External auth provider redirect** — `NEXT_PUBLIC_ACCOUNT_AUTH_URL`
   (`configs/app/features/account.ts`, `nextjs/middlewares/account.ts`,
   `ui/snippets/auth/redirectToAuthProvider.ts`): enables account features by
   delegating login to an external provider instead of native OTP/SIWE+reCAPTCHA.
4. **Session-auth proxying rework** — `lib/api/buildUrl.ts` (`shouldProxyResource`)
   and `lib/api/useApiFetch.tsx`: session credentials/CSRF extended to any
   `sessionAuth` resource; cross-origin session APIs routed via `/node-api/proxy`.
5. **Gas-stats enrichment** — `ui/shared/gas/enrichGasData.ts` synthesizes fiat
   price, confirmation times, and last-update timestamp when the backend omits them.
6. **Footer build SHAs** — frontend + backend SHA in `ui/snippets/footer/Footer.tsx`,
   fed by the `GIT_COMMIT_SHA` / `GIT_TAG` Docker build args.
7. **Public tag submission without a metadata microservice** — admin + metadata
   hosts pointed at the vinuexplorer backend (`configs/app/features/publicTagsSubmission.ts`).

Design records for the tag/VNS features live in `docs/superpowers/`.

## 4. Deployment pipeline

```
 push to main
      │
      ▼
 .github/workflows/docker-publish.yml
   1. checks job  ── reuses checks.yml (ESLint + tsc + envs-validator + Vitest)
   2. build-and-push (needs: checks)
        builds ghcr.io/vinuchain/vinuexplorer-frontend:<short-sha>
        (next build runs inside the Docker build → also a compile gate)
      │
      ▼  (nothing in this repository deploys; the image is only published)
 VinuChain/VinuExplorer-Backend  .github/workflows/deploy.yml
   1. runs on every backend `master` push, or via `workflow_dispatch`
      with the input `frontend_image_tag=<short-sha>`
   2. resolve-frontend-image: the input tag, else this repo's current
      `main` head (8-char SHA); waits up to 25 min for that GHCR tag /
      docker-publish run to succeed
   3. build-test gate → CodeDeploy testnet → mainnet; `bin/deployment/start`
      pins ghcr.io/vinuchain/vinuexplorer-frontend:<tag> on each box
```

Key properties:
- **Immutable per-commit tags only.** Every push publishes exactly one
  `:<short-sha>` tag (8-char SHA). The frontend workflow never advances a
  mutable alias and never deploys directly.
- **No `concurrency:` block in `docker-publish.yml`** — by design (see the
  in-file comment): GH Actions concurrency would silently cancel pending runs and
  skip a commit's image. Deployment serialization is enforced by the backend
  workflow's `concurrency` group and its CodeDeploy active-deployment wait.
- **Deploy coupling.** A push to `main` does not, by itself, change what is
  served: the next backend `master` push (or a `workflow_dispatch` of the
  backend `deploy.yml`) picks up the current `main` short SHA. Check what is
  live with `curl -s https://mainnet.vinuexplorer.org/node-api/config | jq -r
  .envs.NEXT_PUBLIC_GIT_COMMIT_SHA` (same on `testnet.vinuexplorer.org`).
- **Quality gate.** The `checks` job gates `build-and-push`, so a push to `main`
  that fails ESLint, `tsc`, the envs-validator, or Vitest produces **no** new
  GHCR tag. Publishing an image never grants or triggers deployment authority.
  (Added in the audit remediation;
  previously the push→deploy path had no test/lint gate.)
- **Trusted workflow boundary.** `workflow-boundary.yml` runs from the default
  branch via `pull_request_target`, reads the synthetic merge-result workflows
  through the GitHub API, and parses them as data with its protected policy. It
  never checks out or executes pull-request code. The workflow and policy are
  immutable to ordinary PRs, and its required `Workflow boundary` context cannot
  be skipped with the `skip checks` label.
- Upstream's `deploy-main.yml` is demoted to manual-only ("Legacy private image publish").

### Dockerfile COPY-list contract

The Dockerfile (`Dockerfile:13-57`) narrows the build context to an explicit
hand-curated list of ~35 type/config files to cut build time. That same list is
**mirrored as a regex** in `docker-publish.yml`'s "Choose Docker cache export
policy" step (the `git diff --name-only` grep). These two lists must be kept in
sync by hand: if you add a config/type file that the build depends on, add it to
**both** the Dockerfile COPY block and the cache-policy regex. A drift here
causes either a build break on upstream merge or a stale Docker cache.

## 5. Where runtime config lives

Production envs (chain ID, RPC/API hosts, feature flags, third-party tokens) are
**not** in this repo. They are injected at container-run time from
`VinuChain/vinuexplorer-backend`. Fork-specific envs are documented in
`.env.example` and validated by `deploy/tools/envs-validator/schema.ts`:

| Env | Purpose |
| --- | --- |
| `NEXT_PUBLIC_IS_ACCOUNT_SUPPORTED` | Enable private tags / watchlist / API keys / custom ABI. |
| `NEXT_PUBLIC_ACCOUNT_AUTH_URL` | Redirect login to an external auth provider (e.g. `/auth/auth0`) instead of native OTP/SIWE+reCAPTCHA. |
| `NEXT_PUBLIC_ADMIN_SERVICE_API_HOST` | Point at the vinuexplorer backend to enable public tag submission without a separate microservice. |
| `NEXT_PUBLIC_METADATA_SERVICE_API_HOST` | Same backend host; serves tag/label metadata. |

When `NEXT_PUBLIC_ACCOUNT_AUTH_URL` is set, the account feature can run without a
reCAPTCHA site key (auth is delegated to the external provider). `authUrl` is
operator-controlled env, not user input.

## 6. Rollback

Every commit to `main` produces an immutable `:<short-sha>` image tag. To roll
back, the VinuChain release manager runs the backend deploy workflow with the
known-good tag:

```sh
gh workflow run deploy.yml -R VinuChain/VinuExplorer-Backend \
  -f frontend_image_tag=<known-good-short-sha>
```

That redeploys the current backend `master` with the pinned frontend image
through the same build-test gate and testnet-first sequencing; confirm with
`NEXT_PUBLIC_GIT_COMMIT_SHA` at `/node-api/config` on both hosts. Workflows in
this repository must never dispatch it — `.github/workflow-policy/verify.rb`
and `scripts/verify-workflow-boundaries.mjs` reject `gh workflow run` and
Actions-API calls here. An immutable image's existence proves build
provenance; it does not grant deployment authority.

## 7. Upstream tracking

The fork branched just before upstream v2.6.0 and drifts over time. Keep the sync
cadence to **≤1 quarter**; fork debt grows superlinearly. Known conflict hotspots
when merging upstream: `lib/api/buildUrl.ts` / `lib/api/useApiFetch.tsx` (proxy
rework), `toolkit/hooks/*` (resize-semantics change), `ui/snippets/topBar/TopBarStats.tsx`,
`ui/pages/SearchResults.tsx`, the Dockerfile COPY list vs any upstream restructure,
and the committed Playwright screenshots (need regeneration). Do **not** attempt a
full multi-major upstream rebase in one pass.

## 8. Security currency

The web framework (`next`) and dependency tree should be patched on a days-not-months
cadence for a public explorer. Run `yarn audit` periodically and triage
runtime-reachable High/Critical findings. The fork uses the `resolutions` block in
`package.json` to pin transitive security fixes (e.g. `axios`, `node-forge`, `ws`,
`protobufjs`) without a full upstream merge — follow that pattern for transitive
criticals. Many remaining audit findings are dev/transitive (wallet/web3 libs,
build tooling) pinned deep in upstream's dependency graph and are correctly
deferred to the upstream-sync milestone.
