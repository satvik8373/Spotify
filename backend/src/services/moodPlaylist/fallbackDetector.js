/**
 * Fallback Emotion Detector — Multi-Layer Emotion Vector System
 * 
 * Upgraded from 6-emotion flat detection to:
 * - 20+ emotional states with keyword scoring
 * - Returns a weighted emotion vector (not just top-1)
 * - Supports Indian/regional context moods
 */

// ─────────────────────────────────
// EXTENDED EMOTION DATASET (50+ moods)
// Each keyword has a weight (0.0–1.0)
// ─────────────────────────────────
const EMOTION_DATASET = {
  // ── Core emotions ──
  sadness: {
    keywords: ['sad', 'depressed', 'unhappy', 'down', 'melancholy', 'grief', 'sorrow', 'gloomy', 'tears', 'crying', 'miserable', 'upset', 'dukhi', 'dard', 'hurt'],
    weight: 1.0
  },
  joy: {
    keywords: ['happy', 'excited', 'joyful', 'cheerful', 'upbeat', 'great', 'amazing', 'wonderful', 'delighted', 'elated', 'thrilled', 'celebrate', 'fun', 'khushi', 'mast'],
    weight: 1.0
  },
  anger: {
    keywords: ['angry', 'mad', 'furious', 'frustrated', 'annoyed', 'irritated', 'rage', 'pissed', 'hatred', 'aggressive', 'violent', 'gussa', 'frustrated'],
    weight: 1.0
  },
  love: {
    keywords: ['love', 'romantic', 'crush', 'affection', 'adore', 'caring', 'tender', 'sweet', 'beloved', 'darling', 'pyar', 'ishq', 'mohabbat', 'dil', 'heart'],
    weight: 1.0
  },
  fear: {
    keywords: ['scared', 'afraid', 'anxious', 'worried', 'nervous', 'fearful', 'terrified', 'panic', 'dark', 'alone', 'lost'],
    weight: 0.9
  },
  surprise: {
    keywords: ['surprised', 'shocked', 'amazed', 'unexpected', 'wow', 'astonished', 'unbelievable'],
    weight: 0.9
  },

  // ── Extended mood states ──
  calm: {
    keywords: ['calm', 'relax', 'peaceful', 'serene', 'quiet', 'still', 'tranquil', 'gentle', 'soft', 'slow', 'shanti', 'sukoon'],
    weight: 1.0
  },
  nostalgic: {
    keywords: ['nostalgic', 'memories', 'throwback', 'old times', 'past', 'remember', 'childhood', 'purani yaadein', 'bachpan', 'miss those days'],
    weight: 1.0
  },
  romantic: {
    keywords: ['romantic', 'date', 'intimate', 'candle', 'moonlight', 'together', 'anniversary', 'valentines', 'proposal', 'honeymoon'],
    weight: 1.0
  },
  motivated: {
    keywords: ['motivated', 'power', 'energy', 'beast mode', 'hustle', 'grind', 'push', 'stronger', 'unstoppable', 'champion', 'winner'],
    weight: 1.0
  },
  energetic: {
    keywords: ['energetic', 'bouncy', 'electric', 'pumped', 'high energy', 'charged', 'fire', 'wild'],
    weight: 1.0
  },
  focused: {
    keywords: ['focused', 'concentrate', 'deep work', 'productive', 'sharp', 'in the zone', 'clarity', 'study mode'],
    weight: 1.0
  },
  party: {
    keywords: ['party', 'dance', 'club', 'dj', 'vibe', 'festival', 'groove', 'banger', 'hit the dance floor'],
    weight: 1.0
  },
  lonely: {
    keywords: ['lonely', 'alone', 'isolated', 'no one', 'by myself', 'empty', 'akela', 'missing', 'abandoned'],
    weight: 1.0
  },
  hopeful: {
    keywords: ['hope', 'hopeful', 'optimistic', 'bright future', 'better days', 'looking forward', 'new beginnings', 'new chapter'],
    weight: 0.9
  },
  melancholy: {
    keywords: ['melancholy', 'wistful', 'bittersweet', 'heavy heart', 'blue feeling', 'not quite sad', 'empty inside'],
    weight: 1.0
  },
  dark: {
    keywords: ['dark', 'sinister', 'gloomy', 'night', 'shadows', 'mystery', 'gothic', 'heavy'],
    weight: 0.8
  },
  dreamy: {
    keywords: ['dream', 'dreamy', 'fantasy', 'imagining', 'surreal', 'hazy', 'floaty', 'daydream'],
    weight: 1.0
  },
  sleepy: {
    keywords: ['sleep', 'sleepy', 'tired', 'drowsy', 'lullaby', 'bedtime', 'nap', 'rest', 'neend'],
    weight: 1.0
  },
  heartbreak: {
    keywords: ['heartbreak', 'heartbroken', 'broken heart', 'cheated', 'betrayed', 'left me', 'moved on', 'ex', 'toxic relationship', 'breakup', 'toota dil'],
    weight: 1.0
  },
  workout: {
    keywords: ['workout', 'gym', 'exercise', 'lifting', 'cardio', 'running', 'sweat', 'training', 'push harder'],
    weight: 1.0
  },
  chill: {
    keywords: ['chill', 'chilling', 'laid back', 'mellow', 'easy going', 'lounge', 'sunday vibes', 'no rush'],
    weight: 1.0
  },

  // ── Indian/regional context moods ──
  filmy: {
    keywords: ['filmy', 'bollywood', 'movie', 'film', 'cinema', 'drama', 'naatak', 'hero', 'heroine'],
    weight: 1.0
  },
  sufi: {
    keywords: ['sufi', 'qawwali', 'ghazal', 'spiritual', 'mystical', 'soul-stirring', 'devotion'],
    weight: 1.0
  },
  devotional: {
    keywords: ['bhajan', 'prayer', 'god', 'pooja', 'aarti', 'kirtan', 'mantra', 'shiv', 'krishna', 'ram', 'mata', 'bhakti'],
    weight: 1.0
  },
  desi: {
    keywords: ['desi', 'punjabi', 'gujarati', 'bhangra', 'folk', 'haryanvi', 'rajasthani', 'bihari', 'mast'],
    weight: 1.0
  }
};

