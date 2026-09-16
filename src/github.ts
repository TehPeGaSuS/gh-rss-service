const API_ROOT = 'https://api.github.com';

export class GithubApiError extends Error {}

function headers(extra: Record<string, string> = {}): Record<string, string> {
    const token = process.env.GITHUB_ACCESS_TOKEN;
    return {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'gh-rss-service',
        ...(token ? { Authorization: `token ${token}` } : {}),
        ...extra,
    };
}

// Simple in-memory ETag cache so unchanged endpoints cost 0 rate-limit units (304s are free).
const etagCache = new Map<string, { etag: string; body: unknown }>();

export async function ghGet(path: string, query?: Record<string, string | number | undefined>): Promise<unknown> {
    const url = new URL(path.startsWith('http') ? path : `${API_ROOT}${path}`);
    if (query) {
        for (const [k, v] of Object.entries(query)) {
            if (v !== undefined) url.searchParams.set(k, String(v));
        }
    }
    const cacheKey = url.toString();
    const cached = etagCache.get(cacheKey);
    const res = await fetch(url, {
        headers: headers(cached ? { 'If-None-Match': cached.etag } : {}),
    });

    if (res.status === 304 && cached) {
        return cached.body;
    }
    if (!res.ok) {
        throw new GithubApiError(`GitHub API ${res.status} for ${url}: ${await res.text()}`);
    }
    const body = await res.json();
    const etag = res.headers.get('etag');
    if (etag) etagCache.set(cacheKey, { etag, body });
    return body;
}

export async function ghGraphql(query: string, variables: Record<string, unknown>): Promise<any> {
    const res = await fetch(`${API_ROOT}/graphql`, {
        method: 'POST',
        headers: headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) {
        throw new GithubApiError(`GitHub GraphQL ${res.status}: ${await res.text()}`);
    }
    const json = await res.json();
    if (json.errors) {
        throw new GithubApiError(`GitHub GraphQL errors: ${JSON.stringify(json.errors)}`);
    }
    return json.data;
}

// GitHub also publishes plain Atom feeds for user activity / releases / commits / wiki history,
// which are free (no REST rate-limit) and require no auth for public data.
export async function ghAtom(path: string): Promise<string> {
    const res = await fetch(`https://github.com${path}`, { headers: headers() });
    if (!res.ok) {
        throw new GithubApiError(`GitHub atom ${res.status} for ${path}`);
    }
    return res.text();
}
