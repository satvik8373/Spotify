/**
 * Emotion Analyzer Service — Layer 5 Upgrade
 * 
 * Now returns: primaryEmotion, secondaryEmotion, emotionVector, context, confidence
 * Integrates: HuggingFace AI + Keyword Vector Fallback + Context Detector
 */

import huggingfaceClient from './huggingfaceClient.js';
import { detectEmotionByKeywords } from './fallbackDetector.js';
import { detectContext } from './contextDetector.js';

/**
 * Analyzes emotion and situational context from mood text
 * 
 * @param {string} moodText - User's mood description
 * @returns {Promise<Object>} Full emotion + context result
 */
async function analyzeEmotion(moodText) {
  const startTime = Date.now();

  // Always run context detection (pure local, no API)
  const context = detectContext(moodText);

  try {
    console.log('[EmotionAnalyzer] Starting AI analysis');

    const response = await huggingfaceClient.post('', { inputs: moodText });
    const emotions = response.data[0];

    if (!emotions || !Array.isArray(emotions) || emotions.length === 0) {
      console.warn('[EmotionAnalyzer] Invalid AI response, using fallback');
      return buildResultFromFallback(moodText, context, startTime);
    }

    // Build emotion vector from HuggingFace scores
    const emotionVector = {};
    for (const e of emotions) {
      emotionVector[e.label] = parseFloat(e.score.toFixed(3));
    }

    // Sort by score
    const sorted = emotions.slice().sort((a, b) => b.score - a.score);
    const primaryEmotion = sorted[0]?.label || 'joy';
    const secondaryEmotion = sorted[1]?.label || null;
    const confidence = sorted[0]?.score || 0.5;

    const processingTime = Date.now() - startTime;

    console.log('[EmotionAnalyzer] AI success:', {
      primaryEmotion, secondaryEmotion, context, confidence, processingTime
    });

    return {
      emotion: primaryEmotion,
      baseEmotion: primaryEmotion,
      secondaryEmotion,
      emotionVector,
      context,
      confidence,
      source: 'ai',
      processingTime
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;

    console.error('[EmotionAnalyzer] AI error, using fallback:', {
      error: error.message,
      code: error.code,
      processingTime
    });

    return buildResultFromFallback(moodText, context, startTime);
  }
}

/**
 * Builds result from local keyword-based detector
 */
function buildResultFromFallback(moodText, context, startTime) {
  try {
    const fallback = detectEmotionByKeywords(moodText);
    return {
      ...fallback,
      context,
      source: fallback.source || 'fallback',
      processingTime: Date.now() - startTime
    };
  } catch (err) {
    console.error('[EmotionAnalyzer] Fallback also failed:', err.message);
    return {
      emotion: 'joy',
      baseEmotion: 'joy',
      secondaryEmotion: null,
      emotionVector: {},
      context: { primary: null, secondary: null, scores: {} },
      confidence: 0.5,
      source: 'default',
      processingTime: Date.now() - startTime
    };
  }
}

export { analyzeEmotion };
