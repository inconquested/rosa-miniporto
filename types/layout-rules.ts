// types/layoutRules.ts

export interface LayoutConstraint {
    rule: string;
    severity: 'error' | 'warning' | 'info';
    description: string;
}

export interface RoomPlacementRule {
    roomType: string;
    minDistanceFromEntrance?: number; // meters
    maxDistanceFromEntrance?: number;
    mustConnectTo?: string[]; // room types that should be adjacent
    shouldNotBeTouchedBy?: string[]; // room types to avoid proximity
    minDistanceBetween?: number; // distance from other instances of same type
    requiresHallwayConnection?: boolean;
    minAreaSqft?: number;
    maxAreaSqft?: number;
}

export interface LayoutValidationResult {
    isValid: boolean;
    violations: LayoutConstraint[];
    warnings: LayoutConstraint[];
    suggestions: string[];
}

export interface Room {
    type: 'bedroom' | 'kitchen' | 'bathroom' | 'living_room' | 'office' | 'hallway' | 'garage' | 'carport' | 'laundry' | 'foyer';
    area: number;
    width: number;
    height: number;
    x: number;
    y: number;
}