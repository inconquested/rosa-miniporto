import { GoogleGenAI } from "@google/genai";
import { FloorPlanData, GeminiApiResponse } from "@/types";
import { NextRequest, NextResponse } from "next/server";
import { BuildPrompt, BuildSysInstruction } from "@/lib/prompt";
import { llmConfig } from "@/config/llm.config";

const genAI = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { description } = await req.json();
    if (!description?.trim()) return NextResponse.json({ error: "Description required" }, { status: 400 });

    const prompt = BuildPrompt(description);

    const result = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        ...llmConfig,
      },
    });
    const responseText = (result as GeminiApiResponse).text;
    if (!responseText) throw new Error("No response from Gemini");

    let floorPlan: FloorPlanData;

    try {
      // Try direct JSON parse first
      floorPlan = JSON.parse(responseText);
    } catch (parseError) {
      // Fallback: extract JSON from response if wrapped
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        floorPlan = JSON.parse(jsonMatch[0]);
      } else {
        console.error("Failed to parse response:", responseText);
        throw new Error("Invalid JSON response from Gemini");
      }
    }

    // Validate structure
    if (!floorPlan.rooms || !Array.isArray(floorPlan.rooms)) {
      throw new Error("Invalid floor plan structure: missing rooms array");
    }

    if (floorPlan.rooms.length === 0) {
      throw new Error("Floor plan must contain at least one room");
    }

    // Validate and clean rooms
    const validRooms = floorPlan.rooms.map((room: any) => ({
      type: room.type || "other",
      area: Math.round(room.area),
      width: Math.max(room.width || 3, 1.5), // Minimum 1.5m
      height: Math.max(room.height || 3, 1.5), // Minimum 1.5m
      x: Math.max(room.x || 0, 0),
      y: Math.max(room.y || 0, 0),
    }));

    // Calculate total dimensions
    const maxX = Math.max(...validRooms.map(r => r.x + r.width));
    const maxY = Math.max(...validRooms.map(r => r.y + r.height));

    const enrichedFloorPlan: FloorPlanData = {
      rooms: validRooms,
      totalArea: floorPlan.totalArea || Math.round(
        validRooms.reduce((sum, r) => sum + r.width * r.height * 10.764, 0)
      ),
      totalWidth: maxX,
      totalHeight: maxY,
      notes: floorPlan.notes || "AI-generated floor plan",
    };

    return NextResponse.json(enrichedFloorPlan, { status: 200 });
  } catch (error: any) {
    console.error("Error generating floor plan:", error);
    return NextResponse.json({
      error: "Failed to generate floor plan",
      details: error.message,
    });
  }
}