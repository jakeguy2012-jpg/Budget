#!/bin/bash
set -e
pnpm install --frozen-lockfile
# --force skips interactive prompts (e.g. "truncate table?" → No by default)
pnpm --filter db push -- --force
