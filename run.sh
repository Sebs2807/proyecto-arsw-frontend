#!/bin/sh
mkdir certs
cd certs
mkcert synapse localhost
cd ..
docker compose -f docker-compose.$1.yaml up --build