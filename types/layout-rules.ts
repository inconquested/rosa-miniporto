// types/layoutRules.ts
import type { Room } from './index';


export { Room };
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
    minAreaSqm?: number; // square meters (all layout dimensions are in meters)
    maxAreaSqm?: number;
}

export interface LayoutValidationResult {
    isValid: boolean;
    violations: LayoutConstraint[];
    warnings: LayoutConstraint[];
    suggestions: string[];
}