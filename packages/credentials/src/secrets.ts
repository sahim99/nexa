/**
 * Credential Broker - Phase 1 implementation.
 * This is the ONLY place in the system allowed to read process.env.
 * In Phase 3, this will be replaced with a secure vault and dynamic credential injection.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from workspace root if available
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
// Also try apps/api/.env
dotenv.config({ path: path.resolve(process.cwd(), '../../apps/api/.env') });

export function getSecret(name: string, fallback?: string): string {
  const value = process.env[name] || fallback;
  if (!value) {
    throw new Error(`Credential Broker Error: Required secret '${name}' is not set.`);
  }
  return value;
}
