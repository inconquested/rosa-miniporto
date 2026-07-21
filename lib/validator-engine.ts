// utils/layoutRulesEngine.ts

import { Room, RoomPlacementRule, LayoutValidationResult, LayoutConstraint } from '@/types/layout-rules';

/**
 * Architectural Layout Rules Engine
 * Validates floor plans against professional design standards
 */

// Define architectural rules per room type
// NOTE: all areas are in square meters (m²) — every layout dimension is metric.
// Adjacency rules mirror the "grid-based spine" architecture in lib/prompt.ts:
//   hallway ── bedroom ── bathroom
//   hallway ── living_room ── kitchen
const ROOM_PLACEMENT_RULES: Record<string, RoomPlacementRule> = {
    bedroom: {
        roomType: 'bedroom',
        minDistanceFromEntrance: 1.0,
        mustConnectTo: ['hallway'],
        shouldNotBeTouchedBy: ['kitchen'], // a private bathroom may attach to a bedroom
        minDistanceBetween: 1.5, // Bedrooms should be separated
        requiresHallwayConnection: true,
        minAreaSqm: 7,
        maxAreaSqm: 23,
    },
    bathroom: {
        roomType: 'bathroom',
        minDistanceFromEntrance: 3.0, // Far from entrance (privacy)
        mustConnectTo: ['bedroom'], // attaches to a bedroom, not the hallway
        shouldNotBeTouchedBy: ['kitchen', 'living_room'],
        requiresHallwayConnection: false,
        minAreaSqm: 3,
        maxAreaSqm: 9,
    },
    kitchen: {
        roomType: 'kitchen',
        minDistanceFromEntrance: 2.0, // Close to entrance (utility access)
        maxDistanceFromEntrance: 20.0,
        mustConnectTo: ['living_room'], // reached through the living room, not the hallway
        shouldNotBeTouchedBy: ['bedroom', 'bathroom'],
        requiresHallwayConnection: false,
        minAreaSqm: 7,
        maxAreaSqm: 28,
    },
    living_room: {
        roomType: 'living_room',
        minDistanceFromEntrance: 0.5, // Near entrance (main space)
        maxDistanceFromEntrance: 5.0,
        mustConnectTo: ['hallway', 'kitchen'],
        shouldNotBeTouchedBy: [],
        requiresHallwayConnection: false, // Can be directly accessible
        minAreaSqm: 20,
        maxAreaSqm: 42,
    },
    office: {
        roomType: 'office',
        minDistanceFromEntrance: 2.0, // Private space
        mustConnectTo: ['hallway'],
        shouldNotBeTouchedBy: ['kitchen', 'living_room'],
        requiresHallwayConnection: true,
        minAreaSqm: 8,
        maxAreaSqm: 20,
    },
    hallway: {
        roomType: 'hallway',
        minDistanceFromEntrance: 0.0, // Can be at entrance
        mustConnectTo: [],
        shouldNotBeTouchedBy: [],
        requiresHallwayConnection: false, // IS the hallway
        minAreaSqm: 4,
        maxAreaSqm: 14,
    },
    garage: {
        roomType: 'garage',
        minDistanceFromEntrance: 0.5, // Near entrance for vehicle access
        maxDistanceFromEntrance: 2.0,
        mustConnectTo: ['hallway'],
        shouldNotBeTouchedBy: ['bedroom', 'bathroom', 'kitchen'],
        requiresHallwayConnection: true,
        minAreaSqm: 15,
        maxAreaSqm: 40,
    },
    laundry: {
        roomType: 'laundry',
        minDistanceFromEntrance: 2.0,
        mustConnectTo: ['hallway', 'kitchen'],
        shouldNotBeTouchedBy: ['bedroom'],
        requiresHallwayConnection: false, // Can connect to kitchen instead
        minAreaSqm: 3,
        maxAreaSqm: 8,
    },
    foyer: {
        roomType: 'foyer',
        minDistanceFromEntrance: 0.0,
        mustConnectTo: ['hallway', 'living_room'],
        shouldNotBeTouchedBy: [],
        requiresHallwayConnection: false,
        minAreaSqm: 3,
        maxAreaSqm: 12,
    },
    carport: {
        roomType: 'carport',
        minDistanceFromEntrance: 0.0,
        mustConnectTo: ['hallway', 'foyer'],
        shouldNotBeTouchedBy: ['bedroom'],
        requiresHallwayConnection: false,
        minAreaSqm: 12,
        maxAreaSqm: 30,
    },
};

