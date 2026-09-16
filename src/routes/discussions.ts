import { ghGraphql } from '../github.js';
import type { RouteModule } from '../types.js';

const QUERY = `
query ($owner: String!, $repo: String!, $states: [DiscussionState!]) {
  repository(owner: $owner, name: $repo) {
    discussions(first: 50, orderBy: {field: CREATED_AT, direction: DESC}, states: $states) {
      nodes { number title url createdAt author { login } bodyText category { name } }
    }
  }
}`;

export const discussions: RouteModule = {
    key: 'discussion',
    path: '/discussion/:user/:repo/:state?/:category?',
    supported: true,
    note: 'Requires GITHUB_ACCESS_TOKEN with repo/read access (GraphQL).',
    async fetchItems({ user, repo, state, category }) {
        const states = state ? [state.toUpperCase()] : undefined;
        const data = await ghGraphql(QUERY, { owner: user, repo, states });
        let nodes: any[] = data.repository?.discussions?.nodes ?? [];
        if (category) nodes = nodes.filter((n) => n.category?.name?.toLowerCase() === category.toLowerCase());
        return {
            title: `${user}/${repo} Discussions`,
            link: `https://github.com/${user}/${repo}/discussions`,
            items: nodes.map((item) => ({
                guid: `${user}/${repo}#discussion-${item.number}`,
                title: item.title,
                author: item.author?.login,
                description: item.bodyText,
                pubDate: new Date(item.createdAt).toISOString(),
                link: item.url,
            })),
        };
    },
};
