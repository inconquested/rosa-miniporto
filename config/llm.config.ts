import { floorPlanGenAISchema } from '@/schema/floor-plan';
import { BuildSysInstruction } from '@/lib/prompt';

/** Model identifiers -------------------------------------------------------
 *  Primary:   mistral-large-latest  – best reasoning, used for generation
 *  Fallback:  mistral-small-latest  – faster / cheaper, used for correction
 */
export const MISTRAL_PRIMARY_MODEL = 'mistral-large-2512';
export const MISTRAL_CORRECTION_MODEL = 'mistral-small-2603';

/** Shared generation parameters ------------------------------------------- */
export const llmConfig = {
    /** System instruction injected as the first "system" message */
    systemInstruction: BuildSysInstruction(),

    /** Structured-output: constrain the model to our JSON Schema */
    responseFormat: {
        type: 'json_object' as const,
    } satisfies { type: 'json_object' },

    temperature: 0.9,
    maxTokens: 4096,
    presencePenalty: 0.14,
    frequencyPenalty: 0.2,
    topP: 0.91,
    randomSeed: undefined as number | undefined, // set for reproducibility in tests
} as const;

/** Correction-pass parameters --------------------------------------------- */
export const correctionConfig = {
    temperature: 0.2,   // lower = more deterministic fixes
    maxTokens: 2048,
    topP: 0.9,
    responseFormat: { type: 'json_object' as const },
} as const;

// Re-export schema so callers can import from one place
export { floorPlanGenAISchema };