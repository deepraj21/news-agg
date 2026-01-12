import { createNewsAgent } from '../agent/newsAgent';
import { Cluster, Source } from '../types';
import { formatClusterResponse } from '../utils/formatter';

export async function processUrls(urls: string[], clusterId?: string): Promise<Cluster> {
  const agent = createNewsAgent();
  
  const sources: Source[] = [];
  let aggregatedContent = '';
  let titles: string[] = [];

  for (const url of urls) {
    try {
      const extractPrompt = `Use the extractUrlContent tool to get content from: ${url}. Then analyze the content and extract:
- Article title
- Source name (from URL or content)
- Publication date (in RFC 2822 format like "Mon, 12 Jan 2026 08:33:14 +0000")
- Main article content

Return the information in a structured format.`;

      const result = await agent.generate({
        prompt: extractPrompt,
      });

      const parsePrompt = `Parse the following agent response and extract structured data. Return JSON format:
{
  "title": "article title",
  "source": "source name",
  "pubDate": "RFC 2822 date format",
  "content": "main content summary"
}

Agent response:
${result.text}

Original URL: ${url}`;

      const parsedResult = await agent.generate({
        prompt: parsePrompt,
      });

      try {
        const jsonMatch = parsedResult.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          
          const source: Source = {
            source: parsed.source || extractSourceFromUrl(url),
            title: parsed.title || 'Untitled',
            url: url,
            pubDate: parsed.pubDate || formatToRFC2822(new Date()),
          };
          
          sources.push(source);
          titles.push(parsed.title || 'Untitled');
          aggregatedContent += `\n\nTitle: ${parsed.title}\nSource: ${parsed.source}\nContent: ${parsed.content || result.text}\n`;
        } else {
          const title = extractTitleFromText(parsedResult.text) || 'Untitled';
          const source: Source = {
            source: extractSourceFromUrl(url),
            title: title,
            url: url,
            pubDate: formatToRFC2822(new Date()),
          };
          sources.push(source);
          titles.push(title);
          aggregatedContent += `\n\nURL: ${url}\nContent: ${parsedResult.text}\n`;
        }
      } catch {
        const title = extractTitleFromText(result.text) || 'Untitled';
        const source: Source = {
          source: extractSourceFromUrl(url),
          title: title,
          url: url,
          pubDate: formatToRFC2822(new Date()),
        };
        sources.push(source);
        titles.push(title);
        aggregatedContent += `\n\nURL: ${url}\nContent: ${result.text}\n`;
      }
    } catch (error) {
      console.error(`Error processing URL ${url}:`, error);
      const source: Source = {
        source: extractSourceFromUrl(url),
        title: 'Error loading article',
        url: url,
        pubDate: formatToRFC2822(new Date()),
      };
      sources.push(source);
    }
  }

  const mainTitle = titles.length > 0 ? titles[0] : 'News Cluster';
  
  const summaryPrompt = `Analyze the following news articles and provide a comprehensive summary (2-3 paragraphs) covering the main points, themes, and key information from all articles.

Articles:
${aggregatedContent}

Provide a well-structured summary that captures the essence of all the articles.`;

  const summaryResult = await agent.generate({
    prompt: summaryPrompt,
  });

  const summary = extractSummary(summaryResult.text);
  const finalTitle = extractTitle(summaryResult.text) || mainTitle;

  return formatClusterResponse(finalTitle, summary, sources, clusterId);
}

function extractSourceFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace(/^www\./, '');
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      return parts[parts.length - 2];
    }
    return hostname;
  } catch {
    return 'Unknown';
  }
}

function formatToRFC2822(date: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const day = days[date.getUTCDay()];
  const dayNum = date.getUTCDate().toString().padStart(2, '0');
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const seconds = date.getUTCSeconds().toString().padStart(2, '0');
  
  return `${day}, ${dayNum} ${month} ${year} ${hours}:${minutes}:${seconds} +0000`;
}

function extractSummary(text: string): string {
  const summaryMatch = text.match(/SUMMARY:\s*(.+?)(?=TOPICS:|INSIGHTS:|$)/is);
  if (summaryMatch) {
    return summaryMatch[1].trim();
  }
  
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length > 0) {
    return lines.slice(0, 5).join(' ').substring(0, 1000);
  }
  
  return text.substring(0, 1000);
}

function extractTitle(text: string): string | null {
  const titleMatch = text.match(/TITLE:\s*(.+?)(?=\n|$)/i);
  if (titleMatch) {
    return titleMatch[1].trim();
  }
  return null;
}

function extractTitleFromText(text: string): string | null {
  const titlePatterns = [
    /title["\']?\s*:\s*["']?([^"'\n]+)/i,
    /<title[^>]*>([^<]+)<\/title>/i,
    /^#\s+(.+)$/m,
  ];
  
  for (const pattern of titlePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  const firstLine = text.split('\n')[0]?.trim();
  if (firstLine && firstLine.length > 10 && firstLine.length < 200) {
    return firstLine;
  }
  
  return null;
}

