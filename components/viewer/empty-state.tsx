'use client';

import { GithubLogoIcon, InstagramLogoIcon, MailboxIcon, SparkleIcon } from '@phosphor-icons/react';
import LineWaves from '../LineWaves';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function EmptyState() {
    return (
        <div className="relative flex flex-col items-center justify-center h-full w-full bg-neutral-200 dark:bg-neutral-950 overflow-hidden selection:bg-rose-500/30">
            {/* Background Layer - Reduced opacity for a "behind the glass" feel */}
            <div className="absolute inset-0 z-0 opacity-75">
                <LineWaves
                    speed={0.2}
                    innerLineCount={19}
                    outerLineCount={21}
                    warpIntensity={1}
                    rotation={-45}
                    edgeFadeWidth={0.15}
                    colorCycleSpeed={1.6}
                    brightness={0.2}
                    color1="#f43f5e"
                    color2="#be123c"
                    color3="#fecdd3"
                />
            </div>

            {/* Content Layer */}
            <div className="relative z-10 flex flex-col items-center justify-center max-w-lg text-center px-4">

                {/* Minimalist Icon */}
                <div className="mb-8 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                    <SparkleIcon className="w-6 h-6 text-rose-800" />
                </div>

                {/* Typography Hierarchy */}
                <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">
                    Visualize your space.
                </h1>

                <p className="text-white text-lg leading-relaxed mb-10 max-w-sm">
                    Enter a prompt to generate high-fidelity 3D environments in seconds.
                </p>

                {/* Minimal "Suggestion" Box */}
                <div className="group relative p-px rounded-xl bg-linear-to-r from-rose-500/50 to-rose-600/50 hover:from-rose-500 hover:to-rose-600 transition-all ease-in duration-300 mb-12">
                    <div className="bg-white/5 backdrop-blur-sm px-6 py-3 rounded-[11px]">
                        <span className="text-white font-mono text-sm italic">
                            "Modern 3 bedroom apartment, 1200 sqft"
                        </span>
                    </div>
                </div>

                {/* Clean Socials */}
                <div className="flex items-center gap-2 absolute right-6 top-6">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-full text-white hover:text-white hover:bg-white/10 transition-all duration-300" asChild>
                                <Link target='_blank' href="https://github.com/inconquested">
                                    <GithubLogoIcon size={32} weight="fill" />
                                </Link>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-neutral-900 border-white/10 text-white font-mono text-xs">
                            @inconquested
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-full text-white hover:text-white hover:bg-white/10 transition-all duration-300" asChild>
                                <Link target='_blank' href="https://www.instagram.com/rvnnaulia/">
                                    <InstagramLogoIcon size={32} weight="fill" />
                                </Link>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-neutral-900 border-white/10 text-white font-mono text-xs">
                            @rvnnaulia
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>
        </div>
    );
}