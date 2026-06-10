<h1 align="center">VinuExplorer Frontend</h1>

<p align="center">
    <span>VinuChain fork of </span>
    <a href="https://github.com/blockscout/frontend">blockscout/frontend</a>
    <span> — the frontend for </span>
    <a href="https://vinuexplorer.org">vinuexplorer.org</a>
</p>

> **VinuChain fork.** This repository is a fork of the upstream Blockscout frontend,
> customized for VinuChain (public labels/tags, VNS, external auth, gas-stats
> enrichment, footer build SHAs). For the fork delta, deployment pipeline, runtime
> env location, and rollback procedure, see **[`docs/FORK.md`](./docs/FORK.md)**.
>
> | | |
> | --- | --- |
> | Upstream base | `blockscout/frontend` v2.6.0 (merge-base `fba6438be`) |
> | Networks | mainnet chain ID **207** · RPC `vinuchain-rpc.com` · explorer `vinuexplorer.org` |
> | | testnet chain ID **206** · RPC `vinufoundation-rpc.com` · explorer `testnet.vinuexplorer.org` |
> | Image | `ghcr.io/vinuchain/vinuexplorer-frontend:{latest,<short-sha>}` |
> | Deploy | push to `main` → build image → trigger `VinuChain/vinuexplorer-backend` `deploy.yml` |
> | Rollback | `gh workflow run deploy.yml --repo VinuChain/vinuexplorer-backend --ref master -f frontend_image_tag=<old-sha>` |

The remainder of this README is upstream Blockscout documentation.

---

<h2 align="center">Blockscout frontend (upstream docs)</h2>

<p align="center">
    <span>Frontend application for </span>
    <a href="https://github.com/blockscout/blockscout/blob/master/README.md">Blockscout</a>
    <span> blockchain explorer</span>
</p>

## Running and configuring the app

App is distributed as a docker image. Here you can find information about the [package](https://github.com/blockscout/frontend/pkgs/container/frontend) and its recent [releases](https://github.com/blockscout/frontend/releases).

You can configure your app by passing necessary environment variables when starting the container. See full list of ENVs and their description [here](./docs/ENVS.md).

```sh
docker run -p 3000:3000 --env-file <path-to-your-env-file> ghcr.io/blockscout/frontend:latest
```

Alternatively, you can build your own docker image and run your app from that. Please follow this [guide](./docs/CUSTOM_BUILD.md).

For more information on migrating from the previous frontend, please see the [frontend migration docs](https://docs.blockscout.com/setup/deployment/frontend-migration).

## Contributing

See our [Contribution guide](./docs/CONTRIBUTING.md) for pull request protocol. We expect contributors to follow our [code of conduct](./CODE_OF_CONDUCT.md) when submitting code or comments.

## Resources
- [App ENVs list](./docs/ENVS.md)
- [Contribution guide](./docs/CONTRIBUTING.md)
- [Making a custom build](./docs/CUSTOM_BUILD.md)
- [Frontend migration guide](https://docs.blockscout.com/setup/deployment/frontend-migration)
- [Manual deployment guide with backend and microservices](https://docs.blockscout.com/setup/deployment/manual-deployment-guide)

## License

[![License: GPL v3.0](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

This project is licensed under the GNU General Public License v3.0. See the [LICENSE](LICENSE) file for details.
