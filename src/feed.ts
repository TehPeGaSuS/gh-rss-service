import type { FeedItem } from './types.js';

// Strip characters XML 1.0 forbids outright (most C0 controls, and a few
// non-characters), so item bodies containing e.g. raw IRC formatting codes
// or copy-pasted terminal output don't produce unparseable feeds.
// eslint-disable-next-line no-control-regex
const INVALID_XML_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g;

function esc(s: string): string {
    return s
        .replace(INVALID_XML_CHARS, '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function toRss(title: string, link: string, items: FeedItem[]): string {
    const itemsXml = items
        .map(
            (item) => `
    <item>
      <title>${esc(item.title)}</title>
      <link>${esc(item.link)}</link>
      <guid isPermaLink="false">${esc(item.guid)}</guid>
      ${item.author ? `<author>${esc(item.author)}</author>` : ''}
      <pubDate>${new Date(item.pubDate).toUTCString()}</pubDate>
      ${item.description ? `<description>${esc(item.description)}</description>` : ''}
    </item>`
        )
        .join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${esc(title)}</title>
    <link>${esc(link)}</link>
    <description>${esc(title)}</description>
    ${itemsXml}
  </channel>
</rss>`;
}
