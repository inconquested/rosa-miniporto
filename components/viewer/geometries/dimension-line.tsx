'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import { Room } from '@/types';
import { DIMENSION_OFFSET } from './constants';

export function DimensionLine({
    from,
    to,
    label,
    offset = DIMENSION_OFFSET,
    rooms = [],
    isAnimating = false,
    animationProgress = 1
}: {
    from: [number, number, number];
    to: [number, number, number];
    label: string;
    offset?: number;
    rooms?: Room[];
    isAnimating?: boolean;
    animationProgress?: number;
}) {
    const midX = (from[0] + to[0]) / 2;
    const midZ = (from[2] + to[2]) / 2;

    // Determine orientation
    const isHorizontal = Math.abs(from[0] - to[0]) > Math.abs(from[2] - to[2]);

    // Collision detection
    const checkCollision = (x: number, z: number) => {
        const padding = 0.2;
        return rooms.some(r =>
            x >= r.x - padding &&
            x <= r.x + r.width + padding &&
            z >= r.y - padding &&
            z <= r.y + r.height + padding
        );
    };

    let appliedOffset = offset || 0.3;
    const initialX = isHorizontal ? midX : midX + appliedOffset;
    const initialZ = isHorizontal ? midZ + appliedOffset : midZ;

    if (rooms.length > 0 && checkCollision(initialX, initialZ)) {
        appliedOffset = -appliedOffset;
    }

    const textPosition: [number, number, number] = isHorizontal
        ? [midX, 0.1, midZ + appliedOffset]
        : [midX + appliedOffset, 0.1, midZ];

    // Animate line appearance — compute scalar endpoints so the memoised
    // geometries below only rebuild when a coordinate actually changes.
    const [fx, fy, fz] = from;
    const [tx, ty, tz] = to;
    const ax = isAnimating ? fx + (tx - fx) * (1 - animationProgress) : fx;
    const ay = fy;
    const az = isAnimating ? fz + (tz - fz) * (1 - animationProgress) : fz;

    const lineGeometry = useMemo(() => {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(
            new Float32Array([ax, ay, az, tx, ty, tz]),
            3
        ));
        return geometry;
    }, [ax, ay, az, tx, ty, tz]);

    const tickGeometry1 = useMemo(() => {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(
            new Float32Array([
                ax - 0.15, ay, az,
                ax + 0.15, ay, az
            ]),
            3
        ));
        return geometry;
    }, [ax, ay, az]);

    const tickGeometry2 = useMemo(() => {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(
            new Float32Array([
                tx - 0.15, ty, tz,
                tx + 0.15, ty, tz
            ]),
            3
        ));
        return geometry;
    }, [tx, ty, tz]);

    return (
        <group>
            <lineSegments geometry={lineGeometry}>
                <lineBasicMaterial color="#0f172a" linewidth={2} opacity={animationProgress} transparent />
            </lineSegments>

            <lineSegments geometry={tickGeometry1}>
                <lineBasicMaterial color="#0f172a" linewidth={2} opacity={animationProgress} transparent />
            </lineSegments>

            <lineSegments geometry={tickGeometry2}>
                <lineBasicMaterial color="#0f172a" linewidth={2} opacity={animationProgress} transparent />
            </lineSegments>

            <Text
                position={textPosition}
                rotation={[-Math.PI / 2, 0, 0]}
                fontSize={0.5}
                color="#1e293b"
                anchorX="center"
                anchorY="middle"
                font="https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5WZLCzYlKw.ttf"
                fillOpacity={animationProgress}
            >
                {label}
            </Text>
        </group>
    );
}
