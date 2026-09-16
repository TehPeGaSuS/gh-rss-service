import { ghGraphql } from '../github.js';
import type { RouteModule } from '../types.js';

const QUERY = `
query ($login: String!) {
  user(login: $login) {
    followers(first: 50, orderBy: {field: LOGIN, direction: DESC}) {
      nodes { login avatarUrl url }
    }
  }
}`;

export const follower: RouteModule = {
    key: 'user_followers',
    path: '/user/followers/:user',
    supported: true,
    async fetchItems({ user }) {
        const data = await ghGraphql(QUERY, { login: user });
        const nodes: any[] = data.user?.followers?.nodes ?? [];
        return {
            title: `${user}'s Followers`,
            link: `https://github.com/${user}`,
            items: nodes.map((n) => ({
                guid: `${user}#follower-${n.login}`,
                title: n.login,
                link: n.url,
                description: `<img src="${n.avatarUrl}" width="50">`,
                pubDate: new Date().toISOString(),
            })),
        };
    },
};
