import { ghGet } from '../github.js';
import type { RouteModule } from '../types.js';

// subject.url is an API URL; turn it into the page a human opens.
function htmlUrl(item: any): string {
    const api = item.subject?.url;
    if (!api) return item.repository?.html_url ?? 'https://github.com/notifications';
    return api
        .replace('https://api.github.com/repos/', 'https://github.com/')
        .replace(/\/pulls\/(\d+)$/, '/pull/$1')
        .replace(/\/commits\/([0-9a-f]+)$/, '/commit/$1')
        .replace(/\/releases\/\d+$/, '/releases');
}

export const notifications: RouteModule = {
    key: 'notifications',
    path: '/notifications',
    supported: true,
    note: 'Requires GITHUB_ACCESS_TOKEN with notifications scope.',
    async fetchItems() {
        const data = (await ghGet('/notifications', { per_page: 50 })) as any[];
        return {
            title: 'GitHub Notifications',
            link: 'https://github.com/notifications',
            items: data.map((item) => ({
                guid: `notif-${item.id}`,
                title: `${item.repository?.full_name}: ${item.subject?.title}`,
                description: item.reason,
                pubDate: new Date(item.updated_at).toISOString(),
                link: htmlUrl(item),
                repo: item.repository?.full_name,
                type: item.subject?.type,
                reason: item.reason,
                pushKey: `notif-${item.id}@${item.updated_at}`,
            })),
        };
    },
};