// Entrance/Foyer coordinates (assumed at origin or first accessible point)
const ENTRANCE_POSITION = { x: 0, y: 0 };

/**
 * Calculate distance between two rooms (center-to-center)
 */
function getRoomCenter(room: Room): { x: number; y: number } {
    return {
        x: room.x + room.width / 2,
        y: room.y + room.height / 2,
    };
}

function getDistanceBetweenRooms(room1: Room, room2: Room): number {
    const c1 = getRoomCenter(room1);
    const c2 = getRoomCenter(room2);
    return Math.sqrt(Math.pow(c1.x - c2.x, 2) + Math.pow(c1.y - c2.y, 2)); // Pythagoras
}

function getDistanceFromEntrance(room: Room): number {
    const center = getRoomCenter(room);
    return Math.sqrt(
        Math.pow(center.x - ENTRANCE_POSITION.x, 2) +
        Math.pow(center.y - ENTRANCE_POSITION.y, 2)
    ); // Pythagoras
}

/**
 * Check if two rooms are adjacent (share wall or very close)
 */
function areRoomsAdjacent(room1: Room, room2: Room, tolerance: number = 0.3): boolean {
    // Check horizontal adjacency
    const horizontallyAdjacentX =
        (Math.abs(room1.x + room1.width - room2.x) < tolerance) ||
        (Math.abs(room2.x + room2.width - room1.x) < tolerance); // Simplfied AABB

    const horizontallyOverlapY =
        room1.y < room2.y + room2.height &&
        room1.y + room1.height > room2.y;

    // Check vertical adjacency
    const verticallyAdjacentY =
        (Math.abs(room1.y + room1.height - room2.y) < tolerance) ||
        (Math.abs(room2.y + room2.height - room1.y) < tolerance);

    const verticallyOverlapX =
        room1.x < room2.x + room2.width &&
        room1.x + room1.width > room2.x;

    return (
        (horizontallyAdjacentX && horizontallyOverlapY) ||
        (verticallyAdjacentY && verticallyOverlapX)
    );
}

/**
 * Check if two rooms overlap (invalid).
 * Rooms that merely SHARE AN EDGE (correct adjacency) are NOT overlapping — a
 * real overlap requires a positive intersection area on both axes. The epsilon
 * absorbs floating-point noise so grid-aligned neighbours don't false-positive.
 */
function doRoomsOverlap(room1: Room, room2: Room): boolean {
    const EPS = 0.01;
    const xOverlap =
        Math.min(room1.x + room1.width, room2.x + room2.width) - Math.max(room1.x, room2.x);
    const yOverlap =
        Math.min(room1.y + room1.height, room2.y + room2.height) - Math.max(room1.y, room2.y);
    return xOverlap > EPS && yOverlap > EPS;
}

/**
 * Validate individual room constraints
 */
