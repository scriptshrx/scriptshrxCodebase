/**
 * AI Analysis Service - Lead Scoring & Sentiment Analysis
 * --------------------------------------------------------
 * Enterprise Feature: Analyze conversations to score leads and
 * detect customer sentiment for priority handling.
 */

const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

class AIAnalysisService {
    /**
     * Analyze message sentiment and buying intent
     * @param {string} message - The customer's message
     * @returns {Promise<{intent: number, sentiment: string, urgency: number, summary: string}>}
     */
    async analyzeSentiment(message) {
        try {
            if (!message || message.trim().length < 3) {
                return { intent: 5, sentiment: 'neutral', urgency: 3, summary: 'Brief message' };
            }

            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: `Analyze this customer message. Return JSON with:
- intent: 0-10 (buying intent, 10 = ready to buy)
- sentiment: "positive" | "neutral" | "frustrated" | "angry"
- urgency: 0-10 (how urgent is their need)
- summary: 1-sentence summary of their request

Be accurate and concise.`
                    },
                    { role: "user", content: message }
                ],
                response_format: { type: "json_object" },
                max_tokens: 150
            });

            const result = JSON.parse(response.choices[0].message.content);

            // Validate and normalize
            return {
                intent: Math.min(10, Math.max(0, parseInt(result.intent) || 5)),
                sentiment: ['positive', 'neutral', 'frustrated', 'angry'].includes(result.sentiment)
                    ? result.sentiment
                    : 'neutral',
                urgency: Math.min(10, Math.max(0, parseInt(result.urgency) || 5)),
                summary: result.summary || 'No summary available'
            };
        } catch (error) {
            console.error('[AIAnalysis] Sentiment analysis error:', error.message);
            return { intent: 5, sentiment: 'neutral', urgency: 5, summary: 'Analysis unavailable' };
        }
    }

    /**
     * Calculate cumulative lead score based on analysis
     * @param {Object} analysis - The sentiment analysis result
     * @param {number} existingScore - Current lead score (default 0)
     * @returns {number} Updated lead score (0-100)
     */
    calculateLeadScore(analysis, existingScore = 0) {
        let score = existingScore;

        // Intent contributes most (max +20)
        score += analysis.intent * 2;

        // Urgency adds weight (max +10)
        score += analysis.urgency;

        // Sentiment modifiers
        switch (analysis.sentiment) {
            case 'positive':
                score += 5;
                break;
            case 'frustrated':
                score += 15; // High priority - needs attention
                break;
            case 'angry':
                score += 25; // Urgent - risk of churn
                break;
        }

        // Cap at 100
        return Math.min(score, 100);
    }

    /**
     * Analyze a voice call transcript for lead scoring
     * @param {string} transcript - Full call transcript
     * @returns {Promise<Object>} Analysis results
     */
    async analyzeCallTranscript(transcript) {
        try {
            if (!transcript || transcript.length < 20) {
                return {
                    intent: 5,
                    sentiment: 'neutral',
                    urgency: 5,
                    summary: 'Brief call',
                    keyTopics: [],
                    followUpRequired: false
                };
            }

            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: `Analyze this call transcript. Return JSON with:
- intent: 0-10 (buying intent)
- sentiment: "positive" | "neutral" | "frustrated" | "angry"
- urgency: 0-10 (how urgent is their need)
- summary: 2-3 sentence summary
- keyTopics: array of main topics discussed
- followUpRequired: boolean (true if caller needs callback)`
                    },
                    { role: "user", content: transcript }
                ],
                response_format: { type: "json_object" },
                max_tokens: 300
            });

            return JSON.parse(response.choices[0].message.content);
        } catch (error) {
            console.error('[AIAnalysis] Transcript analysis error:', error.message);
            return {
                intent: 5,
                sentiment: 'neutral',
                urgency: 5,
                summary: 'Analysis unavailable',
                keyTopics: [],
                followUpRequired: false
            };
        }
    }

    /**
     * Determine if an alert should be triggered
     * @param {Object} analysis - The sentiment analysis result
     * @returns {{shouldAlert: boolean, priority: string, reason: string}}
     */
    shouldTriggerAlert(analysis) {
        if (analysis.urgency > 8) {
            return {
                shouldAlert: true,
                priority: 'high',
                reason: 'High urgency detected'
            };
        }

        if (analysis.sentiment === 'angry') {
            return {
                shouldAlert: true,
                priority: 'critical',
                reason: 'Angry customer - immediate attention needed'
            };
        }

        if (analysis.sentiment === 'frustrated' && analysis.intent > 6) {
            return {
                shouldAlert: true,
                priority: 'high',
                reason: 'Frustrated high-intent lead'
            };
        }

        if (analysis.intent >= 9) {
            return {
                shouldAlert: true,
                priority: 'medium',
                reason: 'Hot lead - ready to buy'
            };
        }

        return { shouldAlert: false, priority: 'none', reason: '' };
    }
}

module.exports = new AIAnalysisService();
