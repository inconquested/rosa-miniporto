// pages/api/admin/generation-status.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { getRateLimitStatus } from "@/lib/generation-orch";
import { generationMonitor, getHealthStatus, exportMonitoringData } from "@/lib/generation-monitoring";

interface AdminResponse {
    health?: any;
    stats?: any;
    rateLimits?: any;
    recentEvents?: any;
    error?: string;
}


export default function handler(
    req: NextApiRequest,
    res: NextApiResponse<AdminResponse>
) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const action = req.query.action as string || 'full';

        switch (action) {
            case 'health':
                return res.status(200).json({
                    health: getHealthStatus(),
                });

            case 'stats':
                return res.status(200).json({
                    stats: generationMonitor.getStats(),
                });

            case 'rate-limits':
                return res.status(200).json({
                    rateLimits: getRateLimitStatus(),
                });

            case 'recent':
                return res.status(200).json({
                    recentEvents: generationMonitor.getRecentEvents(20),
                });

            case 'export':
                return res.status(200).json(exportMonitoringData());

            case 'full':
            default:
                return res.status(200).json({
                    health: getHealthStatus(),
                    stats: generationMonitor.getStats(),
                    rateLimits: getRateLimitStatus(),
                    recentEvents: generationMonitor.getRecentEvents(10),
                });
        }
    } catch (error: any) {
        return res.status(500).json({
            error: error.message || "Internal server error",
        });
    }
}