function validateRoomConstraints(room: Room, rooms: Room[]): LayoutConstraint[] {
    const violations: LayoutConstraint[] = [];
    const rules = ROOM_PLACEMENT_RULES[room.type];

    if (!rules) {
        return violations; // No rules defined for this type
    }

    // Check area constraints (square meters)
    if (rules.minAreaSqm !== undefined && room.area < rules.minAreaSqm) {
        violations.push({
            rule: `${room.type}_area_min`,
            severity: 'warning',
            description: `${room.type} is too small (${Math.round(room.area)} m²). Minimum recommended: ${rules.minAreaSqm} m².`,
        });
    }

    if (rules.maxAreaSqm !== undefined && room.area > rules.maxAreaSqm) {
        violations.push({
            rule: `${room.type}_area_max`,
            severity: 'warning',
            description: `${room.type} is too large (${Math.round(room.area)} m²). Maximum recommended: ${rules.maxAreaSqm} m².`,
        });
    }

    // Check entrance distance
    const entranceDistance = getDistanceFromEntrance(room);

    if (rules.minDistanceFromEntrance && entranceDistance < rules.minDistanceFromEntrance) {
        violations.push({
            rule: `${room.type}_entrance_min_distance`,
            severity: 'warning',
            description: `${room.type} is too close to entrance (${entranceDistance.toFixed(1)}m). Recommended minimum: ${rules.minDistanceFromEntrance}m away.`,
        });
    }

    if (rules.maxDistanceFromEntrance && entranceDistance > rules.maxDistanceFromEntrance) {
        violations.push({
            rule: `${room.type}_entrance_max_distance`,
            severity: 'warning',
            description: `${room.type} is too far from entrance (${entranceDistance.toFixed(1)}m). Recommended maximum: ${rules.maxDistanceFromEntrance}m away.`,
        });
    }

    // Check hallway connection
    if (rules.requiresHallwayConnection) {
        const connectedToHallway = rooms.some(
            r => r.type === 'hallway' && areRoomsAdjacent(room, r)
        );

        if (!connectedToHallway) {
            violations.push({
                rule: `${room.type}_hallway_connection`,
                severity: 'error',
                description: `${room.type} must be directly connected to a hallway.`,
            });
        }
    }

    // Check must-connect-to constraints
    if (rules.mustConnectTo && rules.mustConnectTo.length > 0) {
        const connectedTypes = rules.mustConnectTo.filter(type =>
            rooms.some(r => r.type === type && areRoomsAdjacent(room, r))
        );

        if (connectedTypes.length === 0) {
            violations.push({
                rule: `${room.type}_must_connect`,
                severity: 'warning',
                description: `${room.type} should be adjacent to: ${rules.mustConnectTo.join(', ')}.`,
            });
        }
    }

    // Check should-not-be-touched-by constraints
    if (rules.shouldNotBeTouchedBy && rules.shouldNotBeTouchedBy.length > 0) {
        const badNeighbors = rules.shouldNotBeTouchedBy.filter(type =>
            rooms.some(r => r.type === type && areRoomsAdjacent(room, r))
        );

        if (badNeighbors.length > 0) {
            violations.push({
                rule: `${room.type}_bad_neighbors`,
                severity: 'warning',
                description: `${room.type} should not be adjacent to: ${badNeighbors.join(', ')}.`,
            });
        }
    }

    // Check distance between same room types
    if (rules.minDistanceBetween) {
        const sameTypeRooms = rooms.filter(r => r.type === room.type && r !== room);
        const tooClose = sameTypeRooms.some(
            r => getDistanceBetweenRooms(room, r) < rules.minDistanceBetween!
        );

        if (tooClose) {
            violations.push({
                rule: `${room.type}_separation`,
                severity: 'info',
                description: `Multiple ${room.type}s should be separated by at least ${rules.minDistanceBetween}m.`,
            });
        }
    }

    return violations;
}

/**
 * Validate overall layout constraints
 */
function validateLayoutConstraints(rooms: Room[]): LayoutConstraint[] {
    const violations: LayoutConstraint[] = [];

    // Check for room overlaps
    for (let i = 0; i < rooms.length; i++) {
        for (let j = i + 1; j < rooms.length; j++) {
            if (doRoomsOverlap(rooms[i], rooms[j])) {
                const r1 = rooms[i];
                const r2 = rooms[j];
                violations.push({
                    rule: 'room_overlap',
                    severity: 'error',
                    description: `OVERLAP DETECTED: ${r1.type} [x:${r1.x}, y:${r1.y}, w:${r1.width}, h:${r1.height}] overlaps with ${r2.type} [x:${r2.x}, y:${r2.y}, w:${r2.width}, h:${r2.height}]. Use AABB logic to shift coordinates.`,
                });
            }
        }
    }

    // Check entrance accessibility (hallway near entrance)
    const hallway = rooms.find(r => r.type === 'hallway');
    if (hallway) {
        const hallwayDistance = getDistanceFromEntrance(hallway);
        if (hallwayDistance > 2.0) {
            violations.push({
                rule: 'entrance_accessibility',
                severity: 'warning',
                description: `Hallway/main circulation should be near entrance. Current distance: ${hallwayDistance.toFixed(1)}m.`,
            });
        }
    } else {
        violations.push({
            rule: 'no_hallway',
            severity: 'warning',
            description: 'Layout lacks a hallway. Rooms require circulation space.',
        });
    }

    // Check if living room is accessible from entrance
    const livingRoom = rooms.find(r => r.type === 'living_room');
    if (livingRoom) {
        const livingDistance = getDistanceFromEntrance(livingRoom);
        if (livingDistance > 5.0) {
            violations.push({
                rule: 'living_room_distance',
                severity: 'info',
                description: `Living room is far from entrance (${livingDistance.toFixed(1)}m). Consider repositioning for better flow.`,
            });
        }
    }

    // Check for "floating" rooms (not connected to any other room)
    rooms.forEach(room => {
        const hasNeighbors = rooms.some(other => other !== room && areRoomsAdjacent(room, other));
        if (!hasNeighbors && rooms.length > 1) {
            violations.push({
                rule: 'floating_room',
                severity: 'error',
                description: `${room.type} is floating and not connected to the rest of the house.`,
            });
        }
    });

    return violations;
}

