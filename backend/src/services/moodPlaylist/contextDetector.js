/**
 * Context Detector Service
 * Detects situational/environmental context from user mood prompt
 * 
 * Detects: night, rain, travel, gym, study, party, morning, breakup, devotional
 */

// Context detection keyword maps with weight scores
const CONTEXT_MAP = {
    night: {
        keywords: ['night', 'late night', 'midnight', '3am', '2am', 'dark', 'sleepless', 'insomnia', 'raat', 'tonight', 'after midnight', 'late'],
        weight: 1.0
    },
    rain: {
        keywords: ['rain', 'raining', 'baarish', 'monsoon', 'storm', 'drizzle', 'cloudy', 'wet', 'barish', 'rainy'],
        weight: 1.0
    },
    travel: {
        keywords: ['roadtrip', 'road trip', 'highway', 'driving', 'drive', 'train', 'journey', 'travel', 'trip', 'car', 'long drive', 'safar'],
        weight: 1.0
    },
    gym: {
        keywords: ['gym', 'workout', 'exercise', 'running', 'lifting', 'beast mode', 'fitness', 'training', 'bodybuilding', 'cardio', 'jog'],
        weight: 1.0
    },
    study: {
        keywords: ['study', 'studying', 'focus', 'concentrate', 'coding', 'work', 'reading', 'exam', 'homework', 'deep work', 'productive'],
        weight: 1.0
    },
    party: {
        keywords: ['party', 'dance', 'club', 'dj', 'festival', 'celebration', 'birthday', 'event', 'vibe', 'dance floor', 'nightclub'],
        weight: 1.0
    },
    morning: {
        keywords: ['morning', 'sunrise', 'wake up', 'fresh start', 'subah', 'dawn', 'early', 'new day', 'breakfast', 'start of day'],
        weight: 1.0
    },
    breakup: {
        keywords: ['breakup', 'breakup', 'ex', 'cheated', 'miss you', 'moving on', 'lost love', 'gone', 'left me', 'end of relationship', 'divorce', 'separated'],
        weight: 1.0
    },
    devotional: {
        keywords: ['bhajan', 'prayer', 'god', 'temple', 'mandir', 'masjid', 'devotional', 'pooja', 'meditation', 'spiritual', 'aarti', 'kirtan', 'shiv', 'krishna', 'ram', 'allah'],
        weight: 1.0
    },
    romantic: {
        keywords: ['date', 'anniversary', 'candlelight', 'dinner date', 'propose', 'wedding', 'honeymoon', 'valentine', 'first date', 'with someone special'],
        weight: 1.0
    }
};

/**
 * Detects situational context from user's mood prompt
 * 
 * @param {string} moodText - User's raw mood prompt
 * @returns {{ primary: string|null, secondary: string|null, scores: Object }}
 */
function detectContext(moodText) {
    if (!moodText || typeof moodText !== 'string') {
        return { primary: null, secondary: null, scores: {} };
    }

    const lowerText = moodText.toLowerCase();
    const contextScores = {};

    for (const [context, config] of Object.entries(CONTEXT_MAP)) {
        let score = 0;
        for (const keyword of config.keywords) {
            if (lowerText.includes(keyword)) {
                score += config.weight;
            }
        }
        if (score > 0) {
            contextScores[context] = score;
        }
    }

    // Sort by score
    const sorted = Object.entries(contextScores).sort((a, b) => b[1] - a[1]);

    const primary = sorted[0]?.[0] || null;
    const secondary = sorted[1]?.[0] || null;

    console.log('[ContextDetector] Detected:', { primary, secondary, scores: contextScores });

    return { primary, secondary, scores: contextScores };
}

export { detectContext, CONTEXT_MAP };
