#!/bin/sh
set -eu

echo "Starting the Anti-Spiral frontend"

exec nginx -g "daemon off;"
