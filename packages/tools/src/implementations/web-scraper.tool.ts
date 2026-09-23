import { Tool, ToolPermissionTier } from '../tool.interface';

export class WebScraperTool implements Tool {
  name = 'web_scraper';
  description = 'Scrapes content from a public URL and returns it as text.';
  permissionTier = ToolPermissionTier.READONLY;
  schema = {
    type: 'object',
    properties: {
      url: { type: 'string' }
    },
    required: ['url']
  };

  async execute(input: { url: string }): Promise<any> {
    // Basic mock implementation for now
    return `[UNTRUSTED CONTENT] Scraped markdown content from ${input.url}`;
  }
}
