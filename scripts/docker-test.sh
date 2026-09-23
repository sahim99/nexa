#!/usr/bin/env bash
set -e

echo "Starting Nexa Docker E2E test suite..."
docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from test-runner
