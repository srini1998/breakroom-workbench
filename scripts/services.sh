#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .local
task_docker_socket="${BREAKROOM_DOCKER_SOCKET:-$HOME/.colima/breakroom/docker.sock}"
if ! DOCKER_HOST="unix://$task_docker_socket" docker info >/dev/null 2>&1; then
  colima start breakroom --activate=false --cpu 4 --memory 6 --disk 20 --dns 1.1.1.1 --dns 8.8.8.8 --mount none
fi
export DOCKER_HOST="unix://$task_docker_socket"
if ! docker network inspect breakroom-local >/dev/null 2>&1; then
  docker network create -o com.docker.network.bridge.host_binding_ipv4=127.0.0.1 breakroom-local >/dev/null
fi
# CLI startup output can include local keys. Capture it in an ignored file, never public logs.
if ! npx supabase start --network-id breakroom-local --exclude studio,analytics,vector,meta,edge-runtime,imgproxy,inbucket > .local/services-start.log 2>&1; then
  echo "Supabase startup failed. Inspect the private .local/services-start.log locally."
  exit 1
fi
node --input-type=module -e 'import fs from "node:fs";const p=".local/services-start.log";fs.writeFileSync(p,fs.readFileSync(p,"utf8").split("\n").filter(l=>!/(?:SERVICE_ROLE_KEY|SECRET_KEY|JWT_SECRET|eyJ[a-zA-Z0-9_-]{20,}\.|postgresql:\/\/[^\s@]+:[^\s@]+@)/.test(l)).join("\n"));'
node --input-type=module -e 'const deadline=Date.now()+30000;while(Date.now()<deadline){try{const r=await fetch("http://127.0.0.1:54321/auth/v1/health",{signal:AbortSignal.timeout(2000)});if(r.ok){console.log("Local Supabase Auth is ready.");process.exit(0)}}catch{}await new Promise(r=>setTimeout(r,500))}throw Error("Supabase readiness deadline exceeded")'
echo "Local Supabase is ready; active Docker context was not changed."
