import { ghGet } from '../github.js';
import type { RouteModule } from '../types.js';

export const file: RouteModule = {
    key: 'file',
    path: '/file/:user/:repo/:branch/:filepath',
    supported: true,
    async fetchItems({ user, repo, branch, filepath }) {
        const host = `https://github.com/${user}/${repo}`;
        const data = (await ghGet(`/repos/${user}/${repo}/commits`, { sha: branch, path: filepath, per_page: 50 })) as any[];
        return {
            title: `${user}/${repo} - ${filepath} commit history`,
            link: `${host}/commits/${branch}/${filepath}`,
            items: data.map((item) => ({
                guid: `commit-${item.sha}`,
                title: item.commit?.message?.split('\n')[0] ?? item.sha,
                author: item.commit?.author?.name,
                description: item.commit?.message,
                pubDate: new Date(item.commit?.author?.date ?? item.commit?.committer?.date).toISOString(),
                link: item.html_url,
            })),
        };
    },
};
