# SPDX-License-Identifier: Apache-2.0
# Copyright (C) 2025  Bruno Bernard

FROM golang:1.25.2

WORKDIR /go/src/github.com/eznix86/docker-registry-ui
COPY . .

RUN ./build.sh

FROM golang:1.25.2
WORKDIR /go/src/github.com/eznix86/docker-registry-ui
COPY --from=0 /go/src/github.com/eznix86/docker-registry-ui/bin/dev ./

CMD ["./dev"]