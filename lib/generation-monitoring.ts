// lib/generationMonitoring.ts

import { Room } from '@/types';

interface GenerationEvent {
    timestamp: Date;
    description: string;
    provider: string;
    attempt: number;
    success: boolean;
    hasValidationIssues: boolean;
    wasCorrected: boolean;
    roomCount: number;
    errorMessage?: string;
}

interface GenerationStats {
    totalRequests: number;
    successfulFirstAttempt: number;
    requiredCorrection: number;
    failedAfterCorrection: number;
    partialFailures: number;
    geminiUsage: number;
    claudeUsage: number;
    correctionUsage: number;
    averageAttempts: number;
    successRate: number;
}

class GenerationMonitor {
    private events: GenerationEvent[] = [];
    private readonly maxEvents = 1000;

    logEvent(
        description: string,
        provider: string,
        attempt: number,
        success: boolean,
        hasValidationIssues: boolean,
        wasCorrected: boolean,
        roomCount: number,
        error?: string
    ) {
        const event: GenerationEvent = {
            timestamp: new Date(),
            description,
            provider,
            attempt,
            success,
            hasValidationIssues,
            wasCorrected,
            roomCount,
            errorMessage: error,
        };

        this.events.push(event);

        // Keep only recent events
        if (this.events.length > this.maxEvents) {
            this.events = this.events.slice(-this.maxEvents);
        }

        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.log('[Generation Monitor]', {
                provider,
                attempt,
                success,
                corrected: wasCorrected,
                rooms: roomCount,
                error,
            });
        }
    }

    getStats(): GenerationStats {
        if (this.events.length === 0) {
            return {
                totalRequests: 0,
                successfulFirstAttempt: 0,
                requiredCorrection: 0,
                failedAfterCorrection: 0,
                partialFailures: 0,
                geminiUsage: 0,
                claudeUsage: 0,
                correctionUsage: 0,
                averageAttempts: 0,
                successRate: 0,
            };
        }

        // Group by unique descriptions (unique requests)
        const uniqueRequests = new Map<string, GenerationEvent[]>();
        this.events.forEach(event => {
            if (!uniqueRequests.has(event.description)) {
                uniqueRequests.set(event.description, []);
            }
            uniqueRequests.get(event.description)!.push(event);
        });

        const totalRequests = uniqueRequests.size;
        let successfulFirstAttempt = 0;
        let requiredCorrection = 0;
        let failedAfterCorrection = 0;
        let partialFailures = 0;

        uniqueRequests.forEach(requestEvents => {
            const firstEvent = requestEvents[0];

            if (firstEvent.success && !firstEvent.hasValidationIssues) {
                successfulFirstAttempt++;
            } else if (requestEvents.some(e => e.wasCorrected && e.success)) {
                requiredCorrection++;
            } else if (requestEvents.some(e => e.wasCorrected && !e.success)) {
                failedAfterCorrection++;
            } else {
                partialFailures++;
            }
        });

        const geminiUsage = this.events.filter(e => e.provider.includes('gemini')).length;
        const claudeUsage = this.events.filter(e => e.provider.includes('claude') && !e.provider.includes('correction')).length;
        const correctionUsage = this.events.filter(e => e.provider === 'correction').length;

        const totalAttempts = this.events.length;
        const successfulEvents = this.events.filter(e => e.success).length;
        const successRate = totalAttempts > 0 ? (successfulEvents / totalAttempts) * 100 : 0;

        return {
            totalRequests,
            successfulFirstAttempt,
            requiredCorrection,
            failedAfterCorrection,
            partialFailures,
            geminiUsage,
            claudeUsage,
            correctionUsage,
            averageAttempts: totalAttempts / (totalRequests || 1),
            successRate: Math.round(successRate * 100) / 100,
        };
    }

    getRecentEvents(limit: number = 10): GenerationEvent[] {
        return this.events.slice(-limit).reverse();
    }

    getEventsByProvider(provider: string): GenerationEvent[] {
        return this.events.filter(e => e.provider.includes(provider));
    }

    export(): string {
        const stats = this.getStats();
        const recent = this.getRecentEvents(20);

        return `
Generation Monitoring Report
============================

SUMMARY STATISTICS:
- Total Requests: ${stats.totalRequests}
- Successful First Attempt: ${stats.successfulFirstAttempt} (${(stats.successfulFirstAttempt / stats.totalRequests * 100).toFixed(1)}%)
- Required Correction: ${stats.requiredCorrection}
- Failed After Correction: ${stats.failedAfterCorrection}
- Partial Failures: ${stats.partialFailures}
- Overall Success Rate: ${stats.successRate}%

PROVIDER USAGE:
- Gemini Calls: ${stats.geminiUsage}
- Claude Calls: ${stats.claudeUsage}
- Correction Calls: ${stats.correctionUsage}
- Average Attempts per Request: ${stats.averageAttempts.toFixed(2)}

RECENT EVENTS:
${recent.map((e, i) => `
${i + 1}. [${e.timestamp.toISOString()}]
   Provider: ${e.provider}
   Attempt: ${e.attempt}
   Success: ${e.success}
   Validation Issues: ${e.hasValidationIssues}
   Corrected: ${e.wasCorrected}
   Rooms: ${e.roomCount}
   ${e.errorMessage ? `Error: ${e.errorMessage}` : ''}
`).join('\n')}
        `;
    }

    clear() {
        this.events = [];
    }
}

export const generationMonitor = new GenerationMonitor();

/**
 * Health check endpoint data
 */
export function getHealthStatus() {
    const stats = generationMonitor.getStats();

    return {
        status: stats.successRate > 80 ? 'healthy' : stats.successRate > 50 ? 'degraded' : 'unhealthy',
        successRate: stats.successRate,
        totalRequests: stats.totalRequests,
        correctionRate: stats.totalRequests > 0
            ? ((stats.requiredCorrection / stats.totalRequests) * 100).toFixed(1)
            : '0',
        failureRate: stats.totalRequests > 0
            ? ((stats.failedAfterCorrection + stats.partialFailures) / stats.totalRequests * 100).toFixed(1)
            : '0',
        timestamp: new Date().toISOString(),
    };
}

/**
 * Export monitoring data as JSON
 */
export function exportMonitoringData() {
    const stats = generationMonitor.getStats();
    const recent = generationMonitor.getRecentEvents(50);

    return {
        stats,
        recent,
        health: getHealthStatus(),
        exportedAt: new Date().toISOString(),
    };
}