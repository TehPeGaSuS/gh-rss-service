import { ghGet } from '../github.js';
import type { RouteModule } from '../types.js';
import { eventToItem } from './eventShared.js';

export const orgEvent: RouteModule = {
    key: 'org_event',
    path: '/org_event/:org/:types?',
    supported: true,
    async fetchItems({ org, types }) {
        const filter = types ? new Set(types.split(',')) : undefined;
        const events = (await ghGet(`/orgs/${org}/events`, { per_page: 100 })) as any[];
        return {
            title: `${org} Org Events`,
            link: `https://github.com/${org}`,
            items: events.filter((e) => !filter || filter.has(e.type)).map(eventToItem),
        };
    },
};
