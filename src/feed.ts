import { Feed } from 'feed';
import type { FeedItem } from './types.js';

// The `feed` library handles XML entity-escaping and CDATA wrapping, but it does
// NOT strip characters XML forbids outright (most C0 control bytes and a
// couple of non-characters) -- content copied from IRC formatting codes or
// raw terminal output can contain these and break every downstream parser.
// Strip them ourselves before handing strings to the library.
// eslint-disable-next-line no-control-regex
const INVALID_XML_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g;

function clean(s: string): string;
function clean(s: string | undefined): string | undefined;
function clean(s: string | undefined): string | undefined {
    return s?.replace(INVALID_XML_CHARS, '');
}

export function toRss(title: string, link: string, items: FeedItem[]): string {
    const feed = new Feed({
        title: clean(title),
        id: link,
        link,
        description: clean(title),
        copyright: '',
        generator: false,
    });

    for (const item of items) {
        feed.addItem({
            title: clean(item.title),
            id: item.guid,
            guid: item.guid,
            link: item.link,
            date: new Date(item.pubDate),
            description: clean(item.description),
            author: item.author ? [{ name: clean(item.author) }] : undefined,
        });
    }

    return feed.rss2();
}
