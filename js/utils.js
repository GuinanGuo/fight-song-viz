/**
 * Utility Functions
 * =================
 * Shared helper functions for the visualization
 */

/**
 * Conference color mapping
 */
export const CONFERENCE_COLORS = {
  'ACC': '#F8D8E3',
  'Big 12': '#D8C868',
  'Big Ten': '#c9d1f2',
  'Pac-12': '#abe0e4',
  'SEC': '#f7b45a',
  'Independent': '#fcd297'
};

/**
 * Conference glow colors (with alpha)
 */
export const CONFERENCE_GLOW_COLORS = {
  'ACC': 'rgba(248, 216, 227, 0.45)',
  'Big 12': 'rgba(216, 200, 104, 0.45)',
  'Big Ten': 'rgba(201, 209, 242, 0.45)',
  'Pac-12': 'rgba(171, 224, 228, 0.45)',
  'SEC': 'rgba(247, 180, 90, 0.45)',
  'Independent': 'rgba(252, 210, 151, 0.45)'
};

/**
 * Purdue colors
 */
export const PURDUE_COLORS = {
  gold: '#CFB991',
  goldLight: '#e8dcc4',
  goldDark: '#a89668',
  goldGlow: 'rgba(207, 185, 145, 0.6)'
};

/**
 * Font family constant
 */
export const FONT_FAMILY = "'Manrope', sans-serif";

/**
 * Trope labels for display
 */
export const TROPE_LABELS = {
  fight: 'Fight',
  victory: 'Victory',
  win_won: 'Win/Won',
  rah: 'Rah',
  nonsense: 'Nonsense',
  colors: 'Colors',
  men: 'Men',
  opponents: 'Opponents',
  spelling: 'Spelling'
};

/**
 * Get color for a conference
 * @param {string} conference - Conference name
 * @returns {string} Hex color code
 */
export function getConferenceColor(conference) {
  return CONFERENCE_COLORS[conference] || '#6b7280';
}

/**
 * Get glow color for a conference
 * @param {string} conference - Conference name
 * @returns {string} RGBA color string
 */
export function getConferenceGlowColor(conference) {
  return CONFERENCE_GLOW_COLORS[conference] || 'rgba(107, 114, 128, 0.5)';
}

/**
 * Check if a school is Purdue
 * @param {Object} school - School data object
 * @returns {boolean}
 */
export function isPurdue(school) {
  return school.school === 'Purdue';
}

/**
 * Get active tropes for a school
 * @param {Object} school - School data object
 * @returns {string[]} Array of active trope names
 */
export function getActiveTropes(school) {
  const tropes = ['fight', 'victory', 'win_won', 'rah', 'nonsense', 'colors', 'men', 'opponents', 'spelling'];
  return tropes.filter(t => school[t]);
}

/**
 * Format year with Unknown handling
 * @param {number|null} year - Year value
 * @returns {string} Formatted year string
 */
export function formatYear(year) {
  return year ? `${year}` : 'Unknown';
}

/**
 * Calculate energy score for a school
 * @param {Object} school - School data object
 * @returns {number} Energy score between 0 and 1
 */
export function calculateEnergyScore(school) {
  const bpmNorm = school.bpm / 180;
  const tropeNorm = school.trope_count / 8;
  return (bpmNorm * 0.5) + (tropeNorm * 0.5);
}

/**
 * Linear interpolation
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Progress (0-1)
 * @returns {number}
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Map a value from one range to another
 * @param {number} value - Input value
 * @param {number} inMin - Input range min
 * @param {number} inMax - Input range max
 * @param {number} outMin - Output range min
 * @param {number} outMax - Output range max
 * @returns {number}
 */
export function mapRange(value, inMin, inMax, outMin, outMax) {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

/**
 * Debounce a function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function}
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle a function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in ms
 * @returns {Function}
 */
export function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Get mouse position relative to element
 * @param {MouseEvent} event - Mouse event
 * @param {HTMLElement} element - Target element
 * @returns {{x: number, y: number}}
 */
export function getRelativeMousePosition(event, element) {
  const rect = element.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

/**
 * Check if device supports touch
 * @returns {boolean}
 */
export function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Load JSON data
 * @param {string} url - URL to fetch
 * @returns {Promise<any>}
 */
export async function loadJSON(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }
  return response.json();
}

/**
 * Sort schools by different criteria
 * @param {Object[]} schools - Array of school objects
 * @param {string} sortBy - Sort criterion
 * @returns {Object[]} Sorted array
 */
export function sortSchools(schools, sortBy) {
  const sorted = [...schools];

  switch (sortBy) {
    case 'conference':
      // Sort by conference, then by school name
      sorted.sort((a, b) => {
        const confCompare = a.conference.localeCompare(b.conference);
        if (confCompare !== 0) return confCompare;
        return a.school.localeCompare(b.school);
      });
      break;

    case 'trope_count':
      sorted.sort((a, b) => b.trope_count - a.trope_count);
      break;

    case 'year':
      sorted.sort((a, b) => {
        // Unknown years go to the end
        if (a.year === null) return 1;
        if (b.year === null) return -1;
        return a.year - b.year;
      });
      break;

    case 'bpm':
      sorted.sort((a, b) => b.bpm - a.bpm);
      break;

    default:
      break;
  }

  return sorted;
}

/**
 * Generate aggregated conference stats
 * @param {Object[]} schools - Array of school objects
 * @returns {Object} Conference stats
 */
export function generateConferenceStats(schools) {
  const conferences = {};

  schools.forEach(school => {
    const conf = school.conference;
    if (!conferences[conf]) {
      conferences[conf] = {
        schools: [],
        totalBpm: 0,
        totalDuration: 0,
        fightCount: 0,
        victoryCount: 0,
        totalTropes: 0,
        studentWriterCount: 0,
        spellingCount: 0,
        winWonCount: 0,
        rahCount: 0
      };
    }

    conferences[conf].schools.push(school);
    conferences[conf].totalBpm += school.bpm;
    conferences[conf].totalDuration += school.sec_duration;
    conferences[conf].fightCount += school.fight ? 1 : 0;
    conferences[conf].victoryCount += school.victory || school.win_won ? 1 : 0;
    conferences[conf].totalTropes += school.trope_count;
    conferences[conf].studentWriterCount += school.student_writer ? 1 : 0;
    conferences[conf].spellingCount += school.spelling ? 1 : 0;
    conferences[conf].winWonCount += school.win_won ? 1 : 0;
    conferences[conf].rahCount += school.rah ? 1 : 0;
  });

  // Calculate averages
  Object.keys(conferences).forEach(conf => {
    const c = conferences[conf];
    const count = c.schools.length;
    c.avgBpm = c.totalBpm / count;
    c.avgDuration = c.totalDuration / count;
    c.fightRate = c.fightCount / count;
    c.victoryRate = c.victoryCount / count;
    c.avgTropes = c.totalTropes / count;
    c.studentWriterRate = c.studentWriterCount / count;
    c.spellingRate = c.spellingCount / count;
    c.winWonRate = c.winWonCount / count;
    c.rahRate = c.rahCount / count;
    c.count = count;
  });

  return conferences;
}
