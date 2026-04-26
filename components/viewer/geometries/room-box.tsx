'use client';

import { useState } from 'react';
import { Text } from '@react-three/drei';
import { Room } from '@/types';
import { Wall } from './wall';
import { DimensionLine } from './dimension-line';
import { COLORS, WALL_HEIGHT, WALL_THICKNESS } from './constants';

export function RoomBox({
    room,
    allRooms = [],
    isAnimating = false,
    animationProgress = 1
}: {
    room: Room,
    allRooms?: Room[],
    isAnimating?: boolean,
    animationProgress?: number
}) {
    const [hovered, setHovered] = useState(false);

    const type = room.type || 'room';
    const label = type.replace('_', ' ').toUpperCase();
    const fontSize = Math.min((room.width * 0.65) / (label.length * 0.5 + 0.1), room.height * 0.4, 1.2);

    const centerX = room.x + room.width / 2;
    const centerZ = room.y + room.height / 2;

    const widthLabel = `${(room.width || 0).toFixed(1)}m`;
    const heightLabel = `${(room.height || 0).toFixed(1)}m`;
    const areaLabel = `${Math.round(room.area || 0)} sqft`;

    // Animate floor scale from center
    const floorScale = isAnimating ? animationProgress : 1;
    const floorOpacity = animationProgress;

    return (
        <group
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
            onPointerOut={() => setHovered(false)}
        >
            {/* Floor - scale up from center */}
            <mesh
                position={[centerX, 0.05, centerZ]}
                receiveShadow
                castShadow
                scale={[floorScale, 1, floorScale]}
            >
                <boxGeometry args={[room.width || 1, 0.1, room.height || 1]} />
                <meshStandardMaterial
                    color={COLORS[room.type as keyof typeof COLORS] || COLORS.other}
                    roughness={0.6}
                    metalness={0.2}
                    opacity={floorOpacity}
                    transparent
                />
            </mesh>

            {/* Walls */}
            <group>
                <Wall
                    position={[centerX, WALL_HEIGHT / 2, room.y - WALL_THICKNESS / 2]}
                    args={[room.width + WALL_THICKNESS, WALL_HEIGHT, WALL_THICKNESS]}
                    isExternal={true}
                    isAnimating={isAnimating}
                    animationProgress={animationProgress}
                />
                <Wall
                    position={[centerX, WALL_HEIGHT / 2, room.y + room.height + WALL_THICKNESS / 2]}
                    args={[room.width + WALL_THICKNESS, WALL_HEIGHT, WALL_THICKNESS]}
                    isExternal={true}
                    isAnimating={isAnimating}
                    animationProgress={animationProgress}
                />
                <Wall
                    position={[room.x - WALL_THICKNESS / 2, WALL_HEIGHT / 2, centerZ]}
                    args={[WALL_THICKNESS, WALL_HEIGHT, room.height + WALL_THICKNESS * 2]}
                    isExternal={true}
                    isAnimating={isAnimating}
                    animationProgress={animationProgress}
                />
                <Wall
                    position={[room.x + room.width + WALL_THICKNESS / 2, WALL_HEIGHT / 2, centerZ]}
                    args={[WALL_THICKNESS, WALL_HEIGHT, room.height + WALL_THICKNESS * 2]}
                    isExternal={true}
                    isAnimating={isAnimating}
                    animationProgress={animationProgress}
                />
            </group>

            {/* Dimension lines */}
            <DimensionLine
                from={[room.x, 0, room.y - 0.8]}
                to={[room.x + room.width, 0, room.y - 0.8]}
                label={widthLabel}
                offset={-0.4}
                rooms={allRooms}
                isAnimating={isAnimating}
                animationProgress={Math.max(0, animationProgress - 0.3)} // Delay dimensions
            />

            <DimensionLine
                from={[room.x - 0.8, 0, room.y]}
                to={[room.x - 0.8, 0, room.y + room.height]}
                label={heightLabel}
                offset={0.3}
                rooms={allRooms}
                isAnimating={isAnimating}
                animationProgress={Math.max(0, animationProgress - 0.3)}
            />

            {/* Room Label */}
            <Text
                position={[centerX, 0.15, centerZ - 0.3]}
                rotation={[-Math.PI / 2, 0, 0]}
                fontSize={fontSize}
                color={hovered ? '#000' : '#64748b'}
                anchorX="center"
                anchorY="middle"
                font="https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5WZLCzYlKw.ttf"
                fillOpacity={animationProgress}
            >
                {label}
            </Text>

            {/* Area Label */}
            <Text
                position={[centerX, 0.13, centerZ + 0.3]}
                rotation={[-Math.PI / 2, 0, 0]}
                fontSize={fontSize * 0.6}
                color="#94a3b8"
                anchorX="center"
                anchorY="middle"
                font="https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5WZLCzYlKw.ttf"
                fillOpacity={animationProgress}
            >
                {areaLabel}
            </Text>

            {/* Corner reference points */}
            {hovered && (
                <>
                    {[[room.x, room.y], [room.x + room.width, room.y],
                    [room.x, room.y + room.height], [room.x + room.width, room.y + room.height]].map((pt, i) => (
                        <mesh key={i} position={[pt[0], 0.08, pt[1]]}>
                            <sphereGeometry args={[0.08, 8, 8]} />
                            <meshStandardMaterial color="#0f172a" opacity={animationProgress} transparent />
                        </mesh>
                    ))}
                </>
            )}
        </group>
    );
}
