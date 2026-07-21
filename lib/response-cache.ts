// lib/response-cache.ts
//
// In-memory LRU cache for floor-plan generations, keyed by the (normalized)
// user description. Purpose: avoid re-calling Claude Opus 4.8 for identical
// prompts (sample prompts, demos, accidental re-submits), which reduces the
// number of Foundry requests and helps stay under the deployment's rate limit.
//
// NOTE (Vercel/serverless): this cache lives inside a single warm instance and
// is NOT shared across instances or preserved across cold starts. It protects
// against bursts/duplicates within an instance. For durable, shared caching
// across instances, swap this module for a Redis-backed one (e.g. Upstash).

import { LRUCache } from 'lru-cache';
import type { LayoutGenerationResult } from './generation-orch';

// Tunable via env; sensible defaults otherwise.
const TTL_MS = Number(process.env.FLOORPLAN_CACHE_TTL_MS) || 60 * 60 * 1000; // 1 hour
const MAX_ENTRIES = Number(process.env.FLOORPLAN_CACHE_MAX) || 200;

const cache = new LRUCache<string, LayoutGenerationResult>({
    max: MAX_ENTRIES,
    ttl: TTL_MS,
});

/** Normalize a description so trivially-different prompts share a cache entry. */
export function cacheKey(description: string): string {
    return description.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function getCachedResult(description: string): LayoutGenerationResult | undefined {
    return cache.get(cacheKey(description));
}

export function setCachedResult(description: string, result: LayoutGenerationResult): void {
    // Only cache fully-valid layouts — never replay a broken/partial one, and
    // leave failed prompts free to be retried (they may succeed next time).
    if (result.success && result.data) {
        cache.set(cacheKey(description), result);
    }
}

export function getCacheStats() {
    return { size: cache.size, max: MAX_ENTRIES, ttlMs: TTL_MS };
}
