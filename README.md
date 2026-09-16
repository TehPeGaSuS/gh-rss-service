# gh-rss-service

A self-hosted GitHub-only RSS service, mirroring RSSHub's `/github/*` route shapes but calling
the GitHub REST/GraphQL/Atom APIs directly, with SQLite-backed dedup so already-seen items are
never re-emitted (fixes the "years-old issues suddenly post" problem some RSSHub deploys hit).

## How it works

- Feeds are **auto-registered on first request**. Hit a route URL directly — same path shapes as
  RSSHub, e.g. `GET /github/issue/DIYgod/RSSHub/open` — and if it isn't already known, the server
  fetches it immediately (so you get a feed right away), derives a stable id from the route +
  params, and appends it to `config.json`. From then on the scheduler polls it automatically.
  No hand-editing `config.json` required, though you still can (e.g. to set a custom `id`/`limit`,
  or to pre-seed feeds before first request).
- A scheduler polls every registered feed every 5 minutes, aligned to the wall clock
  (`:00`, `:05`, `:10`, ...), fetches fresh items from GitHub, and **upserts** them into SQLite
  keyed by `(feed_id, guid)`. `pub_date`/`first_seen` are only ever set once per item and never
  updated, so an item's position in the feed is permanent — a GitHub API hiccup (reordering,
  transient omission) can never cause a re-post.
- The HTTP server renders RSS 2.0 XML for a feed **from the database**, not from a live API call
  (except on that first auto-registering request), so repeat requests are always fast and always
  monotonic regardless of GitHub API state.
- Point Limnoria's `rss` plugin (or any reader) at `http://host:PORT/github/<route-path>` directly,
  e.g. `http://host:PORT/github/pull/DIYgod/RSSHub/open`. A legacy `GET /feed/:id` also works for
  ids defined explicitly in `config.json`.

## Setup

```sh
npm install
cp config.example.json config.json   # edit with your repos/users, or leave empty and rely on auto-register
cp .env.example .env                 # set GITHUB_ACCESS_TOKEN=ghp_xxx
npm run build
npm start
```

For local development without building: `npm run dev` (uses `tsx`).

Env vars:

- `GITHUB_ACCESS_TOKEN` — personal access token. Optional for public read-only routes (issue, pull,
  repos, branches, comments, contributors, activity, releases, repo_commits, wiki), required for
  `notifications`, `feed` (private feed), `discussion`, `user/followers`, `stars`.
- `PORT` — HTTP port (default `8080`).
- `CONFIG_PATH` — path to the feed config JSON (default `./config.json`).
- `DB_PATH` — path to the SQLite file (default `./data.sqlite3`).

## Routes ported

Full parity with RSSHub's `lib/routes/github/*` route *shapes*, implemented against the REST/
GraphQL/Atom APIs instead of scraping:

| route key | path | notes |
|---|---|---|
| `issue` | `/issue/:user/:repo/:state?/:labels?` | |
| `pull` | `/pull/:user/:repo/:state?/:labels?` | |
| `repo_event` | `/repo_event/:owner/:repo/:types?` | GitHub Events API |
| `org_event` | `/org_event/:org/:types?` | |
| `user_event` | `/user_event/:username/:types?` | |
| `feed` | `/feed/:user/:types?` | needs token authorized for that user |
| `branches` | `/branches/:user/:repo` | |
| `comments` | `/comments/:user/:repo/:number?` | |
| `contributors` | `/contributors/:user/:repo/:order?/:anon?` | |
| `discussion` | `/discussion/:user/:repo/:state?/:category?` | GraphQL, needs token |
| `file` | `/file/:user/:repo/:branch/:filepath` | commit history for one path |
| `user_followers` | `/user/followers/:user` | GraphQL |
| `stars` | `/stars/:user/:repo` | GraphQL |
| `starred_repos` | `/starred_repos/:user` | |
| `repos` | `/repos/:user/:type?/:sort?` | |
| `gist` | `/gist/:gistId` | |
| `notifications` | `/notifications` | needs token |
| `activity` | `/activity/:user` | GitHub's public `.atom` feed |
| `releases` | `/releases/:user/:repo` | GitHub's public `releases.atom` |
| `repo_commits` | `/repo_commits/:user/:repo/:branch?` | GitHub's public `commits.atom` |
| `wiki` | `/wiki/:user/:repo/:page?` | GitHub's public `wiki.atom` (whole-wiki, not per-page) |

### Not ported (stubbed)

These RSSHub routes scrape HTML pages with no REST/GraphQL/Atom equivalent, and are out of scope
for an API-only service. Calling them returns a single explanatory placeholder item:

- `advisor` — `/advisor/data/:type?/:category?` (scrapes github.com/advisories)
- `search` — `/search/:query/:sort?/:order?` (scrapes code search results)
- `topic` — `/topics/:name/:qs?` (scrapes Topics pages)
- `pulse` — `/pulse/:user/:repo/:period?` (scrapes the Pulse page)
- `trending` — `/trending/:since/:language/:spoken_language?` (scrapes the Trending page)

If you need these, either keep pointing Limnoria at RSSHub for just those specific feeds, or
add a headless-browser/cheerio scraper module later — the route interface (`RouteModule` in
`src/types.ts`) is designed so a scraping-based route slots in the same way as the API-based ones.

## Docker

```sh
docker build -t gh-rss-service .
docker run -d --name gh-rss-service \
  -p 8080:8080 \
  -e GITHUB_ACCESS_TOKEN=ghp_xxx \
  -v gh-rss-data:/data \
  gh-rss-service
```

Or with compose. `docker-compose.yml` points at the published `ghcr.io/tehpegasus/gh-rss-service:latest`,
and also keeps `build: .` so you can build from local source instead:

```sh
# use the published GHCR image
GITHUB_ACCESS_TOKEN=ghp_xxx docker compose pull && docker compose up -d

# or build from local source
GITHUB_ACCESS_TOKEN=ghp_xxx docker compose up -d --build
```

`config.json` and the SQLite DB live under `/data` in the container (`CONFIG_PATH`/`DB_PATH` are
preset to `/data/config.json` / `/data/gh-rss.db`), so mount `/data` as a volume to persist
registered feeds and dedup state across restarts.

A GitHub Actions workflow (`.github/workflows/docker-publish.yml`) builds and pushes
`ghcr.io/<owner>/gh-rss-service:latest` (and a `:sha-<short>` tag) on every push to `main`.

## Discover feeds

`GET /routes` lists every route key, its path pattern, and whether it's supported.
`GET /healthz` for a liveness check.
