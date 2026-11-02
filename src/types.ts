export interface FeedItem {
    guid: string;
    title: string;
    link: string;
    author?: string;
    description?: string;
    pubDate: string; // ISO string
    // The fields below are not stored or rendered in RSS; they only travel in
    // webhook pushes (see webhook.ts).
    // owner/repo, for routes that mix repos (notifications, *_event).
    repo?: string;
    // Notification subject type (PullRequest, Issue...) or event type (PushEvent...).
    type?: string;
    // Notification reason (mention, review_requested, subscribed...).
    reason?: string;
    // Key the webhook dedups on, when it must differ from guid: a notification
    // thread keeps its id, but each new activity on it should be pushed again.
    pushKey?: string;
    // open / closed / merged, for routes whose items change state (pull, issue):
    // a state change is pushed again, with an action.
    state?: 'open' | 'closed' | 'merged';
    // Set by the push tracking: opened, closed, merged or reopened.
    action?: string;
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
