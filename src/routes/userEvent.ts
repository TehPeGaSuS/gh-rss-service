import { ghGet } from '../github.js';
import type { RouteModule } from '../types.js';
import { eventToItem } from './eventShared.js';

export const userEvent: RouteModule = {
    key: 'user_event',
    path: '/user_event/:username/:types?',
    supported: true,
    async fetchItems({ username, types }) {
        const filter = types ? new Set(types.split(',')) : undefined;
        const suffix = process.env.GITHUB_ACCESS_TOKEN ? '' : '/public';
        const events = (await ghGet(`/users/${username}/events${suffix}`, { per_page: 100 })) as any[];
        return {
            title: `${username} User Events`,
            link: `https://github.com/${username}`,
            items: events.filter((e) => !filter || filter.has(e.type)).map(eventToItem),
        };
    },
};
