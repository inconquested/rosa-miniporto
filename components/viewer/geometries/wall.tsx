'use client';

export function Wall({
    position,
    args,
    isExternal = false,
    isAnimating = false,
    animationProgress = 1
}: {
    position: [number, number, number];
    args: [number, number, number];
    isExternal?: boolean;
    isAnimating?: boolean;
    animationProgress?: number;
}) {
    // Scale up walls during animation
    const scale = isAnimating ? animationProgress : 1;
    const scaledPosition: [number, number, number] = isAnimating
        ? [position[0], position[1] * animationProgress, position[2]]
        : position;

    return (
        <mesh position={scaledPosition} castShadow receiveShadow scale={[1, scale, 1]}>
            <boxGeometry args={args} />
            <meshStandardMaterial
                color={isExternal ? '#d5d5d5' : '#f5f5f4'}
                metalness={0.2}
                roughness={0.7}
                opacity={animationProgress}
                transparent
            />
        </mesh>
    );
}
