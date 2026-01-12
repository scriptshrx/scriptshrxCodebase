// backend/src/services/summarizeService.js
/**
 * Summarization Service - AI-powered call transcription and meeting notes
 * Generates structured summaries, key points, and action items from voice calls
 */

const OpenAI = require('openai');
const prisma = require('../lib/prisma');

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

/**
 * Generate a summary from a call transcript
 * @param {string} transcript - Full conversation transcript
 * @param {object} tenant - Tenant object with business context
 * @returns {object} - { summary, keyPoints, actionItems, sentiment }
 */
async function summarizeTranscript(transcript, tenant = null) {
    if (!openai) {
        console.error('[SummarizeService] OpenAI not configured');
        return {
            summary: 'Summary unavailable - AI not configured',
            keyPoints: [],
            actionItems: [],
            sentiment: 'neutral'
        };
    }

    if (!transcript || transcript.trim().length < 20) {
        return {
            summary: 'Call too short to summarize',
            keyPoints: [],
            actionItems: [],
            sentiment: 'neutral'
        };
    }

    const businessContext = tenant?.name
        ? `This is a call for ${tenant.name}.`
        : 'This is a business call.';

    const systemPrompt = `You are an expert at analyzing business conversations and creating concise, actionable summaries.

${businessContext}

Analyze the following call transcript and provide:
1. A brief summary (2-3 sentences)
2. Key points discussed (bullet points)
3. Action items identified (specific tasks, appointments, follow-ups)
4. Overall sentiment (positive, neutral, negative)

Format your response as JSON:
{
  "summary": "Brief summary of the call...",
  "keyPoints": ["Point 1", "Point 2", ...],
  "actionItems": [
    {"type": "booking", "description": "...", "details": {...}},
    {"type": "follow_up", "description": "..."},
    {"type": "task", "description": "..."}
  ],
  "sentiment": "positive|neutral|negative"
}`;

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Transcript:\n\n${transcript}` }
            ],
            response_format: { type: 'json_object' },
            max_tokens: 1000,
            temperature: 0.3
        });

        const result = JSON.parse(completion.choices[0]?.message?.content || '{}');

        console.log('[SummarizeService] Summary generated successfully');

        return {
            summary: result.summary || 'Unable to generate summary',
            keyPoints: result.keyPoints || [],
            actionItems: result.actionItems || [],
            sentiment: result.sentiment || 'neutral'
        };
    } catch (error) {
        console.error('[SummarizeService] Error generating summary:', error);
        return {
            summary: 'Error generating summary',
            keyPoints: [],
            actionItems: [],
            sentiment: 'neutral',
            error: error.message
        };
    }
}

/**
 * Extract action items from a transcript
 * @param {string} transcript 
 * @returns {array} - Array of action items
 */
async function extractActionItems(transcript) {
    const result = await summarizeTranscript(transcript);
    return result.actionItems || [];
}

/**
 * Generate formal meeting minutes from a call session
 * @param {string} callSessionId 
 * @returns {object} - Meeting minute data ready for storage
 */
async function generateMeetingMinutes(callSessionId) {
    try {
        const callSession = await prisma.callSession.findUnique({
            where: { id: callSessionId },
            include: {
                tenant: true,
                client: true
            }
        });

        if (!callSession) {
            throw new Error('Call session not found');
        }

        if (!callSession.transcript) {
            throw new Error('No transcript available for this call');
        }

        const summaryData = await summarizeTranscript(
            callSession.transcript,
            callSession.tenant
        );

        // Format as meeting minutes
        const minuteContent = formatMeetingMinutes({
            date: callSession.startedAt,
            duration: callSession.duration,
            participants: [
                callSession.client?.name || 'Caller',
                `${callSession.tenant?.aiName || 'AI Assistant'} (AI)`
            ],
            callerPhone: callSession.callerPhone,
            summary: summaryData.summary,
            keyPoints: summaryData.keyPoints,
            actionItems: summaryData.actionItems
        });

        // Update call session with summary
        await prisma.callSession.update({
            where: { id: callSessionId },
            data: {
                summary: summaryData.summary,
                actionItems: summaryData.actionItems
            }
        });

        console.log(`[SummarizeService] Meeting minutes generated for call ${callSessionId}`);

        return {
            callSessionId,
            clientId: callSession.clientId,
            tenantId: callSession.tenantId,
            content: minuteContent,
            summary: summaryData,
            raw: callSession.transcript
        };
    } catch (error) {
        console.error('[SummarizeService] Error generating meeting minutes:', error);
        throw error;
    }
}

/**
 * Format meeting minutes as structured text
 */
function formatMeetingMinutes({ date, duration, participants, callerPhone, summary, keyPoints, actionItems }) {
    const formattedDate = new Date(date).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const durationStr = duration
        ? `${Math.floor(duration / 60)}m ${duration % 60}s`
        : 'Unknown';

    let content = `## Call Summary\n`;
    content += `**Date:** ${formattedDate}\n`;
    content += `**Duration:** ${durationStr}\n`;
    if (callerPhone) content += `**Caller:** ${callerPhone}\n`;
    content += `**Participants:** ${participants.join(', ')}\n\n`;

    content += `### Summary\n${summary}\n\n`;

    if (keyPoints && keyPoints.length > 0) {
        content += `### Key Points\n`;
        keyPoints.forEach(point => {
            content += `- ${point}\n`;
        });
        content += '\n';
    }

    if (actionItems && actionItems.length > 0) {
        content += `### Action Items\n`;
        actionItems.forEach((item, index) => {
            const typeEmoji = {
                'booking': '📅',
                'follow_up': '📞',
                'task': '✅'
            }[item.type] || '•';
            content += `${index + 1}. ${typeEmoji} **[${item.type?.toUpperCase() || 'TASK'}]** ${item.description}\n`;
        });
    }

    return content;
}

/**
 * Process a completed call session - generate summary and optionally create meeting minute
 * @param {string} callSessionId 
 * @param {object} options - { createMeetingMinute: boolean }
 */
async function processCompletedCall(callSessionId, options = {}) {
    try {
        const minuteData = await generateMeetingMinutes(callSessionId);

        // Optionally create a MeetingMinute record
        if (options.createMeetingMinute && minuteData.clientId) {
            await prisma.meetingMinute.create({
                data: {
                    clientId: minuteData.clientId,
                    tenantId: minuteData.tenantId,
                    content: minuteData.content
                }
            });
            console.log(`[SummarizeService] MeetingMinute created for call ${callSessionId}`);
        }

        return minuteData;
    } catch (error) {
        console.error('[SummarizeService] Error processing completed call:', error);
        throw error;
    }
}

module.exports = {
    summarizeTranscript,
    extractActionItems,
    generateMeetingMinutes,
    formatMeetingMinutes,
    processCompletedCall
};
