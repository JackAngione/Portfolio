#!/usr/bin/env bash
# Support invocation with `sh deploy_backend.sh` as well as direct execution.
if [ -z "${BASH_VERSION:-}" ]; then
  exec bash "$0" "$@"
fi
set -euo pipefail

usage() {
  echo "Usage: $0 --version <tag>"
  echo "Example: $0 --version v2.0.2"
}

IMAGE_TAG=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --version)
      if [[ $# -lt 2 || -z "${2:-}" || "${2:-}" == --* ]]; then
        echo "Error: --version requires a tag." >&2
        usage >&2
        exit 1
      fi
      if [[ -n "$IMAGE_TAG" ]]; then
        echo "Error: --version may only be specified once." >&2
        exit 1
      fi
      IMAGE_TAG="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Error: unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "$IMAGE_TAG" ]]; then
  echo "Error: --version is required." >&2
  usage >&2
  exit 1
fi
if [[ ! "$IMAGE_TAG" =~ ^[a-zA-Z0-9_][a-zA-Z0-9_.-]{0,127}$ ]]; then
  echo "Error: invalid Docker image tag: $IMAGE_TAG" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

IMAGE_NAME="registry.gitlab.com/8jk.ang8/portfolio/backend"
CONTAINER_NAME="Portfolio_Backend"
HOST_PORT="${HOST_PORT:-3000}"
CONTAINER_PORT="${CONTAINER_PORT:-3000}"
PLATFORM="${PLATFORM:-linux/amd64}"
PUSH_TO_GITLAB="${PUSH_TO_GITLAB:-false}"

DOCKERFILE_PATH="$SCRIPT_DIR/Dockerfile"
BUILD_CONTEXT="$REPO_ROOT/backend"
FULL_IMAGE_NAME="$IMAGE_NAME:$IMAGE_TAG"

load_env() {
  local env_file="$SCRIPT_DIR/.env"

  if [[ -f "$env_file" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$env_file"
    set +a
  fi
}

run_command() {
  printf 'Executing command:'
  printf ' %q' "$@"
  printf '\n'
  "$@"
}

require_env() {
  local name="$1"

  if [[ -z "${!name:-}" ]]; then
    echo "Missing required environment variable: $name" >&2
    exit 1
  fi
}

load_env
require_env "GITLAB_USERNAME"
require_env "GITLAB_PASSWORD"

echo
echo "Logging in to GitLab Container Registry..."
printf '%s' "$GITLAB_PASSWORD" | docker login registry.gitlab.com \
  --username "$GITLAB_USERNAME" \
  --password-stdin

echo
echo "--- Building Docker image: $FULL_IMAGE_NAME ---"
run_command docker build \
  --platform "$PLATFORM" \
  -f "$DOCKERFILE_PATH" \
  -t "$FULL_IMAGE_NAME" \
  "$BUILD_CONTEXT"

if [[ "$PUSH_TO_GITLAB" == "true" ]]; then
  echo
  echo "--- Pushing Docker image: $FULL_IMAGE_NAME ---"
  run_command docker push "$FULL_IMAGE_NAME"
fi

echo
echo "--- Checking for existing container: $CONTAINER_NAME ---"
docker stop "$CONTAINER_NAME" >/dev/null 2>&1 || true
docker rm "$CONTAINER_NAME" >/dev/null 2>&1 || true
echo "Cleanup of existing container complete."
echo "No container was started."

echo
echo "--- Script Finished ---"
