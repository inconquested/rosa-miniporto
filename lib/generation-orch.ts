// lib/generation-orch.ts
//
// Orchestration chain using Claude Opus 4.8 via Microsoft (Azure AI) Foundry.
// Logic: Opus 4.8 (primary generation) -> Opus 4.8 (correction pass) -> Final Result.

import { z } from 'zod';
import { jsonrepair } from 'jsonrepair';
import AnthropicFoundry from '@anthropic-ai/foundry-sdk';

import { validateLayout } from './validator-engine';
import { BuildPrompt } from './prompt';
import { FloorPlanZodSchema, RoomSchema } from '@/schema/floor-plan';
import { llmConfig, correctionConfig, FOUNDRY_MODEL } from '../config/llm.config';

import type { FloorPlanData } from '@/schema/floor-plan';

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export type ClaudeProvider = 'claude-opus-4-8' | 'correction';

export interface GenerationAttempt {
    provider: ClaudeProvider;
    attempt: number;
    success: boolean;
    error?: string;
    data?: FloorPlanData;
}

export interface LayoutGenerationResult {
    success: boolean;
    data?: FloorPlanData;
    attempts: GenerationAttempt[];
    usedProvider: string;
    corrected: boolean;
}

// ---------------------------------------------------------------------------
// Foundry client
// ---------------------------------------------------------------------------

let _client: AnthropicFoundry | null = null;

function getFoundryClient(): AnthropicFoundry {
    let apiKey = process.env.ANTHROPIC_FOUNDRY_API_KEY;

    if (!apiKey) {
        throw new Error('ANTHROPIC_FOUNDRY_API_KEY environment variable is not set');
    }

    // Defensive: strip an accidentally-pasted `KEY=` prefix (mirrors prod env quirks)
    if (apiKey.startsWith('ANTHROPIC_FOUNDRY_API_KEY=')) {
        apiKey = apiKey.replace('ANTHROPIC_FOUNDRY_API_KEY=', '').trim();
    }
    apiKey = apiKey.trim();

    if (!_client) {
        // `resource` / `baseURL` are read from ANTHROPIC_FOUNDRY_RESOURCE
        // (or ANTHROPIC_FOUNDRY_BASE_URL) automatically.
        _client = new AnthropicFoundry({ apiKey });
    }
    return _client;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type AnthropicMessage = Awaited<ReturnType<AnthropicFoundry['messages']['create']>>;

/** Concatenate all text blocks from a Claude message. */
function extractText(response: AnthropicMessage): string {
    const blocks = (response as { content?: Array<{ type: string; text?: string }> }).content ?? [];
    const text = blocks
        .filter(b => b.type === 'text' && typeof b.text === 'string')
        .map(b => b.text as string)
        .join('\n')
        .trim();

    if (!text) throw new Error('Foundry returned no text content');
    return text;
}

/** Robustly pull a JSON value out of the model's text output. */
function extractJson(text: string): unknown {
    let t = text.trim();

    // Strip a markdown code fence if the model wrapped the JSON in one
    const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) t = fence[1].trim();

    // Narrow to the outermost object/array in case of stray preamble
    const firstObj = t.indexOf('{');
    const lastObj = t.lastIndexOf('}');
    const firstArr = t.indexOf('[');
    const lastArr = t.lastIndexOf(']');

    if (firstObj !== -1 && lastObj > firstObj) {
        t = t.slice(firstObj, lastObj + 1);
    } else if (firstArr !== -1 && lastArr > firstArr) {
        t = t.slice(firstArr, lastArr + 1);
    }

    // jsonrepair fixes trailing commas / unquoted keys / minor breakage
    return JSON.parse(jsonrepair(t));
}

function processFloorPlanData(raw: unknown): FloorPlanData {
    let candidate = raw;

    // Handle potential wrapper keys like "data" or "floorPlan"
    if (raw && typeof raw === 'object' && !Array.isArray(raw) && !('rooms' in raw)) {
        for (const key of Object.keys(raw)) {
            const val = (raw as Record<string, unknown>)[key];
            if (val && typeof val === 'object' && 'rooms' in val) {
                candidate = val;
                break;
            }
        }
    }

    const result = FloorPlanZodSchema.safeParse(candidate);
    if (!result.success) {
        throw new Error(`Invalid structure: ${result.error.issues.map((e) => e.message).join(', ')}`);
    }
    return result.data;
}

