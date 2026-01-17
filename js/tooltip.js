/**
 * Tooltip Module
 * ==============
 * Global tooltip component for school information
 */

import { getConferenceColor, formatYear, isPurdue, PURDUE_COLORS } from './utils.js';

class Tooltip {
  constructor() {
    this.element = document.getElementById('tooltip');
    this.isVisible = false;
    this.currentSchool = null;

    // Cache DOM references
    this.schoolEl = this.element.querySelector('.tooltip-school');
    this.conferenceEl = this.element.querySelector('.tooltip-conference');
    this.songEl = this.element.querySelector('.tooltip-song');
    this.bpmEl = this.element.querySelector('.stat-value.bpm');
    this.durationEl = this.element.querySelector('.stat-value.duration');
    this.tropesEl = this.element.querySelector('.stat-value.tropes');
    this.yearEl = this.element.querySelector('.tooltip-year');

    // Bind methods
    this.show = this.show.bind(this);
    this.hide = this.hide.bind(this);
    this.move = this.move.bind(this);
  }

  /**
   * Show tooltip with school data
   * @param {Object} school - School data
   * @param {number} x - X position
   * @param {number} y - Y position
   */
  show(school, x, y) {
    if (!school) return;

    this.currentSchool = school;
    this.updateContent(school);
    this.move(x, y);

    this.element.classList.add('visible');
    this.element.setAttribute('aria-hidden', 'false');
    this.isVisible = true;
  }

  /**
   * Hide tooltip
   */
  hide() {
    this.element.classList.remove('visible');
    this.element.setAttribute('aria-hidden', 'true');
    this.isVisible = false;
    this.currentSchool = null;
  }

  /**
   * Move tooltip to position
   * @param {number} x - X position
   * @param {number} y - Y position
   */
  move(x, y) {
    const padding = 15;
    const tooltipRect = this.element.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate position with viewport boundaries
    let left = x + padding;
    let top = y + padding;

    // Prevent overflow on right
    if (left + tooltipRect.width > viewportWidth - padding) {
      left = x - tooltipRect.width - padding;
    }

    // Prevent overflow on bottom
    if (top + tooltipRect.height > viewportHeight - padding) {
      top = y - tooltipRect.height - padding;
    }

    // Prevent overflow on left
    if (left < padding) {
      left = padding;
    }

    // Prevent overflow on top
    if (top < padding) {
      top = padding;
    }

    this.element.style.left = `${left}px`;
    this.element.style.top = `${top}px`;
  }

  /**
   * Update tooltip content
   * @param {Object} school - School data
   */
  updateContent(school) {
    const isPurdueSchool = isPurdue(school);
    const color = isPurdueSchool ? PURDUE_COLORS.gold : getConferenceColor(school.conference);

    // School name
    this.schoolEl.textContent = school.school;
    this.schoolEl.style.color = isPurdueSchool ? PURDUE_COLORS.gold : '';

    // Conference badge
    this.conferenceEl.textContent = school.conference;
    this.conferenceEl.style.backgroundColor = color;
    this.conferenceEl.style.color = '#0a0f1a';

    // Song name
    this.songEl.textContent = `"${school.song_name}"`;

    // Stats
    this.bpmEl.textContent = school.bpm;
    this.durationEl.textContent = school.sec_duration;
    this.tropesEl.textContent = school.trope_count;

    // Year
    this.yearEl.textContent = school.year ? `Since ${school.year}` : 'Year Unknown';

    // Purdue special styling
    if (isPurdueSchool) {
      this.element.style.borderColor = PURDUE_COLORS.gold;
      this.element.style.boxShadow = `0 0 20px ${PURDUE_COLORS.goldGlow}`;
    } else {
      this.element.style.borderColor = '';
      this.element.style.boxShadow = '';
    }
  }
}

// Create singleton instance
const tooltip = new Tooltip();

export default tooltip;
