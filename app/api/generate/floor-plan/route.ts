import { NextRequest, NextResponse } from "next/server";
import { generateFloorPlanWithFallback, getRateLimitStatus } from "@/lib/generation-orch";
import { getCachedResult, setCachedResult, getCacheStats } from "@/lib/response-cache";

export async function POST(req: NextRequest) {
  try {
    const { description } = await req.json();

    if (!description?.trim()) {
      return NextResponse.json({ error: "Description required" }, { status: 400 });
    }

    // 1) Serve identical prompts straight from the in-memory LRU cache — this
    //    skips the model call entirely and reduces load on the Foundry quota.
    const cached = getCachedResult(description);
    if (cached && cached.data) {
      return NextResponse.json({
        ...cached.data,
        metadata: {
          success: cached.success,
          usedProvider: cached.usedProvider,
          corrected: cached.corrected,
          cached: true,
          attempts: cached.attempts.map(a => ({
            provider: a.provider,
            success: a.success,
            error: a.error
          })),
          rateLimit: getRateLimitStatus()
        }
      }, { status: 200 });
    }

    // 2) Cache miss — run generation, validation, and correction.
    const result = await generateFloorPlanWithFallback(description);

    // Store only fully-valid layouts (the helper enforces this policy).
    setCachedResult(description, result);

    const rateLimit = getRateLimitStatus();

    // If no provider succeeded in generating any data
    if (!result.success && !result.data) {
      return NextResponse.json({
        error: "Generation failed",
        details: result.attempts.map(a => `${a.provider}: ${a.error}`).join('; '),
        metadata: {
          success: false,
          attempts: result.attempts,
          rateLimit
        }
      }, { status: 503 });
    }

    const response = NextResponse.json({
      ...result.data,
      metadata: {
        success: result.success,
        usedProvider: result.usedProvider,
        corrected: result.corrected,
        cached: false,
        attempts: result.attempts.map(a => ({
          provider: a.provider,
          success: a.success,
          error: a.error
        })),
        rateLimit
      }
    }, {
      status: result.success ? 200 : 207 // 207 Multi-Status if it's a partial success (uncorrected fallback)
    });

    return response;

  } catch (error) {
    console.error("Error in floor-plan generation route:", error);

    return NextResponse.json({
      error: "Failed to generate floor plan",
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "active",
    rateLimits: getRateLimitStatus(),
    cache: getCacheStats()
  });
}