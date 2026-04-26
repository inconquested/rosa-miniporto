'use client';

import { RulerIcon } from '@phosphor-icons/react';

export function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center h-full gap-6">
            <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-linear-to-br from-slate-100 to-slate-300 mb-4">
                    <RulerIcon weight="duotone" className="w-8 h-8 text-slate-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Visualize Your Space</h3>
                <p className="text-sm text-slate-600 max-w-xs">
                    Type a description of your space and watch it come to life in 3D. Try something like <span className="font-medium">"3 bedroom apartment, 1200 sqft"</span>
                </p>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
                <div className="px-3 py-2">
                    <div className="text-2xl font-bold text-blue-600">3D</div>
                    <div className="text-xs text-slate-600">Interactive</div>
                </div>
                <div className="px-3 py-2">
                    <div className="text-2xl font-bold text-indigo-600">📐</div>
                    <div className="text-xs text-slate-600">Accurate</div>
                </div>
                <div className="px-3 py-2">
                    <div className="text-2xl font-bold text-purple-600">✨</div>
                    <div className="text-xs text-slate-600">Animated</div>
                </div>
            </div>
        </div>
    );
}
