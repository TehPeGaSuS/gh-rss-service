export interface FeedItem {
    guid: string;
    title: string;
    link: string;
    author?: string;
    description?: string;
    pubDate: string; // ISO string
}

export interface FeedResult {
    title: string;
    link: string;
    items: FeedItem[];
}

export interface RouteModule {
    // e.g. 'issue', 'pull', 'repo_event'
    key: string;
    // Path pattern mirroring RSSHub, e.g. '/issue/:user/:repo/:state?/:labels?'
    path: string;
    supported: boolean;
    note?: string;
    fetchItems: (params: Record<string, string>) => Promise<FeedResult>;
}

export interface FeedConfigEntry {
    // Unique id used in the served URL: /feed/:id
    id: string;
    route: string; // route key, e.g. 'issue'
    params: Record<string, string>;
    // Max items to retain/emit for this feed
    limit?: number;
}
