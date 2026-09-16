import { ghGet } from '../github.js';
import type { RouteModule } from '../types.js';

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
                link: (item.subject?.url ?? 'https://api.github.com/repos/').replace('https://api.github.com/repos/', 'https://github.com/'),
            })),
        };
    },
};
