FROM ubuntu:24.04 AS blender-base
ARG BLENDER_VERSION=5.2.2
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl xz-utils libx11-6 libxi6 libxxf86vm1 libxfixes3 libxrender1 libgl1 libegl1 libxkbcommon0 libsm6 libgomp1 time python3 && apt-get clean && find /var/lib/apt/lists -type f -delete
WORKDIR /opt
RUN curl -fSLO https://download.blender.org/release/Blender5.2/blender-${BLENDER_VERSION}-linux-x64.tar.xz \
 && curl -fSLo checksums https://download.blender.org/release/Blender5.2/blender-${BLENDER_VERSION}.sha256 \
 && grep " blender-${BLENDER_VERSION}-linux-x64.tar.xz$" checksums | sha256sum -c - \
 && tar -xf blender-${BLENDER_VERSION}-linux-x64.tar.xz \
 && ln -s /opt/blender-${BLENDER_VERSION}-linux-x64/blender /usr/local/bin/blender \
 && find /opt -maxdepth 1 -type f -delete
WORKDIR /job
ENV OMP_NUM_THREADS=3 OPENBLAS_NUM_THREADS=3
FROM ubuntu:24.04 AS timer-build
RUN apt-get update && apt-get install -y --no-install-recommends gcc libc6-dev
COPY rdtscp_compat.c /src/rdtscp_compat.c
RUN gcc -shared -fPIC -O2 -Wall -Wextra -Werror /src/rdtscp_compat.c -o /rdtscp_compat.so
COPY rdtscp_check.c /src/rdtscp_check.c
RUN gcc -O2 -Wall -Wextra -Werror /src/rdtscp_check.c -o /rdtscp-check \
 && LD_PRELOAD=/rdtscp_compat.so /rdtscp-check \
 && sh -c 'LD_PRELOAD=/rdtscp_compat.so /rdtscp-check --trap; test "$?" -eq 132' \
 && sh -c 'LD_PRELOAD=/rdtscp_compat.so /rdtscp-check --signal; test "$?" -eq 132'
FROM blender-base
COPY --from=timer-build /rdtscp_compat.so /opt/rdtscp_compat.so
ENTRYPOINT ["/usr/bin/nice", "-n", "15", "/usr/bin/time", "-v", "env", "LD_PRELOAD=/opt/rdtscp_compat.so", "blender", "-t", "3"]
