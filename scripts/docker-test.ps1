$ErrorActionPreference = "Stop"
Write-Host "Starting Nexa Docker E2E test suite..."
docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from test-runner