/**
 * Generate improvement suggestions
 */
function generateSuggestions(rooms: Room[], violations: LayoutConstraint[]): string[] {
    const suggestions: string[] = [];
    const errorCount = violations.filter(v => v.severity === 'error').length;

    if (errorCount === 0) {
        suggestions.push('✓ Layout meets all architectural standards.');
    }

    // Suggest hallway addition
    if (violations.some(v => v.rule === 'no_hallway')) {
        suggestions.push('Consider adding a hallway for better room circulation.');
    }

    // Suggest bathroom relocation
    const bathroomViolations = violations.filter(v => v.rule.startsWith('bathroom_'));
    if (bathroomViolations.length > 0) {
        suggestions.push('Reposition bathroom away from main entrance for privacy.');
    }

    // Suggest kitchen relocation
    const kitchenViolations = violations.filter(v => v.rule.startsWith('kitchen_'));
    if (kitchenViolations.length > 0) {
        suggestions.push('Keep kitchen near living area and main entrance for utility access.');
    }

    // Suggest bedroom spacing
    const bedrooms = rooms.filter(r => r.type === 'bedroom');
    if (bedrooms.length > 1) {
        const tooClose = violations.some(v => v.rule === 'bedroom_separation');
        if (tooClose) {
            suggestions.push('Increase spacing between bedrooms for privacy.');
        }
    }

    // Suggest overall flow
    if (violations.length > 5) {
        suggestions.push('Consider regenerating with more specific description for better layout.');
    }

    return suggestions;
}

/**
 * Main validation function
 */
export function validateLayout(rooms: Room[]): LayoutValidationResult {
    const allViolations: LayoutConstraint[] = [];

    // Validate each room
    rooms.forEach(room => {
        const roomViolations = validateRoomConstraints(room, rooms);
        allViolations.push(...roomViolations);
    });

    // Validate overall layout
    const layoutViolations = validateLayoutConstraints(rooms);
    allViolations.push(...layoutViolations);

    // Separate violations by severity
    const errors = allViolations.filter(v => v.severity === 'error');
    const warnings = allViolations.filter(v => v.severity === 'warning' || v.severity === 'info');

    // Generate suggestions
    const suggestions = generateSuggestions(rooms, allViolations);

    return {
        isValid: errors.length === 0,
        violations: errors,
        warnings: warnings,
        suggestions: suggestions,
    };
}

/**
 * Get validation report as formatted string
 */
export function getValidationReport(result: LayoutValidationResult): string {
    const lines: string[] = [];

    lines.push('='.repeat(50));
    lines.push('LAYOUT VALIDATION REPORT');
    lines.push('='.repeat(50));
    lines.push('');

    // Status
    if (result.isValid) {
        lines.push('✓ STATUS: VALID');
    } else {
        lines.push(`✗ STATUS: INVALID (${result.violations.length} error${result.violations.length !== 1 ? 's' : ''})`);
    }
    lines.push('');

    // Errors
    if (result.violations.length > 0) {
        lines.push('ERRORS:');
        result.violations.forEach(v => {
            lines.push(`  ✗ ${v.description}`);
        });
        lines.push('');
    }

    // Warnings
    if (result.warnings.length > 0) {
        lines.push('WARNINGS & NOTES:');
        result.warnings.forEach(w => {
            lines.push(`  ⚠ ${w.description}`);
        });
        lines.push('');
    }

    // Suggestions
    if (result.suggestions.length > 0) {
        lines.push('SUGGESTIONS:');
        result.suggestions.forEach(s => {
            lines.push(`  → ${s}`);
        });
        lines.push('');
    }

    lines.push('='.repeat(50));

    return lines.join('\n');
}

/**
 * Get rules for a specific room type
 */
export function getRoomRules(roomType: string): RoomPlacementRule | null {
    return ROOM_PLACEMENT_RULES[roomType] || null;
}

/**
 * Get all defined rules
 */
export function getAllRules(): Record<string, RoomPlacementRule> {
    return ROOM_PLACEMENT_RULES;
}