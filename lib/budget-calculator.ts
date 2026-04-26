import { Room, BudgetData } from '@/types';

const COSTS = {
    bedroom: { materials: 35, labor: 45, furniture: 2500 },
    kitchen: { materials: 150, labor: 150, furniture: 12000 },
    bathroom: { materials: 120, labor: 130, furniture: 4500 },
    living_room: { materials: 40, labor: 50, furniture: 5000 },
    office: { materials: 30, labor: 40, furniture: 2000 },
    hallway: { materials: 25, labor: 35, furniture: 500 }
};

export function calculateBudget(rooms: Room[]): BudgetData {
    const breakdown = rooms.map(room => {
        const rates = COSTS[room.type as keyof typeof COSTS] || COSTS.bedroom;
        const materials = room.area * rates.materials;
        const labor = room.area * rates.labor;
        const furniture = rates.furniture;
        const subtotal = materials + labor + furniture;

        return {
            room: room.type.replace('_', ' ').toUpperCase(),
            area: Math.round(room.area),
            materials: Math.round(materials),
            labor: Math.round(labor),
            furniture,
            subtotal: Math.round(subtotal)
        };
    });

    const total = breakdown.reduce((sum, r) => sum + r.subtotal, 0);
    return { breakdown, total, contingency: Math.round(total * 0.15) };
}

export const formatCurrency = (v: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);