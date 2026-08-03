# Installation

## Published npm package

This is an unverified community package for self-hosted n8n. After publication:

1. Open **Settings → Community Nodes**.
2. Select **Install**.
3. Enter `n8n-nodes-ibmi-mapepire`.
4. Review and accept the unverified-package warning.
5. Restart n8n when the deployment does not reload community nodes automatically.

The package installs `@ibm/mapepire-js@0.6.1` as its pinned runtime dependency.
The n8n host/container therefore needs npm registry access or a registry/cache
that already contains both packages.

## Environment-managed installation: n8n 2.21+

```yaml
services:
  n8n:
    environment:
      N8N_COMMUNITY_PACKAGES_ENABLED: "true"
      N8N_UNVERIFIED_PACKAGES_ENABLED: "true"
      N8N_COMMUNITY_PACKAGES_MANAGED_BY_ENV: "true"
      N8N_COMMUNITY_PACKAGES: >-
        [{"name":"n8n-nodes-ibmi-mapepire","version":"0.1.1"}]
    volumes:
      - n8n_data:/home/node/.n8n
```

`N8N_COMMUNITY_PACKAGES` is the complete desired state. When environment
management is enabled, n8n installs missing packages, reconciles versions, and
removes installed packages omitted from the JSON list.

For a stricter deployment, obtain the npm SHA-512 integrity value after
publication and configure:

```yaml
N8N_UNVERIFIED_PACKAGES_ENABLED: "false"
N8N_COMMUNITY_PACKAGES: >-
  [{"name":"n8n-nodes-ibmi-mapepire","version":"0.1.1","checksum":"sha512-..."}]
```

The checksum requires an explicit version. In managed mode the Community Nodes
settings page is read-only.

## Supplied local tarball

```bash
mkdir -p /home/node/.n8n/nodes
cd /home/node/.n8n/nodes
npm install /tmp/n8n-nodes-ibmi-mapepire-0.1.1.tgz
```

Run this as the operating-system user that starts n8n. In the official image:

```bash
docker cp n8n-nodes-ibmi-mapepire-0.1.1.tgz n8n:/tmp/
docker exec -u node n8n sh -lc \
  'mkdir -p /home/node/.n8n/nodes && cd /home/node/.n8n/nodes && npm install /tmp/n8n-nodes-ibmi-mapepire-0.1.1.tgz'
docker restart n8n
```

Persist `/home/node/.n8n`. Podman uses equivalent `podman cp`, `podman exec`, and
`podman restart` commands.

## Network and TLS

The n8n process must resolve the configured host and reach its Mapepire TCP port,
normally 8076. For private PKI, either:

- paste the issuing CA into **CA Certificate PEM**, or
- mount the CA file into the n8n container and set **CA Certificate Path** to
  that in-container path.

Do not set both. `MAPEPIRE_IGNORE_UNAUTHORIZED=true` is for isolated testing,
not production.

Example container mount:

```yaml
volumes:
  - ./certs/ibmi-ca.pem:/home/node/.n8n/certs/ibmi-ca.pem:ro
```

Then configure `/home/node/.n8n/certs/ibmi-ca.pem` in the credential.

## Worker sizing

Pools are process-local. Four workers using pool size four can open up to 16
Mapepire SQL jobs, plus any main/webhook processes executing the credential.
Set IBM i and Mapepire job limits for the aggregate.
