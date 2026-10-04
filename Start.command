#!/bin/zsh
cd "${0:A:h}"
TASK_NODE="$(command -v node)"
if [[ -z "$TASK_NODE" ]]; then
  TASK_NODE="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
fi
TASK_PRIVATE_DIR="${0:A:h}/../../work/personal-dashboard-private"
mkdir -p "$TASK_PRIVATE_DIR"
chmod 700 "$TASK_PRIVATE_DIR"
if [[ ! -f "$TASK_PRIVATE_DIR/login-password" ]]; then
  "$TASK_NODE" -e 'require("node:fs").writeFileSync(process.argv[1],require("node:crypto").randomBytes(32).toString("base64url"),{mode:0o600})' "$TASK_PRIVATE_DIR/login-password"
fi
pbcopy < "$TASK_PRIVATE_DIR/login-password"
echo 'Das lokale Passwort ist in der Zwischenablage. Im Login mit Cmd+V einfügen.'
echo 'Beim ersten Öffnen das lokale HTTPS-Zertifikat nur für localhost bestätigen.'
if curl --silent --insecure --fail --max-time 2 'https://localhost:8766/api/cockpit' >/dev/null; then
  open 'https://localhost:8766/intern/persoenlich'
  echo 'Das Dashboard läuft bereits.'
  exit 0
fi
export PERSONAL_OPEN_BROWSER=1
exec "$TASK_NODE" tools/local-server.cjs
