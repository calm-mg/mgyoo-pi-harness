FROM node:24-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends bash ca-certificates git ripgrep \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g --ignore-scripts @earendil-works/pi-coding-agent@0.82.0

COPY config/settings.safe.json /opt/mgyoo-pi-harness/agent-template/settings.json
COPY config/AGENTS.md /opt/mgyoo-pi-harness/agent-template/APPEND_SYSTEM.md
COPY extensions/workspace-guard /opt/mgyoo-pi-harness/agent-template/extensions/workspace-guard
COPY container/entrypoint.sh /usr/local/bin/mgyoo-pi-entrypoint

RUN chmod 0755 /usr/local/bin/mgyoo-pi-entrypoint

WORKDIR /workspace
ENTRYPOINT ["/usr/local/bin/mgyoo-pi-entrypoint"]
