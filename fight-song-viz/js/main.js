/**
 * Main Application Entry Point
 * ============================
 * Orchestrates all visualization modules and handles global interactions
 */

import { loadJSON, generateConferenceStats, CONFERENCE_COLORS, PURDUE_COLORS } from './utils.js';
import { initializeState, subscribe, setConferenceFilter, setMatrixSort, registerModule, getState, getPurdue } from './state.js';
import EnergyGalaxy from './galaxy.js';
import USAMap from './map.js';
import RadarChart from './radar.js';
import ScatterPlot from './scatter.js';
import TropeMatrix from './matrix.js';
import PosterGalaxy, { initPoster } from './poster.js';
import NetworkGraph from './network.js';
import ParallelCoordinates from './parallel.js';
import FightSongClock from './clock.js';

/**
 * Application class
 */
class FightSongViz {
  constructor() {
    this.schools = [];
    this.conferences = {};
    this.modules = {};
    this.isLoaded = false;
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      // Show loading state
      this.showLoading();

      // Load data
      await this.loadData();

      // Initialize state
      initializeState(this.schools, this.conferences);

      // Initialize all visualization modules
      await this.initModules();

      // Setup UI controls
      this.setupControls();

      // Setup scroll effects
      this.setupScrollEffects();

      // Populate dynamic content
      this.populateContent();

      // Hide loading, show content
      this.hideLoading();

      // Trigger entrance animations
      this.playEntranceAnimations();

      this.isLoaded = true;
      console.log('Fight Song Viz initialized successfully');

    } catch (error) {
      console.error('Failed to initialize application:', error);
      this.showError(error);
    }
  }

  /**
   * Load all required data
   */
  async loadData() {
    // Load schools data
    this.schools = await loadJSON('./data/schools.json');

    // Generate conference stats from schools data
    this.conferences = generateConferenceStats(this.schools);

    console.log(`Loaded ${this.schools.length} schools across ${Object.keys(this.conferences).length} conferences`);
  }

  /**
   * Initialize all visualization modules
   */
  async initModules() {
    // ACT 1: Energy Galaxy
    this.modules.galaxy = new EnergyGalaxy('galaxy-canvas', this.schools);
    registerModule('galaxy', this.modules.galaxy);

    // ACT 2: Dashboard modules
    // USA Map
    this.modules.map = new USAMap('map-container', this.schools);
    registerModule('map', this.modules.map);

    // Conference Radar Charts
    this.modules.radar = new RadarChart('radar-container', this.schools);
    registerModule('radar', this.modules.radar);

    // Scatter Plot
    this.modules.scatter = new ScatterPlot('scatter-container', this.schools);
    registerModule('scatter', this.modules.scatter);

    // Trope Matrix
    this.modules.matrix = new TropeMatrix('matrix-container', this.schools);
    registerModule('matrix', this.modules.matrix);

    // Similarity Network
    this.modules.network = new NetworkGraph('network-container', this.schools);
    registerModule('network', this.modules.network);

    // Parallel Coordinates
    this.modules.parallel = new ParallelCoordinates('parallel-container', this.schools);
    registerModule('parallel', this.modules.parallel);

    // Tempo Clock
    this.modules.clock = new FightSongClock('clock-container', this.schools);
    registerModule('clock', this.modules.clock);

    // ACT 3: Poster Mini Galaxy
    this.modules.posterGalaxy = new PosterGalaxy('mini-galaxy-container', this.schools);
    registerModule('posterGalaxy', this.modules.posterGalaxy);

    console.log('All visualization modules initialized');
  }

  /**
   * Setup UI controls
   */
  setupControls() {
    // Conference filter - using <select> element
    const conferenceSelect = document.getElementById('conference-filter');
    if (conferenceSelect) {
      conferenceSelect.addEventListener('change', (e) => {
        setConferenceFilter(e.target.value);
      });
    }

    // Matrix sort dropdown
    const sortSelect = document.getElementById('matrix-sort');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        setMatrixSort(e.target.value);
      });
    }

    // Click outside to deselect
    document.addEventListener('click', (e) => {
      // Check if click is outside any visualization
      const isOutside = !e.target.closest('.glass-panel') &&
                        !e.target.closest('#galaxy-canvas') &&
                        !e.target.closest('#tooltip');

      if (isOutside && getState('selectedSchool')) {
        // Deselect school
        import('./state.js').then(state => state.selectSchool(null));
      }
    });

    console.log('UI controls initialized');
  }

  /**
   * Setup scroll-based effects
   */
  setupScrollEffects() {
    // Use GSAP ScrollTrigger if available
    if (typeof gsap !== 'undefined' && gsap.registerPlugin) {
      gsap.registerPlugin(ScrollTrigger);

      // ACT 1 to ACT 2 transition
      ScrollTrigger.create({
        trigger: '#act-2',
        start: 'top 80%',
        onEnter: () => {
          document.getElementById('act-2')?.classList.add('visible');
        }
      });

      // ACT 3 entrance
      ScrollTrigger.create({
        trigger: '#act-3',
        start: 'top 80%',
        onEnter: () => {
          document.getElementById('act-3')?.classList.add('visible');
          this.animatePosterStats();
        }
      });

      // Parallax effect on galaxy
      gsap.to('#galaxy-canvas', {
        yPercent: 20,
        ease: 'none',
        scrollTrigger: {
          trigger: '#act-1',
          start: 'top top',
          end: 'bottom top',
          scrub: 0.5
        }
      });

    } else {
      // Fallback: Use Intersection Observer
      const act2 = document.getElementById('act-2');
      const act3 = document.getElementById('act-3');

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');

            if (entry.target.id === 'act-3') {
              this.animatePosterStats();
            }
          }
        });
      }, { threshold: 0.2 });

      if (act2) observer.observe(act2);
      if (act3) observer.observe(act3);
    }
  }

  /**
   * Populate dynamic content
   */
  populateContent() {
    // Populate galaxy legend
    this.populateGalaxyLegend();

    // Populate conference filter buttons (ensure colors match)
    this.styleFilterButtons();

    // Setup school info card subscription
    this.setupSchoolCardSubscription();

    // Populate poster stats
    this.populatePosterStats();
  }

  /**
   * Populate galaxy legend
   */
  populateGalaxyLegend() {
    const legendList = document.getElementById('galaxy-legend-list');
    if (!legendList) return;

    const legendItems = [
      { color: PURDUE_COLORS.gold, label: 'Purdue (Center)' },
      { color: CONFERENCE_COLORS['Big Ten'], label: 'Big Ten' },
      { color: CONFERENCE_COLORS['SEC'], label: 'SEC' },
      { color: CONFERENCE_COLORS['ACC'], label: 'ACC' },
      { color: CONFERENCE_COLORS['Big 12'], label: 'Big 12' },
      { color: CONFERENCE_COLORS['Pac-12'], label: 'Pac-12' },
      { color: CONFERENCE_COLORS['Independent'], label: 'Independent' }
    ];

    legendList.innerHTML = legendItems.map(item => `
      <li class="legend-item">
        <span class="legend-dot" style="background-color: ${item.color}"></span>
        <span class="legend-label">${item.label}</span>
      </li>
    `).join('');
  }

  /**
   * Style filter buttons with conference colors
   */
  styleFilterButtons() {
    const filterButtons = document.querySelectorAll('.filter-btn[data-conference]');
    filterButtons.forEach(btn => {
      const conf = btn.dataset.conference;
      if (conf !== 'all' && CONFERENCE_COLORS[conf]) {
        btn.style.setProperty('--conf-color', CONFERENCE_COLORS[conf]);
      }
    });
  }

  /**
   * Populate school info card
   */
  populateSchoolCard(school) {
    const card = document.getElementById('school-info-card');
    if (!card) return;

    if (!school) {
      // Show placeholder
      card.classList.remove('active');
      card.innerHTML = `
        <div class="info-placeholder">
          <span class="placeholder-icon">&#9834;</span>
          <span class="placeholder-text">Hover over a school to see details</span>
        </div>
      `;
      return;
    }

    // Show school info
    card.classList.add('active');
    card.innerHTML = `
      <div class="school-info-active">
        <h4 class="info-school-name" style="color: ${school.school === 'Purdue' ? PURDUE_COLORS.gold : ''}">${school.school}</h4>
        <p class="info-song-name">"${school.song_name}"</p>
        <div class="info-stats">
          <div class="info-stat">
            <span class="info-stat-value">${school.bpm}</span>
            <span class="info-stat-label">BPM</span>
          </div>
          <div class="info-stat">
            <span class="info-stat-value">${school.sec_duration}s</span>
            <span class="info-stat-label">Duration</span>
          </div>
          <div class="info-stat">
            <span class="info-stat-value">${school.trope_count}</span>
            <span class="info-stat-label">Tropes</span>
          </div>
        </div>
        <p class="info-year">${school.year ? `Est. ${school.year}` : 'Year Unknown'}</p>
      </div>
    `;
  }

  /**
   * Setup school info card subscription (call once)
   */
  setupSchoolCardSubscription() {
    // Default school (Purdue or first school)
    const defaultSchool = this.schools.find(s => s.school === 'Purdue') || this.schools[0];
    let currentDisplayedSchool = null;
    let selectedSchool = null;

    // Show default school initially
    if (defaultSchool) {
      this.populateSchoolCard(defaultSchool);
      currentDisplayedSchool = defaultSchool;
    }

    subscribe('hoveredSchool', (school) => {
      if (school) {
        // Show hovered school
        this.populateSchoolCard(school);
        currentDisplayedSchool = school;
      } else if (!selectedSchool) {
        // No hover and no selection - revert to default
        this.populateSchoolCard(defaultSchool);
        currentDisplayedSchool = defaultSchool;
      } else {
        // No hover but there's a selection - show selected
        this.populateSchoolCard(selectedSchool);
        currentDisplayedSchool = selectedSchool;
      }
    });

    subscribe('selectedSchool', (school) => {
      selectedSchool = school;
      if (school) {
        this.populateSchoolCard(school);
        currentDisplayedSchool = school;
      } else if (currentDisplayedSchool) {
        // Selection cleared - revert to default
        this.populateSchoolCard(defaultSchool);
        currentDisplayedSchool = defaultSchool;
      }
    });
  }

  /**
   * Populate poster statistics
   */
  populatePosterStats() {
    const purdue = getPurdue();
    if (!purdue) return;

    // Calculate Purdue's rankings
    const bpmRank = this.schools.filter(s => s.bpm > purdue.bpm).length + 1;
    const tropeRank = this.schools.filter(s => s.trope_count > purdue.trope_count).length + 1;
    const bigTenSchools = this.schools.filter(s => s.conference === 'Big Ten');
    const bigTenBpmRank = bigTenSchools.filter(s => s.bpm > purdue.bpm).length + 1;

    // Update poster stats
    const statsContainer = document.querySelector('.poster-stats');
    if (statsContainer) {
      statsContainer.innerHTML = `
        <div class="poster-stat">
          <span class="poster-stat-value" data-target="${purdue.bpm}">0</span>
          <span class="poster-stat-label">BPM</span>
          <span class="poster-stat-rank">#${bpmRank} Overall</span>
        </div>
        <div class="poster-stat">
          <span class="poster-stat-value" data-target="${purdue.sec_duration}">0</span>
          <span class="poster-stat-label">Seconds</span>
          <span class="poster-stat-rank">Duration</span>
        </div>
        <div class="poster-stat">
          <span class="poster-stat-value" data-target="${purdue.trope_count}">0</span>
          <span class="poster-stat-label">Tropes</span>
          <span class="poster-stat-rank">#${tropeRank} Overall</span>
        </div>
        <div class="poster-stat highlight">
          <span class="poster-stat-value" data-target="${bigTenBpmRank}">0</span>
          <span class="poster-stat-label">in Big Ten</span>
          <span class="poster-stat-rank">Tempo Rank</span>
        </div>
      `;
    }

    // Update Purdue info in poster
    const purdueInfo = document.querySelector('.purdue-poster-info');
    if (purdueInfo) {
      purdueInfo.innerHTML = `
        <h3>"${purdue.song_name}"</h3>
        <p class="song-year">Written ${purdue.year || 'Unknown'}</p>
        <p class="song-writers">${purdue.writers || 'Unknown'}</p>
      `;
    }
  }

  /**
   * Animate poster statistics
   */
  animatePosterStats() {
    const statValues = document.querySelectorAll('.poster-stat-value[data-target]');

    statValues.forEach(el => {
      const target = parseInt(el.dataset.target, 10);
      const duration = 1500;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(eased * target);

        el.textContent = current;

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      animate();
    });
  }

  /**
   * Play entrance animations
   */
  playEntranceAnimations() {
    // Animate galaxy stats numbers
    this.animateGalaxyStats();

    if (typeof gsap !== 'undefined') {
      // Galaxy header animation
      gsap.from('.galaxy-header', {
        y: -50,
        opacity: 0,
        duration: 1,
        ease: 'power3.out'
      });

      // Stats animation
      gsap.from('.stat-card', {
        y: 30,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power2.out',
        delay: 0.5
      });

      // Scroll indicator
      gsap.from('.scroll-indicator', {
        opacity: 0,
        y: 20,
        duration: 1,
        delay: 1.5
      });

      // Pulse animation for scroll indicator
      gsap.to('.scroll-indicator', {
        y: 10,
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut',
        delay: 2.5
      });

    } else {
      // CSS fallback - add visible class
      document.querySelectorAll('.galaxy-header, .stat-card, .scroll-indicator')
        .forEach(el => el.classList.add('visible'));
    }
  }

  /**
   * Animate galaxy stats numbers
   */
  animateGalaxyStats() {
    const statValues = document.querySelectorAll('.galaxy-stats .stat-value[data-value]');

    statValues.forEach((el, index) => {
      const target = parseInt(el.dataset.value, 10);
      const duration = 2000;
      const delay = 500 + (index * 200);

      setTimeout(() => {
        const startTime = Date.now();

        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);

          // Ease out cubic
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = Math.round(eased * target);

          el.textContent = current;

          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        };

        animate();
      }, delay);
    });
  }

  /**
   * Show loading state
   */
  showLoading() {
    const loader = document.getElementById('loader');
    if (loader) {
      loader.style.display = 'flex';
    }
  }

  /**
   * Hide loading state
   */
  hideLoading() {
    const loader = document.getElementById('loader');
    if (loader) {
      gsap?.to(loader, {
        opacity: 0,
        duration: 0.5,
        onComplete: () => {
          loader.style.display = 'none';
        }
      }) || (loader.style.display = 'none');
    }

    // Show main content
    document.body.classList.add('loaded');
  }

  /**
   * Show error state
   */
  showError(error) {
    const loader = document.getElementById('loader');
    if (loader) {
      loader.innerHTML = `
        <div class="error-state">
          <h2>Failed to Load</h2>
          <p>${error.message}</p>
          <button onclick="location.reload()">Retry</button>
        </div>
      `;
    }
  }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new FightSongViz();
  app.init();

  // Expose for debugging
  window.__APP__ = app;
});

export default FightSongViz;
