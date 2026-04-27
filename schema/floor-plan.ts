import { z } from 'zod';
import { Schema as GenAISchema, Type } from "@google/genai";

export const RoomTypeEnum = z.enum([
    'bedroom',
    'kitchen',
    'bathroom',
    'living_room',
    'office',
    'hallway',
    'garage',
    'carport',
    'laundry',
    'foyer',
]);

export const RoomSchema = z.object({
    type: RoomTypeEnum.catch('hallway'),
    area: z.coerce.number().transform(v => Math.round(v)),
    width: z.coerce.number().default(3).transform(v => Math.max(v, 1.5)),
    height: z.coerce.number().default(3).transform(v => Math.max(v, 1.5)),
    x: z.coerce.number().default(0).transform(v => Math.max(v, 0)),
    y: z.coerce.number().default(0).transform(v => Math.max(v, 0)),
});

export const FloorPlanZodSchema = z.object({
    rooms: z.array(RoomSchema),
    totalArea: z.coerce.number().optional(),
    totalWidth: z.coerce.number().optional(),
    totalHeight: z.coerce.number().optional(),
    notes: z.string().default("AI-generated floor plan"),
}).transform((data) => {
    const rooms = data.rooms;
    const maxX = Math.max(...rooms.map(r => r.x + r.width), 0);
    const maxY = Math.max(...rooms.map(r => r.y + r.height), 0);
    
    // Calculate total area if not provided (converting sqm to sqft if needed, or just keeping consistent)
    // The previous logic used 10.764 which suggests sqm -> sqft conversion
    const calculatedArea = Math.round(
        rooms.reduce((sum, r) => sum + r.width * r.height * 10.764, 0)
    );

    return {
        rooms,
        totalArea: data.totalArea || calculatedArea,
        totalWidth: data.totalWidth || maxX,
        totalHeight: data.totalHeight || maxY,
        notes: data.notes,
    };
});

export type Room = z.infer<typeof RoomSchema>;
export type FloorPlanData = z.output<typeof FloorPlanZodSchema>;

// Keep the GenAI schema for LLM structured output configuration
export const floorPlanGenAISchema: GenAISchema = {
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
                    type: { 
                        type: Type.STRING,
                        enum: ['bedroom', 'kitchen', 'bathroom', 'living_room', 'office', 'hallway', 'garage', 'carport', 'laundry', 'foyer']
                    },
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