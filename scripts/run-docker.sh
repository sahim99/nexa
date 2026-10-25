#!/usr/bin/env bash
set -e

echo ""
echo "========================================================"
echo "       NEXA V3 — FULL DOCKER DEPLOYMENT LAUNCHER         "
echo "========================================================"
echo ""

# 1. Check Docker status
echo "[1/4] Checking Docker daemon status..."
if ! docker info > /dev/null 2>&1; then
    echo "[ERROR] Docker is not running. Please start Docker engine and re-run."
    exit 1
fi
echo "[OK] Docker is active and ready!"

# 2. Check and configure Supabase DATABASE_URL
echo ""
echo "[2/4] Verifying Supabase Database connection..."
ENV_FILE="$(dirname "$0")/../.env"

if [ -f "$ENV_FILE" ]; then
    export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

if [ -z "$DATABASE_URL" ] || [[ "$DATABASE_URL" == *"localhost"* ]]; then
    echo "Please enter your Supabase PostgreSQL connection string:"
    read -r SUPABASE_URL
    if [ -n "$SUPABASE_URL" ]; then
        echo "DATABASE_URL=\"$SUPABASE_URL\"" >> "$ENV_FILE"
        export DATABASE_URL="$SUPABASE_URL"
    else
        echo "[ERROR] DATABASE_URL is required."
        exit 1
    fi
fi
echo "[OK] Database URL loaded."

# 3. Synchronize Prisma Schema to Supabase
echo ""
echo "[3/4] Syncing Database schema with Supabase..."
npx prisma db push --schema=packages/database/prisma/schema.prisma --accept-data-loss || true

# 4. Build and start containers
echo ""
echo "[4/4] Building and launching containers..."
COMPOSE_FILE="$(dirname "$0")/../docker-compose.app.yml"
docker compose -f "$COMPOSE_FILE" up --build -d

echo ""
echo "========================================================"
echo "       NEXA V3 IS RUNNING IN DOCKER CONTAINERS!          "
echo "========================================================"
echo ""
echo "  -> COMMAND CENTER UI (Next.js):"
echo "     http://localhost:3000/dashboard"
echo ""
echo "  -> BACKEND API & SWAGGER DOCS (NestJS):"
echo "     http://localhost:3001/api/docs"
echo ""
