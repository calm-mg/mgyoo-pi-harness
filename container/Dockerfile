FROM node:26-bookworm-slim@sha256:0042e17d232a87a2cd485be1da7900fca4d10a4ad11b29e9285da1d2e54798c9

RUN apt-get update \
  && apt-get install -y --no-install-recommends bash ca-certificates curl git ripgrep util-linux \
  && rm -rf /var/lib/apt/lists/*

ARG TOOL
ARG VERSION
COPY lib/omp-release.mjs /usr/local/lib/harness/
COPY container/install-tool.sh /usr/local/lib/harness/install-tool.sh
RUN sh /usr/local/lib/harness/install-tool.sh "$TOOL" "$VERSION"

ENV HARNESS_TOOL=$TOOL HOME=/state/home USER=harness LOGNAME=harness
COPY config/ /opt/harness/config/
COPY extensions/workspace-guard/ /opt/harness/extensions/workspace-guard/
COPY container/entrypoint.sh /usr/local/lib/harness/entrypoint.sh

WORKDIR /workspace
ENTRYPOINT ["/bin/sh", "/usr/local/lib/harness/entrypoint.sh"]
