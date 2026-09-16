import type { FeedItem } from './types.js';

// Minimal Atom <entry> extractor sufficient for github.com/*.atom feeds.
// Avoids pulling in a full XML parser dependency for a handful of well-formed fields.
export function parseAtomEntries(xml: string): FeedItem[] {
    const entries: FeedItem[] = [];
    const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
    let m: RegExpExecArray | null;
    while ((m = entryRe.exec(xml))) {
        const block = m[1];
        const id = tag(block, 'id') ?? '';
        const title = decode(tag(block, 'title') ?? '(no title)');
        const link = attr(block, 'link', 'href') ?? '';
        const updated = tag(block, 'updated') ?? tag(block, 'published') ?? new Date().toISOString();
        const author = decode(tag(tag(block, 'author') ?? '', 'name') ?? '');
        const content = decode(tag(block, 'content') ?? tag(block, 'summary') ?? '');
        entries.push({
            guid: id || link,
            title,
            link,
            author: author || undefined,
            description: content || undefined,
            pubDate: new Date(updated).toISOString(),
        });
    }
    return entries;
}

function tag(xml: string, name: string): string | undefined {
    const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`);
    const m = re.exec(xml);
    return m?.[1]?.trim();
}

function attr(xml: string, tagName: string, attrName: string): string | undefined {
    const re = new RegExp(`<${tagName}\\s+[^>]*${attrName}="([^"]*)"`);
    return re.exec(xml)?.[1];
}

function decode(s: string): string {
    return s
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}
