/**
 * Genre Mapper — Multi-Dimensional Tag Generation Engine
 * 
 * Converts (mood × context) → precise JioSaavn search queries
 * Supports 20+ moods × 10+ contexts = rich, situational playlists
 */

// ─────────────────────────────────────────────────────────
const TAG_MAP = {

  sadness: {
    default: ['arijit singh sad', 'jubin nautiyal sad', 'b praak emotional', 'sad hindi movie hits', 'kk emotional songs'],
    night: ['late night sad arijit', 'atif aslam sad', 'midnight emotional hindi'],
    rain: ['baarish sad hindi', 'mithoon sad songs', 'monsoon sad arijit'],
    breakup: ['breakup arijit singh', 'jubin nautiyal heartbreak', 'b praak breakup'],
    travel: ['sad travel arijit', 'safar sad kay kay'],
    morning: ['morning emotional arijit', 'subah sad sonu nigam']
  },

  joy: {
    default: ['pritam happy', 'shreya ghoshal happy', 'badshah upbeat', 'amit trivedi joyful', 'sunidhi chauhan dance'],
    party: ['badshah party hits', 'neha kakkar dance', 'bollywood party anthems original', 'mika singh dance'],
    morning: ['morning happy shreya ghoshal', 'subah fresh arijit'],
    travel: ['road trip pritam', 'driving hits vishal dadlani', 'happy travel shaan'],
    gym: ['badshah gym', 'vishal dadlani energy', 'pump up hindi original']
  },

  anger: {
    default: ['badshah intense', 'brodha v rap', 'divine rap', 'kr$na rap'],
    gym: ['gym rap divine', 'power workout badshah', 'beast mode raftaar'],
    night: ['dark rap divine', 'intense night hip hop kr$na']
  },

  love: {
    default: ['arijit singh romantic', 'shreya ghoshal romantic', 'pritam love songs', 'atif aslam romantic', 'armaan malik love'],
    night: ['late night romantic arijit', 'darshan raval romantic', 'moonlight love shreya'],
    rain: ['baarish romantic arijit', 'rain romance pritam', 'monsoon love atif aslam'],
    romantic: ['candle light arijit singh', 'intimate love armaan malik', 'date night pritam'],
    morning: ['morning love shreya ghoshal', 'subah romantic arijit']
  },

  calm: {
    default: ['ar rahman peaceful', 'shreya ghoshal calm', 'soothing arijit singh', 'amit trivedi soft'],
    study: ['ar rahman study', 'focus calm shreya', 'background soft pritam'],
    night: ['late night calm rahman', 'night peaceful arijit'],
    morning: ['morning calm shreya', 'peaceful subah rahman'],
    sleep: ['sleep songs arijit', 'lullaby shreya', 'neend soft rahman']
  },

  heartbreak: {
    default: ['arijit singh heartbreak', 'jubin nautiyal breakup', 'b praak sad hits', 'atif aslam heartbreak'],
    night: ['late night heartbreak arijit', 'midnight breakup jubin'],
    rain: ['baarish breakup arijit', 'rain heartbreak b praak']
  },

  nostalgic: {
    default: ['kumar sanu hits', 'udit narayan romantic', 'alka yagnik best', 'lata mangeshkar retro', 'kishore kumar classic'],
    night: ['late night nostalgic hindi', 'old melody night'],
    morning: ['retro morning bollywood', 'classic morning songs']
  },

  romantic: {
    default: ['romantic bollywood songs', 'love songs hindi', 'mohabbat ke gaane', 'couple songs hindi'],
    night: ['late night romantic', 'raat romance songs hindi', 'moonlight hindi romantic'],
    rain: ['baarish romance hindi', 'rain love songs'],
    romantic: ['intimate romantic songs', 'anniversary songs hindi', 'valentines day songs hindi']
  },

  motivated: {
    default: ['motivational hindi songs', 'power songs hindi', 'josh wale gaane', 'inspirational bollywood'],
    gym: ['gym motivation hindi', 'workout motivation songs', 'power gym hindi'],
    morning: ['morning motivation hindi songs', 'energetic subah songs']
  },

  energetic: {
    default: ['energetic bollywood songs', 'high energy hindi', 'upbeat songs 2026'],
    party: ['high energy party songs', 'rave bollywood', 'dance floor hits hindi'],
    gym: ['high energy gym songs', 'intense workout hindi'],
    travel: ['road trip energy songs']
  },

  party: {
    default: ['party bollywood 2026', 'dance songs hindi latest', 'club hits bollywood', 'party anthems'],
    night: ['late night party songs', 'club night hits hindi'],
    morning: ['morning party vibes']
  },

  chill: {
    default: ['chill hindi songs', 'laid back bollywood', 'relax hindi songs', 'mellow hindi music'],
    night: ['late night chill hindi', 'night chill bollywood'],
    morning: ['morning chill songs hindi'],
    study: ['chill study music hindi', 'lo-fi bollywood', 'soft background hindi']
  },

  lonely: {
    default: ['lonely songs hindi', 'akela songs bollywood', 'alone sad hindi', 'dil akela gaane'],
    night: ['late night lonely hindi', 'midnight alone songs']
  },

  dreamy: {
    default: ['dreamy hindi songs', 'dream bollywood', 'hazy romantic songs', 'surreal hindi songs'],
    night: ['night dreamy songs hindi', 'midnight dreamy']
  },

  sleepy: {
    default: ['lullaby hindi songs', 'sleep music hindi', 'soft night songs', 'neend songs'],
    night: ['late night sleep songs', 'raat neend songs hindi']
  },

  hopeful: {
    default: ['hopeful bollywood songs', 'new beginning songs hindi', 'positive hindi songs', 'better days songs'],
    morning: ['morning hope songs hindi', 'start fresh songs']
  },

  focused: {
    default: ['focus music hindi', 'concentration music', 'study focus songs', 'deep focus hindi'],
    study: ['study music background hindi', 'deep concentration songs', 'focus hindi instrumental']
  },

  workout: {
    default: ['workout songs hindi', 'gym songs 2026', 'pump up songs hindi', 'exercise hindi songs'],
    gym: ['beast mode gym songs', 'heavy lifting songs', 'gym motivation hindi 2026']
  },

  filmy: {
    default: ['trending bollywood songs 2026', 'latest hindi film songs', 'superhit bollywood 2025 2026', 'new bollywood hits'],
    party: ['filmy party songs', 'bollywood dance numbers'],
    night: ['late night bollywood classics']
  },

  sufi: {
    default: ['sufi songs hindi', 'qawwali songs', 'ghazal hindi', 'sufi bollywood', 'mystical hindi songs'],
    night: ['late night sufi songs', 'raat ghazal']
  },

  devotional: {
    default: ['bhajan hindi', 'aarti songs', 'devotional songs bollywood', 'bhakti songs', 'mantra songs'],
    morning: ['subah bhajan', 'morning prayers hindi', 'morning aarti songs']
  },

  desi: {
    default: ['punjabi folk songs', 'bhangra hits 2026', 'gujarati garba songs', 'desi beats', 'haryanvi songs', 'rajasthani folk'],
    party: ['bhangra party songs', 'desi party hits'],
    travel: ['desi road trip songs', 'folk travel songs']
  },

  melancholy: {
    default: ['melancholy bollywood', 'bittersweet hindi', 'emotional sad songs hindi', 'heavy heart songs'],
    night: ['melancholy night hindi', 'raat udasiyan']
  },

  dark: {
    default: ['dark rap hindi', 'intense songs', 'heavy bollywood', 'dark vibe songs'],
    night: ['dark night songs hindi', 'intense night rap']
  },

  // ── Fallback / base emotions ──
  fear: {
    default: ['peaceful hindi songs', 'calm soothing', 'serene songs hindi']
  },
  surprise: {
    default: ['indie pop hindi', 'fusion hindi songs', 'quirky bollywood', 'experimental hindi']
  }
};