function getErrorMessage(err: unknown): string {
    if (err instanceof Error) {
        const status = (err as { status?: number }).status;
        if (status) {
            return `API Error ${status}: ${err.message}`;
        }
        return err.message;
    }
    return String(err);
}

// ---------------------------------------------------------------------------
// Main orchestration
// ---------------------------------------------------------------------------

export async function generateFloorPlanWithFallback(
    description: string,
): Promise<LayoutGenerationResult> {
    const attempts: GenerationAttempt[] = [];
    const client = getFoundryClient();

    // 1. Primary Generation (Claude Opus 4.8)
    try {
        const response = await client.messages.create({
            model: FOUNDRY_MODEL,
            max_tokens: llmConfig.maxTokens,
            system: llmConfig.systemInstruction,
            messages: [{ role: 'user', content: BuildPrompt(description) }],
        });

        const data = processFloorPlanData(extractJson(extractText(response)));
        const validation = validateLayout(data.rooms);

        if (validation.isValid) {
            attempts.push({ provider: 'claude-opus-4-8', attempt: 1, success: true, data });
            return { success: true, data, attempts, usedProvider: 'claude-opus-4-8', corrected: false };
        }

        // 2. Correction Pass (Claude Opus 4.8)
        const errorDescs = validation.violations.map(v => v.description);
        attempts.push({
            provider: 'claude-opus-4-8',
            attempt: 1,
            success: false,
            error: `Validation failed: ${errorDescs.join('; ')}`,
            data,
        });

        try {
            const correctionPrompt = `Correct this floor plan JSON. Issues: ${errorDescs.join(', ')}. Current JSON: ${JSON.stringify(data.rooms, null, 2)}. Rules: Ensure no overlaps, all rooms connect to Hallway, and respect size bounds. Return ONLY the rooms array (a JSON array of room objects), no markdown, no explanation.`;

            const corrResponse = await client.messages.create({
                model: FOUNDRY_MODEL,
                max_tokens: correctionConfig.maxTokens,
                system: 'You fix floor plan JSON. Return only a JSON array of room objects.',
                messages: [{ role: 'user', content: correctionPrompt }],
            });

            const rawCorr = extractJson(extractText(corrResponse));
            const correctedRooms = Array.isArray(rawCorr) ? rawCorr : (rawCorr as { rooms?: unknown }).rooms ?? rawCorr;
            const validatedRooms = z.array(RoomSchema).parse(correctedRooms);

            const correctionData: FloorPlanData = { ...data, rooms: validatedRooms };
            const finalValidation = validateLayout(validatedRooms);

            attempts.push({
                provider: 'correction',
                attempt: 1,
                success: finalValidation.isValid,
                data: correctionData,
                error: finalValidation.isValid ? undefined : 'Correction still has issues',
            });

            return {
                success: finalValidation.isValid,
                data: correctionData,
                attempts,
                usedProvider: 'claude-opus-4-8 + correction',
                corrected: true,
            };

        } catch (corrErr) {
            attempts.push({ provider: 'correction', attempt: 1, success: false, error: getErrorMessage(corrErr) });
        }

    } catch (genErr) {
        attempts.push({ provider: 'claude-opus-4-8', attempt: 1, success: false, error: getErrorMessage(genErr) });
    }

    // Return the best attempt even if not fully valid
    const bestAttempt = attempts.find(a => a.data) || attempts[0];
    return {
        success: false,
        data: bestAttempt?.data,
        attempts,
        usedProvider: bestAttempt?.provider || 'none',
        corrected: false,
    };
}

export function getRateLimitStatus() {
    return { primary: 999, correction: 999 };
}

export function resetFoundryClient() {
    _client = null;
}
