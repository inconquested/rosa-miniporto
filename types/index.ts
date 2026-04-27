export type RoomType = 'bedroom' | 'kitchen' | 'bathroom' | 'living_room' | 'office' | 'hallway' | 'garage' | 'carport' | 'laundry' | 'foyer';

export interface Room {
    type: RoomType;
    area: number;
    width: number;
    height: number;
    x: number;
    y: number;
}

export interface GeminiApiResponse {
    text: string;
    usageMetadata?: {
        promptTokenCount: number;
        candidatesTokenCount: number;
        totalTokenCount: number;
    };
    candidates?: Array<{
        content: {
            parts: Array<{ text: string }>;
            role: string;
        };
        finishReason?: string;
        index?: number;
    }>;
}

export interface FloorPlanData {
    rooms: Room[];
    totalArea: number;
    totalWidth: number;
    totalHeight: number;
    notes: string;
}

export interface BudgetData {
    breakdown: {
        room: string;
        area: number;
        materials: number;
        labor: number;
        furniture: number;
        subtotal: number;
    }[];
    total: number;
    contingency: number;
}
