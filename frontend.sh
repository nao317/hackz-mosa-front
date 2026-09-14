#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$ROOT_DIR/react-router"

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

if [[ -s "$NVM_DIR/nvm.sh" ]]; then
  # shellcheck source=/dev/null
  source "$NVM_DIR/nvm.sh"
  nvm use 24 >/dev/null
  NVM_NODE="$(nvm which 24)"
  export PATH="$(dirname "$NVM_NODE"):$PATH"
  hash -r
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is not installed." >&2
  exit 1
fi

NODE_MAJOR="$(node --version | sed -E 's/^v([0-9]+).*/\1/')"
if (( NODE_MAJOR < 24 )); then
  echo "Error: Node.js 24 or later is required (current: $(node --version))." >&2
  exit 1
fi

cd "$APP_DIR"

COMMAND="${1:-help}"
if (( $# > 0 )); then
  shift
fi

case "$COMMAND" in
  install | i)
    exec npm install "$@"
    ;;
  lint)
    exec npx eslint . "$@"
    ;;
  test)
    exec npm run test -- "$@"
    ;;
  build)
    exec npm run build -- "$@"
    ;;
  dev)
    exec npm run dev -- "$@"
    ;;
  all)
    npm install
    npx eslint .
    npm run test
    npm run build
    ;;
  help | -h | --help)
    cat <<'EOF'
Usage: ./frontend.sh <command> [options]

Commands:
  install, i  Install dependencies with npm install
  lint        Run ESLint for the React Router project
  test        Run tests
  build       Create a production build
  dev         Start the development server
  all         Run install, lint, test, and build
EOF
    ;;
  *)
    echo "Error: Unknown command: $COMMAND" >&2
    echo "Run './frontend.sh help' to see available commands." >&2
    exit 1
    ;;
esac
