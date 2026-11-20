FROM node:24-bookworm-slim@sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d AS ci-base

RUN apt-get update \
  && apt-get install -y --no-install-recommends bash ca-certificates curl git ripgrep util-linux \
  && rm -rf /var/lib/apt/lists/*

FROM ci-base AS harness
ARG TOOL
ARG VERSION
COPY container/install-tool.sh /usr/local/lib/harness/install-tool.sh
RUN sh /usr/local/lib/harness/install-tool.sh "$TOOL" "$VERSION"

ENV HARNESS_TOOL=$TOOL HOME=/state/home USER=harness LOGNAME=harness
COPY config/ /opt/harness/config/
COPY extensions/workspace-guard/ /opt/harness/extensions/workspace-guard/
COPY container/entrypoint.sh /usr/local/lib/harness/entrypoint.sh

WORKDIR /workspace
ENTRYPOINT ["/bin/sh", "/usr/local/lib/harness/entrypoint.sh"]
