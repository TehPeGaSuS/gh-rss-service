import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import type { FeedConfigEntry } from './types.js';

const configPath = process.env.CONFIG_PATH ?? './config.json';

export function loadConfig(): FeedConfigEntry[] {
    if (!existsSync(configPath)) return [];
    const raw = readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('config.json must be a JSON array of feed entries');
    return parsed as FeedConfigEntry[];
}

function saveConfig(entries: FeedConfigEntry[]): void {
    writeFileSync(configPath, JSON.stringify(entries, null, 2) + '\n', 'utf-8');
}

// Registers a feed the first time its route is hit, so the scheduler picks it
// up for subsequent polls without requiring a hand-edited config.json entry.
// No-ops if an entry with the same id already exists.
export function ensureRegistered(entry: FeedConfigEntry): void {
    const entries = loadConfig();
    if (entries.some((e) => e.id === entry.id)) return;
    entries.push(entry);
    saveConfig(entries);
}
