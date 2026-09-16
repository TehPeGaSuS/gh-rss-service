import { ghGet } from '../github.js';
import type { RouteModule } from '../types.js';
import { eventToItem } from './eventShared.js';

// Requires GITHUB_ACCESS_TOKEN with access to the target user's received events (their home-feed activity).
export const privateFeed: RouteModule = {
    key: 'feed',
    path: '/feed/:user/:types?',
    supported: true,
    note: 'Requires GITHUB_ACCESS_TOKEN authorized for the target user (received_events).',
    async fetchItems({ user, types }) {
        const filter = types ? new Set(types.split(',')) : undefined;
        const events = (await ghGet(`/users/${user}/received_events`, { per_page: 100 })) as any[];
        return {
            title: `${user} Private Feed`,
            link: `https://github.com/${user}`,
            items: events.filter((e) => !filter || filter.has(e.type)).map(eventToItem),
        };
    },
};
