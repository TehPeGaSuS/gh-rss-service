import type { RouteModule } from '../types.js';
import { issue } from './issue.js';
import { pull } from './pull.js';
import { repoEvent } from './repoEvent.js';
import { orgEvent } from './orgEvent.js';
import { userEvent } from './userEvent.js';
import { privateFeed } from './privateFeed.js';
import { branches } from './branches.js';
import { comments } from './comments.js';
import { contributors } from './contributors.js';
import { discussions } from './discussions.js';
import { file } from './file.js';
import { follower } from './follower.js';
import { star } from './star.js';
import { starredRepos } from './starredRepos.js';
import { repos } from './repos.js';
import { gist } from './gist.js';
import { notifications } from './notifications.js';
import { activity } from './activity.js';
import { releases, repoCommits, wikiHistory } from './releases.js';
import { advisor, search, topic, pulse, trending } from './stubs.js';

export const routes: Record<string, RouteModule> = Object.fromEntries(
    [
        issue,
        pull,
        repoEvent,
        orgEvent,
        userEvent,
        privateFeed,
        branches,
        comments,
        contributors,
        discussions,
        file,
        follower,
        star,
        starredRepos,
        repos,
        gist,
        notifications,
        activity,
        releases,
        repoCommits,
        wikiHistory,
        advisor,
        search,
        topic,
        pulse,
        trending,
    ].map((r) => [r.key, r])
);
