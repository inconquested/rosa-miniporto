// lib/layoutGenerationChain.ts
//
// Simplified orchestration chain using Mistral AI.
// Logic: Mistral Large (Primary) -> Mistral Small (Correction Pass) -> Final Result.

import { z } from 'zod';
import { Mistral } from '@mistralai/mistralai';

import { validateLayout } from './validator-engine';
import { BuildPrompt, BuildSysInstruction } from './prompt';
import { FloorPlanZodSchema, RoomSchema } from '@/schema/floor-plan';
import {
    llmConfig,
    correctionConfig,
    MISTRAL_PRIMARY_MODEL,
    MISTRAL_CORRECTION_MODEL,
} from '../config/llm.config';

import type { Room, FloorPlanData } from '@/schema/floor-plan';

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export type MistralProvider = 'mistral-large-latest' | 'mistral-small-latest' | 'correction';

export interface GenerationAttempt {
    provider: MistralProvider;
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
// Mistral client
// ---------------------------------------------------------------------------

let _client: Mistral | null = null;

function getMistralClient(): Mistral {
    if (!process.env.MISTRAL_API_KEY) {
        throw new Error('MISTRAL_API_KEY environment variable is not set');
    }
    if (!_client) {
        _client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY! });
    }
    return _client;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractText(response: Awaited<ReturnType<Mistral['chat']['complete']>>): string {
    const choice = response.choices?.[0];
    if (!choice) throw new Error('Mistral returned no choices');
    const content = choice?.message?.content;
    if (typeof content === 'string') return content;
    throw new Error('Unexpected content shape from Mistral');
}

function processFloorPlanData(raw: unknown): FloorPlanData {
    let candidate = raw;

    // Handle potential wrapper keys like "data" or "floorPlan"
    if (raw && typeof raw === 'object' && !Array.isArray(raw) && !('rooms' in raw)) {
        for (const key of Object.keys(raw)) {
            const val = (raw as any)[key];
            if (val && typeof val === 'object' && 'rooms' in val) {
                candidate = val;
                break;
            }
        }
    }

    const result = FloorPlanZodSchema.safeParse(candidate);
    if (!result.success) {
        throw new Error(`Invalid structure: ${result.error.errors.map(e => e.message).join(', ')}`);
    }
    return result.data;
}

function getErrorMessage(err: unknown): string {
    if (err instanceof Error) {
        const apiError = err as any;
        if (apiError.response) {
            const body = apiError.response.data || apiError.response;
            return `API Error ${apiError.status || ''}: ${JSON.stringify(body)}`;
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
    const client = getMistralClient();

    // 1. Primary Generation (Mistral Large)
    try {
        const response = await client.chat.complete({
            model: MISTRAL_PRIMARY_MODEL,
            messages: [
                { role: 'system', content: llmConfig.systemInstruction },
                { role: 'user', content: BuildPrompt(description) },
            ],
            responseFormat: llmConfig.responseFormat,
            temperature: llmConfig.temperature,
            maxTokens: llmConfig.maxTokens,
        });

        const data = processFloorPlanData(JSON.parse(extractText(response)));
        const validation = validateLayout(data.rooms);

        if (validation.isValid) {
            attempts.push({ provider: 'mistral-large-latest', attempt: 1, success: true, data });
            return { success: true, data, attempts, usedProvider: 'mistral-large-latest', corrected: false };
        }

        // 2. Correction Pass (Mistral Small)
        const errorDescs = validation.violations.map(v => v.description);
        attempts.push({
            provider: 'mistral-large-latest',
            attempt: 1,
            success: false,
            error: `Validation failed: ${errorDescs.join('; ')}`,
            data,
        });

        try {
            const correctionPrompt = `Correct this floor plan JSON. Issues: ${errorDescs.join(', ')}. Current JSON: ${JSON.stringify(data.rooms, null, 2)}. Rules: Ensure no overlaps, all rooms connect to Hallway, and respect size bounds. Return ONLY the rooms array.`;

            const corrResponse = await client.chat.complete({
                model: MISTRAL_CORRECTION_MODEL,
                messages: [
                    { role: 'system', content: 'You fix floor plan JSON. Return only a JSON array of room objects.' },
                    { role: 'user', content: correctionPrompt },
                ],
                responseFormat: correctionConfig.responseFormat,
                temperature: correctionConfig.temperature,
            });

            const rawCorr = JSON.parse(extractText(corrResponse));
            const correctedRooms = Array.isArray(rawCorr) ? rawCorr : (rawCorr as any).rooms ?? rawCorr;
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
                usedProvider: 'mistral-large + correction',
                corrected: true,
            };

        } catch (corrErr) {
            attempts.push({ provider: 'correction', attempt: 1, success: false, error: getErrorMessage(corrErr) });
        }

    } catch (genErr) {
        attempts.push({ provider: 'mistral-large-latest', attempt: 1, success: false, error: getErrorMessage(genErr) });
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
    return { large: 999, small: 999 };
}

export function resetMistralClient() {
    _client = null;
}