'use client';

import { Text } from '@react-three/drei';
import { Room } from '@/types';
import { DimensionLine } from './dimension-line';

export function TotalDimensions({ rooms, animationProgress = 1 }: { rooms: Room[], animationProgress?: number }) {
    const maxX = Math.max(...rooms.map(r => r.x + r.width), 0);
    const maxY = Math.max(...rooms.map(r => r.y + r.height), 0);
    const totalArea = rooms.reduce((sum, r) => sum + r.area, 0);

    return (
        <group>
            <DimensionLine
                from={[0, 0, maxY + 1.5]}
                to={[maxX, 0, maxY + 1.5]}
                label={`Total Width: ${maxX.toFixed(1)}m`}
                offset={-0.5}
                rooms={rooms}
                isAnimating={animationProgress < 1}
                animationProgress={Math.max(0, animationProgress - 0.6)}
            />

            <DimensionLine
                from={[maxX + 1.5, 0, 0]}
                to={[maxX + 1.5, 0, maxY]}
                label={`Total Depth: ${maxY.toFixed(1)}m`}
                offset={0.3}
                rooms={rooms}
                isAnimating={animationProgress < 1}
                animationProgress={Math.max(0, animationProgress - 0.6)}
            />

            <Text
                position={[maxX / 2, 1, maxY + 2.5]}
                fontSize={1}
                color="#0f172a"
                anchorX="center"
                anchorY="middle"
                font="https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5WZLCzYlKw.ttf"
                fillOpacity={Math.max(0, animationProgress - 0.6)}
            >
                TOTAL: {totalArea.toFixed(0)} m²
            </Text>
        </group>
    );
}
