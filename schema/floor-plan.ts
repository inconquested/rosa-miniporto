import { Schema as GenAISchema, Type } from "@google/genai";

interface FloorPlanData {
    rooms: {
        type: string;
        area: number;
        width: number;
        height: number;
        x: number;
        y: number;
    }[];
    totalArea: number;
    notes: string;
}

export const floorPlanSchema: GenAISchema = {
    type: Type.OBJECT,
    properties: {
        totalArea: { type: Type.NUMBER },
        totalWidth: { type: Type.NUMBER },
        totalHeight: { type: Type.NUMBER },
        notes: { type: Type.STRING },
        rooms: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    type: { type: Type.STRING },
                    area: { type: Type.NUMBER },
                    width: { type: Type.NUMBER },
                    height: { type: Type.NUMBER },
                    x: { type: Type.NUMBER },
                    y: { type: Type.NUMBER },
                },
                required: ['type', 'area', 'width', 'height', 'x', 'y'],
            },
        },
    },
    required: ['rooms', 'totalArea', 'totalWidth', 'totalHeight', 'notes'],
};