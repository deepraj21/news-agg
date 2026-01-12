import { Cluster, Source } from '../types';

export function generateClusterId(): string {
  return `cluster-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

export function parseRSSDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

export function formatClusterResponse(
  title: string,
  summary: string,
  sources: Source[],
  clusterId?: string
): Cluster {
  const sortedSources = sources.sort((a, b) => {
    const dateA = new Date(a.pubDate).getTime();
    const dateB = new Date(b.pubDate).getTime();
    return dateB - dateA;
  });

  const latestDate = sortedSources.length > 0 
    ? formatDate(sortedSources[0].pubDate)
    : new Date().toISOString();

  return {
    clusterId: clusterId || generateClusterId(),
    title: title || 'Untitled',
    summary: summary || '',
    articleCount: sources.length,
    latestDate,
    sources: sortedSources,
  };
}

