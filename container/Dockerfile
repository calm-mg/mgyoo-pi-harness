FROM node:24-bookworm-slim@sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d

RUN apt-get update \
  && apt-get install -y --no-install-recommends bash ca-certificates git ripgrep util-linux \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g --ignore-scripts @earendil-works/pi-coding-agent@0.82.0

COPY config/settings.safe.json /opt/mgyoo-pi-harness/agent-template/settings.json
COPY config/AGENTS.md /opt/mgyoo-pi-harness/agent-template/APPEND_SYSTEM.md
COPY extensions/workspace-guard /opt/mgyoo-pi-harness/agent-template/extensions/workspace-guard
COPY container/entrypoint.sh /usr/local/bin/mgyoo-pi-entrypoint

RUN chmod 0755 /usr/local/bin/mgyoo-pi-entrypoint

WORKDIR /workspace
ENTRYPOINT ["/usr/local/bin/mgyoo-pi-entrypoint"]
