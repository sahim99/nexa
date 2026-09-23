import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Security & Isolation Static Analysis Rules', () => {
  it('confirms credentials broker is the ONLY packages directory reading process.env', () => {
    const packagesDir = path.resolve(__dirname, '../../..');
    const packages = fs.readdirSync(packagesDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && d.name !== 'credentials' && d.name !== 'node_modules');

    const violations: string[] = [];

    function scanDir(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== 'tests') {
          scanDir(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
          const content = fs.readFileSync(fullPath, 'utf8');
          // Check for process.env usage
          if (/process\.env\.[A-Z0-9_]+/i.test(content) || /process\.env\[/i.test(content)) {
            violations.push(fullPath);
          }
        }
      }
    }

    for (const pkg of packages) {
      const srcDir = path.join(packagesDir, pkg.name, 'src');
      if (fs.existsSync(srcDir)) {
        scanDir(srcDir);
      }
    }

    expect(violations).toEqual([]);
  });

  it('confirms LLM SDKs are never imported outside packages/llm/src/providers', () => {
    const packagesDir = path.resolve(__dirname, '../../..');
    const packages = fs.readdirSync(packagesDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && d.name !== 'node_modules');

    const violations: string[] = [];
    const forbiddenImports = ['openai', 'groq-sdk', '@huggingface/inference'];

    function scanDir(dir: string, isAllowedDir: boolean) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
          const allowed = isAllowedDir || fullPath.includes(path.join('packages', 'llm', 'src', 'providers'));
          scanDir(fullPath, allowed);
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
          if (!isAllowedDir) {
            const content = fs.readFileSync(fullPath, 'utf8');
            for (const forbidden of forbiddenImports) {
              if (content.includes(`from '${forbidden}'`) || content.includes(`from "${forbidden}"`) || content.includes(`require('${forbidden}')`)) {
                violations.push(`${fullPath} imports ${forbidden}`);
              }
            }
          }
        }
      }
    }

    for (const pkg of packages) {
      const srcDir = path.join(packagesDir, pkg.name, 'src');
      if (fs.existsSync(srcDir)) {
        const isProvidersDir = pkg.name === 'llm' && srcDir.endsWith(path.join('llm', 'src'));
        scanDir(srcDir, false);
      }
    }

    expect(violations).toEqual([]);
  });
});
