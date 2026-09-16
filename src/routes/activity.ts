import { ghAtom } from '../github.js';
import { parseAtomEntries } from '../atom.js';
import type { RouteModule } from '../types.js';

export const activity: RouteModule = {
    key: 'activity',
    path: '/activity/:user',
    supported: true,
    note: 'Uses GitHub public Atom feed (github.com/:user.atom), not the REST API.',
    async fetchItems({ user }) {
        const xml = await ghAtom(`/${user}.atom`);
        return {
            title: `${user}'s Activity`,
            link: `https://github.com/${user}`,
            items: parseAtomEntries(xml),
        };
    },
};
