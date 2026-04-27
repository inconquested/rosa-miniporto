import { NextRequest, NextResponse } from "next/server";
import { generateFloorPlanWithFallback, getRateLimitStatus } from "@/lib/generation-orch";

export async function POST(req: NextRequest) {
  try {
    const { description } = await req.json();

    if (!description?.trim()) {
      return NextResponse.json({ error: "Description required" }, { status: 400 });
    }

    // Use the orchestration layer to handle generation, validation, and correction
    const result = await generateFloorPlanWithFallback(description);

    // Add rate limit status to headers for the client to track
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

  } catch (error: any) {
    console.error("Error in floor-plan generation route:", error);

    return NextResponse.json({
      error: "Failed to generate floor plan",
      details: error.message,
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "active",
    rateLimits: getRateLimitStatus()
  });
}