// Base emotion validations for backward compat
const VALID_EMOTIONS = Object.keys(TAG_MAP);

/**
 * Maps emotion + context to a list of JioSaavn search queries
 * 
 * @param {string} emotion - Detected primary emotion (extended or base)
 * @param {string|null} context - Detected context (night, gym, etc.)
 * @returns {string[]} Array of JioSaavn search queries (deduplicated)
 */
function mapEmotionToGenres(emotion, context = null) {
  try {
    const normalizedEmotion = (emotion || 'joy').toLowerCase().trim();
    const normalizedContext = (context || '').toLowerCase().trim() || null;

    const emotionMap = TAG_MAP[normalizedEmotion] || TAG_MAP['joy'];

    // Get context-specific queries, fallback to default
    let contextQueries = [];
    if (normalizedContext && emotionMap[normalizedContext]) {
      contextQueries = emotionMap[normalizedContext];
    }
    const defaultQueries = emotionMap['default'] || TAG_MAP['joy']['default'];

    // Combine: context queries first (more specific), then defaults
    const combined = [...contextQueries, ...defaultQueries];
    // Deduplicate
    const unique = [...new Set(combined)];

    console.log(`[GenreMapper] emotion=${normalizedEmotion} context=${normalizedContext} → ${unique.length} queries`);
    return unique;

  } catch (error) {
    console.error('[GenreMapper] Error:', error.message);
    return TAG_MAP['joy']['default'];
  }
}

export {
  mapEmotionToGenres,
  TAG_MAP,
  VALID_EMOTIONS
};
