/**
 * Conference Radar Chart Module
 * =============================
 * Small multiple radar charts showing conference fingerprints
 */

import { CONFERENCE_COLORS, generateConferenceStats } from './utils.js';
import { subscribe, hoverSchool, setConferenceFilter } from './state.js';

class RadarChart {
  constructor(containerId, schools) {
    this.container = document.getElementById(containerId);
    this.schools = schools;
    this.conferenceStats = generateConferenceStats(schools);

    // Configuration
    this.config = {
      dimensions: [
        { key: 'studentWriterRate', label: 'Student', max: 1, normalize: false },
        { key: 'spellingRate', label: 'Spelling', max: 1, normalize: false },
        { key: 'winWonRate', label: 'Win/Won', max: 1, normalize: false },
        { key: 'rahRate', label: 'Rah', max: 1, normalize: false },
        { key: 'avgTropes', label: 'Tropes', max: 8, normalize: true }
      ],
      levels: 5,
      labelOffset: 15,
      transitionDuration: 300
    };

    this.conferences = ['ACC', 'Big 12', 'Big Ten', 'Pac-12', 'SEC', 'Independent'];
    this.radarCharts = new Map();
    this.hoveredConference = null;

    this.init();
    this.setupStateListeners();
  }

  /**
   * Initialize the radar charts
   */
  init() {
    // Clear container
    this.container.innerHTML = '';

    // Create a radar for each conference
    this.conferences.forEach(conf => {
      const wrapper = document.createElement('div');
      wrapper.className = 'radar-item';
      wrapper.dataset.conference = conf;

      const svgContainer = document.createElement('div');
      svgContainer.className = 'radar-svg-container';
      svgContainer.style.cssText = 'width: 100%; height: calc(100% - 20px);';

      const label = document.createElement('span');
      label.className = 'radar-label';
      label.textContent = conf;
      label.style.color = CONFERENCE_COLORS[conf];

      wrapper.appendChild(svgContainer);
      wrapper.appendChild(label);
      this.container.appendChild(wrapper);

      // Create radar chart
      this.createRadar(svgContainer, conf);

      // Add hover events
      wrapper.addEventListener('mouseenter', () => this.handleHover(conf));
      wrapper.addEventListener('mouseleave', () => this.handleLeave());
      wrapper.addEventListener('click', () => this.handleClick(conf));
    });
  }

  /**
   * Create a single radar chart
   */
  createRadar(container, conference) {
    const data = this.conferenceStats[conference];
    const color = CONFERENCE_COLORS[conference];

    // Get container size with minimum fallback
    const rect = container.getBoundingClientRect();
    const size = Math.max(Math.min(rect.width || 100, rect.height || 100), 80);
    const radius = Math.max((size / 2) - 20, 20);
    const centerX = size / 2;
    const centerY = size / 2;

    // Create SVG
    const svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${size} ${size}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    const g = svg.append('g')
      .attr('transform', `translate(${centerX}, ${centerY})`);

    // Draw background levels
    for (let level = 1; level <= this.config.levels; level++) {
      const levelRadius = (radius / this.config.levels) * level;

      g.append('polygon')
        .attr('points', this.getPolygonPoints(levelRadius, this.config.dimensions.length))
        .attr('fill', 'none')
        .attr('stroke', 'rgba(255, 255, 255, 0.25)')
        .attr('stroke-width', 1);
    }

    // Draw axis lines
    const angleSlice = (Math.PI * 2) / this.config.dimensions.length;

    this.config.dimensions.forEach((dim, i) => {
      const angle = angleSlice * i - Math.PI / 2;

      g.append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', radius * Math.cos(angle))
        .attr('y2', radius * Math.sin(angle))
        .attr('stroke', 'rgba(255, 255, 255, 0.1)')
        .attr('stroke-width', 1);
    });

    // Calculate data polygon points
    const dataPoints = this.config.dimensions.map((dim, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      let value = data[dim.key];

      // Normalize value to 0-1 range
      if (dim.normalize) {
        value = value / dim.max;
      }

      // Clamp value
      value = Math.min(Math.max(value, 0), 1);

      const r = radius * value;
      return [r * Math.cos(angle), r * Math.sin(angle)];
    });

    // Draw data polygon
    const polygon = g.append('polygon')
      .attr('class', 'radar-data')
      .attr('points', dataPoints.map(p => p.join(',')).join(' '))
      .attr('fill', `${color}40`)
      .attr('stroke', color)
      .attr('stroke-width', 2);

    // Draw data points
    dataPoints.forEach((point) => {
      const isAcc = conference === 'ACC';
      g.append('circle')
        .attr('class', 'radar-point')
        .attr('cx', point[0])
        .attr('cy', point[1])
        .attr('r', 2.2)
        .attr('fill', color)
        .attr('opacity', isAcc ? 0.7 : 1);
    });

    // Store reference
    this.radarCharts.set(conference, { svg, g, polygon, color, radius });
  }

  /**
   * Get polygon points for a level
   */
  getPolygonPoints(radius, sides) {
    const angleSlice = (Math.PI * 2) / sides;
    const points = [];

    for (let i = 0; i < sides; i++) {
      const angle = angleSlice * i - Math.PI / 2;
      points.push([
        radius * Math.cos(angle),
        radius * Math.sin(angle)
      ]);
    }

    return points.map(p => p.join(',')).join(' ');
  }

  /**
   * Handle hover on conference
   */
  handleHover(conference) {
    this.hoveredConference = conference;

    // Highlight this radar
    this.highlightRadar(conference);

    // Notify state (will trigger map highlight)
    // Instead of hovering a specific school, we set active conference
  }

  /**
   * Handle leave
   */
  handleLeave() {
    this.hoveredConference = null;
    this.unhighlightRadar();
  }

  /**
   * Handle click
   */
  handleClick(conference) {
    setConferenceFilter(conference);
  }

  /**
   * Highlight a radar chart
   */
  highlightRadar(conference) {
    // Dim other radars
    this.radarCharts.forEach((chart, conf) => {
      const wrapper = this.container.querySelector(`[data-conference="${conf}"]`);
      if (conf === conference) {
        wrapper.style.opacity = '1';
        chart.polygon.attr('stroke-width', 3);
      } else {
        wrapper.style.opacity = '0.4';
      }
    });
  }

  /**
   * Remove radar highlight
   */
  unhighlightRadar() {
    this.radarCharts.forEach((chart, conf) => {
      const wrapper = this.container.querySelector(`[data-conference="${conf}"]`);
      wrapper.style.opacity = '1';
      chart.polygon.attr('stroke-width', 2);
    });
  }

  /**
   * Setup state listeners
   */
  setupStateListeners() {
    // Listen for conference filter changes
    subscribe('activeConference', (conference) => {
      if (conference === 'all') {
        this.unhighlightRadar();
      } else {
        this.highlightRadar(conference);
      }
    });
  }

  /**
   * Update visualization
   */
  update(state) {
    // Conference filter is handled by state listener
  }
}

export default RadarChart;