const DEFAULT_EMOTION = 'joy';

/**
 * Normalizes text for matching
 */
function normalizeText(text) {
  return text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Detects a weighted emotion vector from mood text
 * Returns primary emotion + secondary emotion + full score map
 * 
 * @param {string} moodText
 * @returns {{ emotion: string, secondaryEmotion: string|null, emotionVector: Object, confidence: number, source: string }}
 */
function detectEmotionByKeywords(moodText) {
  const startTime = Date.now();

  try {
    if (!moodText || typeof moodText !== 'string') {
      return { emotion: DEFAULT_EMOTION, secondaryEmotion: null, emotionVector: {}, confidence: 0.5, source: 'default', processingTime: 0 };
    }

    const normalizedText = normalizeText(moodText);
    const emotionVector = {};

    // Score each emotion
    for (const [emotion, config] of Object.entries(EMOTION_DATASET)) {
      let score = 0;
      for (const keyword of config.keywords) {
        if (normalizedText.includes(keyword)) {
          score += config.weight;
        }
      }
      if (score > 0) {
        emotionVector[emotion] = parseFloat((score / config.keywords.length * 10).toFixed(2));
      }
    }

    // Sort by score descending
    const sorted = Object.entries(emotionVector).sort((a, b) => b[1] - a[1]);

    const primaryEmotion = sorted[0]?.[0] || DEFAULT_EMOTION;
    const secondaryEmotion = sorted[1]?.[0] || null;
    const maxScore = sorted[0]?.[1] || 0;

    // Normalize to 0–6 base emotions for genreMapper compatibility
    const baseEmotions = ['sadness', 'joy', 'anger', 'love', 'fear', 'surprise'];
    // Map extended emotions back to base where needed
    const extendedToBase = {
      calm: 'fear',        // calm → "fear" maps to chill genres
      lonely: 'sadness',
      melancholy: 'sadness',
      heartbreak: 'sadness',
      romantic: 'love',
      motivated: 'joy',
      energetic: 'joy',
      party: 'joy',
      nostalgic: 'sadness',
      dreamy: 'love',
      sleepy: 'fear',
      focused: 'fear',
      chill: 'fear',
      hopeful: 'joy',
      dark: 'fear',
      workout: 'anger',
      filmy: 'joy',
      sufi: 'love',
      devotional: 'love',
      desi: 'joy'
    };

    // Use the actual extended emotion for genre mapping; base emotion as fallback
    const mappedBase = baseEmotions.includes(primaryEmotion)
      ? primaryEmotion
      : extendedToBase[primaryEmotion] || DEFAULT_EMOTION;

    const confidence = maxScore > 0 ? Math.min(maxScore / 5, 1.0) : 0.5;
    const processingTime = Date.now() - startTime;

    console.log('[FallbackDetector] Emotion vector:', {
      primaryEmotion,
      secondaryEmotion,
      mappedBase,
      confidence,
      emotionVector,
      processingTime
    });

    return {
      emotion: primaryEmotion,    // Rich extended emotion
      baseEmotion: mappedBase,    // For genre mapper fallback
      secondaryEmotion,
      emotionVector,
      confidence,
      source: 'fallback',
      processingTime
    };

  } catch (error) {
    console.error('[FallbackDetector] Error:', error.message);
    return {
      emotion: DEFAULT_EMOTION,
      baseEmotion: DEFAULT_EMOTION,
      secondaryEmotion: null,
      emotionVector: {},
      confidence: 0.5,
      source: 'default',
      processingTime: Date.now() - startTime
    };
  }
}

export {
  detectEmotionByKeywords,
  EMOTION_DATASET,
  DEFAULT_EMOTION
};
