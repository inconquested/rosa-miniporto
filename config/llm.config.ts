import { BuildSysInstruction } from '@/lib/prompt';

/** Model identifiers -------------------------------------------------------
 *  Main model:  Claude Opus 4.8, served through Microsoft (Azure AI) Foundry.
 *  The deployment name is configured in the Foundry resource; override via the
 *  ANTHROPIC_FOUNDRY_DEPLOYMENT env var.
 */
export const FOUNDRY_MODEL =
    process.env.ANTHROPIC_FOUNDRY_DEPLOYMENT?.trim() || 'claude-opus-4-8';

/** Shared generation parameters -------------------------------------------
 *  NOTE: Opus 4.8 rejects `temperature` / `top_p` / `top_k` and `budget_tokens`
 *  with a 400 — steer behaviour through the system prompt instead.
 */
export const llmConfig = {
    /** System instruction passed as the top-level `system` param */
    systemInstruction: BuildSysInstruction(),

    /** Max output tokens for the primary generation pass */
    maxTokens: 4096,
} as const;

/** Correction-pass parameters --------------------------------------------- */
export const correctionConfig = {
    maxTokens: 2048,
} as const;
