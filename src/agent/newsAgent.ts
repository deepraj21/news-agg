import { ToolLoopAgent, stepCountIs } from 'ai';
import { webSearch } from '@exalabs/ai-sdk';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { tool } from 'ai';
import { z } from 'zod';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

export const createNewsAgent = () => {
  return new ToolLoopAgent({
    model: openrouter.chat('xiaomi/mimo-v2-flash:free'),
    tools: {
      webSearch: webSearch(),
      extractUrlContent: tool({
        description: 'Extract and analyze content from a specific URL. Use this to get article content, title, publication date, and source information.',
        inputSchema: z.object({
          url: z.string().describe('The URL to extract content from'),
        }),
        execute: async ({ url }) => {
          try {
            const response = await fetch(url);
            const html = await response.text();
            
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            const title = titleMatch ? titleMatch[1].trim() : 'Untitled';
            
            const metaDateMatch = html.match(/<meta[^>]*property=["']article:published_time["'][^>]*content=["']([^"']+)["']/i) ||
                                 html.match(/<meta[^>]*name=["']pubdate["'][^>]*content=["']([^"']+)["']/i) ||
                                 html.match(/<time[^>]*datetime=["']([^"']+)["']/i);
            const pubDate = metaDateMatch ? metaDateMatch[1] : new Date().toISOString();
            
            const sourceMatch = url.match(/https?:\/\/(?:www\.)?([^\/]+)/);
            const source = sourceMatch ? sourceMatch[1].replace(/^www\./, '') : 'Unknown';
            
            const textContent = html
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .substring(0, 5000);
            
            return {
              url,
              title,
              source,
              pubDate,
              content: textContent,
            };
          } catch (error) {
            return {
              url,
              title: 'Error extracting content',
              source: 'Unknown',
              pubDate: new Date().toISOString(),
              content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
          }
        },
      }),
    },
    stopWhen: stepCountIs(10),
  });
};

