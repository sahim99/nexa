import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { LlmGateway } from '@nexa/llm';

describe('E2E: Detachable LLM Provider Swap (YAML-Driven)', () => {
  it('swaps active provider purely by updating YAML configuration without code changes', () => {
    // Create a temporary YAML config
    const tempYamlPath = path.join(os.tmpdir(), `test-provider-map-${Date.now()}.yaml`);

    const initialYaml = `
COVER_LETTER:
  primary: groq
  model: llama-3.1-8b-instant
  fallback: template
`;
    fs.writeFileSync(tempYamlPath, initialYaml, 'utf8');

    const gateway = new LlmGateway(undefined, undefined, undefined, tempYamlPath);
    let route = gateway.route('COVER_LETTER');
    expect(route[0].provider).toBe('groq');

    // Dynamically swap primary provider to 'openrouter' in YAML
    const updatedYaml = `
COVER_LETTER:
  primary: openrouter
  model: meta-llama/llama-3.3-70b-instruct:free
  fallback: template
`;
    fs.writeFileSync(tempYamlPath, updatedYaml, 'utf8');

    // Reload configuration
    gateway.loadConfig(tempYamlPath);
    route = gateway.route('COVER_LETTER');

    expect(route[0].provider).toBe('openrouter');
    expect(route[0].model).toBe('meta-llama/llama-3.3-70b-instruct:free');

    // Cleanup
    try {
      fs.unlinkSync(tempYamlPath);
    } catch {}
  });
});
