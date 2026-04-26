'use client';

import { GithubLogoIcon, InstagramLogoIcon, MailboxIcon, SparkleIcon } from '@phosphor-icons/react';
import LineWaves from '../LineWaves';
import Link from 'next/link';

export function EmptyState() {
    return (
        <div className="relative flex flex-col items-center justify-center h-full w-full bg-neutral-200 dark:bg-neutral-950 overflow-hidden selection:bg-rose-500/30">
            {/* Background Layer - Reduced opacity for a "behind the glass" feel */}
            <div className="absolute inset-0 z-0 opacity-40">
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

                <p className="text-slate-700 text-lg leading-relaxed mb-10 max-w-sm">
                    Enter a prompt to generate high-fidelity 3D environments in seconds.
                </p>

                {/* Minimal "Suggestion" Box */}
                <div className="group relative p-[1px] rounded-xl bg-gradient-to-r from-rose-500/50 to-pink-500/50 hover:from-rose-500 hover:to-pink-500 transition-all duration-300 mb-12">
                    <div className="bg-white/5 backdrop-blur-sm px-6 py-3 rounded-[11px]">
                        <span className="text-white font-mono text-sm italic">
                            "Modern 3 bedroom apartment, 1200 sqft"
                        </span>
                    </div>
                </div>

                {/* Clean Socials */}
                <div className="flex items-center gap-6 text-slate-500 absolute right-4 top-4">
                    <Link target='_blank' href="" className="hover:text-white transition-colors"><MailboxIcon size={20} /></Link>
                    <Link target='_blank' href="https://github.com/inconquested" className="hover:text-white transition-colors"><GithubLogoIcon size={20} /></Link>
                    <Link target='_blank' href="https://www.instagram.com/rvnnaulia/" className="hover:text-white transition-colors"><InstagramLogoIcon size={20} /></Link>
                </div>
            </div>
        </div>
    );
}