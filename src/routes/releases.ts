import { ghAtom } from '../github.js';
import { parseAtomEntries } from '../atom.js';
import type { RouteModule } from '../types.js';

// GitHub publishes releases.atom / commits.atom / wiki.atom natively; using them directly
// is simpler and cheaper than the REST API and needs no auth for public repos.
export const releases: RouteModule = {
    key: 'releases',
    path: '/releases/:user/:repo',
    supported: true,
    async fetchItems({ user, repo }) {
        const xml = await ghAtom(`/${user}/${repo}/releases.atom`);
        return {
            title: `${user}/${repo} Releases`,
            link: `https://github.com/${user}/${repo}/releases`,
            items: parseAtomEntries(xml),
        };
    },
};

export const repoCommits: RouteModule = {
    key: 'repo_commits',
    path: '/repo_commits/:user/:repo/:branch?',
    supported: true,
    async fetchItems({ user, repo, branch }) {
        const xml = await ghAtom(`/${user}/${repo}/commits${branch ? '/' + branch : ''}.atom`);
        return {
            title: `${user}/${repo} Commits${branch ? ' (' + branch + ')' : ''}`,
            link: `https://github.com/${user}/${repo}/commits${branch ? '/' + branch : ''}`,
            items: parseAtomEntries(xml),
        };
    },
};

export const wikiHistory: RouteModule = {
    key: 'wiki',
    path: '/wiki/:user/:repo/:page?',
    supported: true,
    note: 'Uses github.com/:user/:repo/wiki.atom (whole-wiki history); per-page filtering not applied.',
    async fetchItems({ user, repo }) {
        const xml = await ghAtom(`/${user}/${repo}/wiki.atom`);
        return {
            title: `${user}/${repo} Wiki History`,
            link: `https://github.com/${user}/${repo}/wiki/_history`,
            items: parseAtomEntries(xml),
        };
    },
};
