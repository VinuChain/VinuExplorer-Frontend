#!/usr/bin/env bash
# Reproducible fork-delta inventory against the upstream merge-base (docs/FORK.md §1).
# Usage: scripts/fork-delta.sh [--names]
set -euo pipefail
UPSTREAM_BASE=fba6438bec0a7d8b072799d997ab7d82f6159b80  # merge-base with blockscout/frontend main (2025-12-13; 33 commits before v2.6.0, nearest tag v2.5.0-alpha)
UPSTREAM_URL=https://github.com/blockscout/frontend.git
UPSTREAM_REF=main
FORK_BRANCH=main
cd "$(git rev-parse --show-toplevel)"
# Fetch the canonical URL straight into the tracking ref so a stray remote named "upstream" cannot skew the numbers.
git fetch --quiet --tags "${UPSTREAM_URL}" "+refs/heads/${UPSTREAM_REF}:refs/remotes/upstream/${UPSTREAM_REF}"
BASE_CHECK_REF="${FORK_BRANCH}"; git rev-parse --verify -q "${FORK_BRANCH}" >/dev/null || BASE_CHECK_REF=HEAD
ACTUAL_BASE=$(git merge-base "${BASE_CHECK_REF}" "upstream/${UPSTREAM_REF}")
echo "UPSTREAM_BASE ${UPSTREAM_BASE}"
[ "${ACTUAL_BASE}" = "${UPSTREAM_BASE}" ] || echo "WARNING: merge-base of ${BASE_CHECK_REF} with upstream/${UPSTREAM_REF} is ${ACTUAL_BASE}; update UPSTREAM_BASE here and in docs/FORK.md"
echo "delta vs upstream base: $(git diff --shortstat "${UPSTREAM_BASE}" HEAD)"
echo "fork commits ahead of base:  $(git rev-list --count "${UPSTREAM_BASE}..HEAD")"
LATEST_TAG=$(git tag --merged "upstream/${UPSTREAM_REF}" --sort=-creatordate | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | head -1 || true)
echo "upstream commits since base: $(git rev-list --count "${UPSTREAM_BASE}..upstream/${UPSTREAM_REF}") (upstream/${UPSTREAM_REF} @ $(git rev-parse --short "upstream/${UPSTREAM_REF}"), latest release tag reachable from it: ${LATEST_TAG:-none})"
if [ "${1:-}" = "--names" ]; then git diff --name-only "${UPSTREAM_BASE}" HEAD; fi
