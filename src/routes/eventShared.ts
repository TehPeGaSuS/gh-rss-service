import type { FeedItem } from '../types.js';

// Ports the link-derivation logic from RSSHub's github/eventapi.ts to the GitHub REST
// Events API shape ({type, actor, repo, payload, created_at, id}).
export function eventToItem(e: any): FeedItem {
    const repoName = e.repo?.name ?? '';
    const actor = e.actor?.login ?? 'unknown';
    let link = `https://github.com/${repoName}`;
    let title = `${actor} ${e.type}`;

    const p = e.payload ?? {};
    switch (e.type) {
        case 'PushEvent': {
            const lastCommit = p.commits?.at(-1);
            if (lastCommit) link = `https://github.com/${repoName}/commit/${lastCommit.sha}`;
            title = `${actor} pushed to ${repoName}`;
            break;
        }
        case 'PullRequestEvent':
            link = p.pull_request?.html_url ?? link;
            title = `${actor} ${p.action} pull request #${p.number} on ${repoName}`;
            break;
        case 'IssuesEvent':
            link = p.issue?.html_url ?? link;
            title = `${actor} ${p.action} issue #${p.issue?.number} on ${repoName}`;
            break;
        case 'IssueCommentEvent':
            link = p.comment?.html_url ?? link;
            title = `${actor} commented on #${p.issue?.number} (${repoName})`;
            break;
        case 'PullRequestReviewEvent':
            link = p.review?.html_url ?? link;
            title = `${actor} reviewed pull request #${p.pull_request?.number} on ${repoName}`;
            break;
        case 'ReleaseEvent':
            link = p.release?.html_url ?? link;
            title = `${actor} released ${p.release?.tag_name} on ${repoName}`;
            break;
        case 'CreateEvent':
            title = `${actor} created ${p.ref_type} ${p.ref ?? ''} on ${repoName}`;
            break;
        case 'DeleteEvent':
            title = `${actor} deleted ${p.ref_type} ${p.ref ?? ''} on ${repoName}`;
            break;
        case 'WatchEvent':
            title = `${actor} starred ${repoName}`;
            break;
        case 'ForkEvent':
            link = p.forkee?.html_url ?? link;
            title = `${actor} forked ${repoName}`;
            break;
        default:
            break;
    }

    return {
        guid: `event-${e.id}`,
        title,
        link,
        author: actor,
        pubDate: new Date(e.created_at).toISOString(),
    };
}
