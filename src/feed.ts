import type { FeedItem } from './types.js';

function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
