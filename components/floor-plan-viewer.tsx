'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Grid, ContactShadows } from '@react-three/drei';
import { Suspense, useEffect } from 'react';
import { BudgetData, Room } from '@/types';
import { useState, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowCounterClockwiseIcon, HouseIcon, RulerIcon } from '@phosphor-icons/react';
import { RoomBox } from './viewer/geometries/room-box';
import { TotalDimensions } from './viewer/geometries/total-dimensions';
import { EmptyState } from './viewer/empty-state';
import { ANIMATION_DURATION } from './viewer/geometries/constants';

export function FloorPlanViewer({ rooms, onFloorplanClear, budget }: { rooms: Room[], onFloorplanClear: () => void, budget?: BudgetData }) {
    console.log(budget);
    const [leftDown, setLeftDown] = useState(false);
    const [rightDown, setRightDown] = useState(false);
    const controlsRef = useRef<any>(null);

    const bounds = useMemo(() => {
        const maxX = Math.max(...rooms?.map(r => r.x + r.width) || [10], 10);
        const maxY = Math.max(...rooms?.map(r => r.y + r.height) || [10], 10);
        const minX = Math.min(...rooms?.map(r => r.x) || [0], 0);
        const minY = Math.min(...rooms?.map(r => r.y) || [0], 0);
        const midX = (minX + maxX) / 2;
        const midY = (minY + maxY) / 2;
        const dist = Math.max(maxX - minX, maxY - minY, 10) * 1.5;
        return { maxX, maxY, minX, minY, midX, midY, dist };
    }, [rooms]);

    const [animationProgress, setAnimationProgress] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (!rooms?.length) {
            setAnimationProgress(0);
            setIsAnimating(false);
            return;
        }

        // Trigger animation whenever rooms change
        setAnimationProgress(0);
        setIsAnimating(true);

        const startTime = Date.now();
        const totalDurationMs = ANIMATION_DURATION * rooms.length * 1000;

        const animate = () => {
            const elapsedMs = Date.now() - startTime;
            const progress = Math.min(elapsedMs / totalDurationMs, 1);

            setAnimationProgress(progress);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setIsAnimating(false);
            }
        };

        const animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [rooms]); // Re-run whenever rooms data changes

    if (!rooms?.length) {
        return (
            <div className="relative h-full w-full bg-linear-to-br from-slate-50 via-rose-50 to-slate-50">
                <EmptyState />
            </div>
        );
    }

    const { maxX, maxY, minX, minY, midX, midY, dist: cameraDistance } = bounds;

    const handlePointerDown = (e: React.PointerEvent) => {
        if (e.button === 0) setLeftDown(true);
        if (e.button === 2) setRightDown(true);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (e.button === 0) setLeftDown(false);
        if (e.button === 2) setRightDown(false);
    };

    const handleReset = () => {
        if (controlsRef.current) {
            controlsRef.current.reset();
        }
    };

    return (
        <div
            className="relative h-full w-full bg-slate-50"
            style={{ cursor: leftDown ? 'grabbing' : rightDown ? 'move' : 'default' }}
        >
            <Canvas
                camera={{
                    position: [midX + cameraDistance, cameraDistance, midY + cameraDistance],
                    fov: 30,
                    near: 0.05,
                    far: 640
                }}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerLeave={() => { setLeftDown(false); setRightDown(false); }}
                onContextMenu={(e) => e.preventDefault()}
            >
                <color attach="background" args={['#f8fafc']} />

                <ambientLight intensity={0.7} />
                <directionalLight
                    position={[midX + 20, 30, midY + 20]}
                    intensity={1.2}
                    castShadow
                    shadow-mapSize={[1920, 1920]}
                />
                <hemisphereLight intensity={0.4} groundColor="#f8fafc" color="#ffffff" />

                <Suspense fallback={null}>
                    {/* Grid floor */}
                    <group position={[midX, -0.15, midY]}>
                        <Grid
                            infiniteGrid
                            fadeDistance={cameraDistance * 3}
                            fadeStrength={4}
                            cellSize={1}
                            sectionSize={5}
                            sectionColor="#3f3f46"
                            cellColor="#27272a"
                        />
                    </group>

                    {/* Rooms with staggered animation */}
                    <group>
                        {rooms.map((r, i) => {
                            // Stagger each room's animation
                            const roomAnimationStart = i / rooms.length;
                            const roomAnimationEnd = (i + 1) / rooms.length;
                            const roomProgress = Math.max(
                                0,
                                Math.min(
                                    (animationProgress - roomAnimationStart) / (roomAnimationEnd - roomAnimationStart),
                                    1
                                )
                            );

                            return (
                                <RoomBox
                                    key={i}
                                    room={r}
                                    allRooms={rooms}
                                    isAnimating={isAnimating}
                                    animationProgress={roomProgress}
                                />
                            );
                        })}
                    </group>

                    {/* Overall dimensions */}
                    <TotalDimensions rooms={rooms} animationProgress={animationProgress} />

                    <ContactShadows
                        position={[midX, -0.12, midY]}
                        opacity={0.4}
                        scale={cameraDistance * 2}
                        blur={2.5}
                        far={10}
                    />
                </Suspense>

                <OrbitControls
                    ref={controlsRef}
                    makeDefault
                    target={[midX, 0, midY]}
                    minPolarAngle={0}
                    maxPolarAngle={Math.PI / 2.2}
                    minDistance={0}
                    maxDistance={cameraDistance * 3}
                    dampingFactor={0.05}
                    enabled={!isAnimating} // Disable controls during animation
                />
            </Canvas>

            {/* View Controls */}
            <div className="absolute top-4 right-4 flex gap-2">
                <Button
                    variant={'outline'}
                    onClick={handleReset}
                    disabled={isAnimating}
                >
                    <ArrowCounterClockwiseIcon />
                    Reset View
                </Button>

                <Button
                    variant={'outline'}
                    onClick={onFloorplanClear}
                >
                    <HouseIcon />
                    Clear Floorplan
                </Button>
            </div>

            {/* Measurement legend */}
            <div className="absolute bottom-4 left-4 bg-white/40 text-neutral-950 p-4 rounded-lg text-xs font-mono border border-white/20 backdrop-blur-md">
                <div className="font-bold text-rose-700 mb-2 tracking-wider">FLOORPLAN ANALYTICS</div>
                <div className="space-y-1">
                    <div className="flex justify-between gap-4">
                        <span>Total Area:</span>
                        <span className="text-neutral-600">{(rooms.reduce((s, r) => s + r.area, 0)).toFixed(0)} sqft</span>
                    </div>
                    <div className="flex justify-between gap-4">
                        <span>Rooms:</span>
                        <span className="text-neutral-600">{rooms.length} Units</span>
                    </div>
                    <div className="flex justify-between gap-4">
                        <span>Apprx Budget:</span>
                        <span className="text-neutral-600">{(budget?.total ?? 0).toFixed(0)} $</span>
                    </div>
                </div>
                <div className="text-zinc-500 text-[10px] mt-3 pt-3 border-t border-zinc-800">
                    {isAnimating ? 'BUILDING...' : 'LEFT DRAG: PAN • RIGHT DRAG: ROTATE'}
                </div>
            </div>
        </div>
    );
}