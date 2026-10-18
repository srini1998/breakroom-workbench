#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Intentionally sequential, matching the product build order.
for product in AccessProof EventMedic ErasureCheck ImportRescue EconomyBreaker; do
  node --import tsx scripts/verify-product.ts "$product"
done
node --import tsx scripts/evaluation-report.ts
