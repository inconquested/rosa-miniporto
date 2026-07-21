import { z } from 'zod';

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

    // Total floor area in square meters (all dimensions are metric).
    const calculatedArea = Math.round(
        rooms.reduce((sum, r) => sum + r.width * r.height, 0)
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