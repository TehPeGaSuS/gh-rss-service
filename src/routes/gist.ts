import { ghGet } from '../github.js';
import type { RouteModule } from '../types.js';

export const gist: RouteModule = {
    key: 'gist',
    path: '/gist/:gistId',
    supported: true,
    async fetchItems({ gistId }) {
        const data = (await ghGet(`/gists/${gistId}`)) as any;
        const history: any[] = data.history ?? [];
        return {
            title: `Gist ${gistId} revisions`,
            link: data.html_url,
            items: history.map((item, index) => ({
                guid: `gist-${gistId}-${item.version}`,
                title: `Revision ${history.length - index}`,
                author: item.user?.login,
                link: `${data.html_url}/${item.version}`,
                pubDate: new Date(item.committed_at).toISOString(),
            })),
        };
    },
};
