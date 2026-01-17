/**
 * Global State Management
 * =======================
 * Centralized state with observer pattern for cross-module communication
 */

/**
 * Application state
 */
const state = {
  // Data
  schools: [],
  conferences: {},

  // Selection state
  selectedSchool: null,
  hoveredSchool: null,
  activeConference: 'all',

  // UI state
  matrixSort: 'conference',
  currentAct: 1,

  // Visualization instances (will be set by modules)
  galaxy: null,
  map: null,
  radar: null,
  scatter: null,
  matrix: null
};

/**
 * State change listeners
 */
const listeners = new Map();

/**
 * Subscribe to state changes
 * @param {string} key - State key to watch
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
export function subscribe(key, callback) {
  if (!listeners.has(key)) {
    listeners.set(key, new Set());
  }
  listeners.get(key).add(callback);

  // Return unsubscribe function
  return () => {
    listeners.get(key).delete(callback);
  };
}

/**
 * Notify listeners of state change
 * @param {string} key - State key that changed
 * @param {any} value - New value
 */
function notify(key, value) {
  if (listeners.has(key)) {
    listeners.get(key).forEach(callback => {
      try {
        callback(value, state);
      } catch (error) {
        console.error(`Error in state listener for ${key}:`, error);
      }
    });
  }
}

/**
 * Get current state value
 * @param {string} key - State key
 * @returns {any}
 */
export function getState(key) {
  return state[key];
}

/**
 * Get entire state object (read-only)
 * @returns {Object}
 */
export function getAllState() {
  return { ...state };
}

/**
 * Set state value
 * @param {string} key - State key
 * @param {any} value - New value
 */
export function setState(key, value) {
  const oldValue = state[key];

  // Only update and notify if value actually changed
  if (oldValue !== value) {
    state[key] = value;
    notify(key, value);
  }
}

/**
 * Set multiple state values at once
 * @param {Object} updates - Object with key-value pairs
 */
export function setMultipleState(updates) {
  Object.entries(updates).forEach(([key, value]) => {
    setState(key, value);
  });
}

/**
 * Initialize state with data
 * @param {Object[]} schools - School data array
 * @param {Object} conferences - Conference stats object
 */
export function initializeState(schools, conferences) {
  state.schools = schools;
  state.conferences = conferences;
  notify('schools', schools);
  notify('conferences', conferences);
}

/**
 * Select a school
 * @param {Object|null} school - School to select, or null to deselect
 */
export function selectSchool(school) {
  setState('selectedSchool', school);
}

/**
 * Hover over a school
 * @param {Object|null} school - School being hovered, or null when leaving
 */
export function hoverSchool(school) {
  setState('hoveredSchool', school);
}

/**
 * Set active conference filter
 * @param {string} conference - Conference name or 'all'
 */
export function setConferenceFilter(conference) {
  setState('activeConference', conference);
}

/**
 * Set matrix sort order
 * @param {string} sortBy - Sort criterion
 */
export function setMatrixSort(sortBy) {
  setState('matrixSort', sortBy);
}

/**
 * Set current act (section)
 * @param {number} act - Act number (1, 2, or 3)
 */
export function setCurrentAct(act) {
  setState('currentAct', act);
}

/**
 * Register a visualization module
 * @param {string} name - Module name (galaxy, map, radar, scatter, matrix)
 * @param {Object} instance - Module instance
 */
export function registerModule(name, instance) {
  state[name] = instance;
}

/**
 * Get registered module
 * @param {string} name - Module name
 * @returns {Object|null}
 */
export function getModule(name) {
  return state[name];
}

/**
 * Get filtered schools based on current conference filter
 * @returns {Object[]}
 */
export function getFilteredSchools() {
  if (state.activeConference === 'all') {
    return state.schools;
  }
  return state.schools.filter(s => s.conference === state.activeConference);
}

/**
 * Find school by name
 * @param {string} name - School name
 * @returns {Object|undefined}
 */
export function findSchool(name) {
  return state.schools.find(s => s.school === name);
}

/**
 * Get Purdue school data
 * @returns {Object|undefined}
 */
export function getPurdue() {
  return findSchool('Purdue');
}

// Export state for debugging (read-only in production)
if (typeof window !== 'undefined') {
  window.__APP_STATE__ = state;
}
