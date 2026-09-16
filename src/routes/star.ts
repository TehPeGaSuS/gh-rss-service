import { ghGraphql } from '../github.js';
import type { RouteModule } from '../types.js';

const QUERY = `
query ($owner: String!, $repo: String!) {
  repository(owner: $owner, name: $repo) {
    stargazers(first: 50, orderBy: {field: STARRED_AT, direction: DESC}) {
      edges { starredAt node { login avatarUrl url } }
    }
  }
}`;

export const star: RouteModule = {
    key: 'stars',
    path: '/stars/:user/:repo',
    supported: true,
    async fetchItems({ user, repo }) {
        const data = await ghGraphql(QUERY, { owner: user, repo });
        const edges: any[] = data.repository?.stargazers?.edges ?? [];
        return {
            title: `${user}/${repo} Stargazers`,
            link: `https://github.com/${user}/${repo}/stargazers`,
            items: edges.map(({ node, starredAt }) => ({
                guid: `${user}/${repo}#star-${node.login}`,
                title: node.login,
                link: node.url,
                description: `<img src="${node.avatarUrl}" width="50">`,
                pubDate: new Date(starredAt).toISOString(),
            })),
        };
    },
};
