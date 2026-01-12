export interface Source {
  source: string;
  title: string;
  url: string;
  pubDate: string;
}

export interface Cluster {
  clusterId: string;
  title: string;
  summary: string;
  articleCount: number;
  latestDate: string;
  sources: Source[];
}

export interface ProcessNewsRequest {
  urls: string[];
  clusterId?: string;
}

export interface ProcessNewsResponse {
  success: boolean;
  data?: Cluster;
  error?: string;
}

