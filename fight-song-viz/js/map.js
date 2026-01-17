/**
 * USA Map Module
 * ==============
 * D3-based map showing geographic distribution of schools
 */

import { getConferenceColor, isPurdue, PURDUE_COLORS } from './utils.js';
import { subscribe, hoverSchool, selectSchool, getState } from './state.js';
import tooltip from './tooltip.js';

class USAMap {
  constructor(containerId, schools) {
    this.container = document.getElementById(containerId);
    this.schools = schools;
    this.svg = null;
    this.projection = null;
    this.hoveredSchool = null;
    this.selectedSchool = null;

    // Configuration
    this.config = {
      baseRadius: 5,
      radiusMultiplier: 1.5,
      purdueRadius: 12,
      transitionDuration: 300
    };

    this.init();
    this.setupStateListeners();
  }

  /**
   * Initialize the map
   */
  async init() {
    // Get container dimensions
    const rect = this.container.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height || 500;

    // Create SVG
    this.svg = d3.select(this.container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${this.width} ${this.height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    // Add defs for filters
    this.addDefs();

    // Create groups
    this.statesGroup = this.svg.append('g')
      .attr('class', 'states-layer')
      .attr('transform', 'translate(0, 163)');
    this.schoolsGroup = this.svg.append('g').attr('class', 'schools-layer');

    // Setup projection
    this.projection = d3.geoAlbersUsa()
      .scale(this.width * 1.1)
      .translate([this.width / 2, this.height / 2]);

    // Load and draw map
    await this.loadAndDrawMap();

    // Draw schools
    this.drawSchools();

    // Setup resize handler
    this.setupResize();
  }

  /**
   * Add SVG defs (filters, gradients)
   */
  addDefs() {
    const defs = this.svg.append('defs');

    // Glow filter for Purdue
    const glowFilter = defs.append('filter')
      .attr('id', 'purdue-glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');

    glowFilter.append('feGaussianBlur')
      .attr('stdDeviation', '4')
      .attr('result', 'coloredBlur');

    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Glow filter for hover
    const hoverFilter = defs.append('filter')
      .attr('id', 'hover-glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');

    hoverFilter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'coloredBlur');

    const hoverMerge = hoverFilter.append('feMerge');
    hoverMerge.append('feMergeNode').attr('in', 'coloredBlur');
    hoverMerge.append('feMergeNode').attr('in', 'SourceGraphic');
  }

  /**
   * Load TopoJSON and draw states
   */
  async loadAndDrawMap() {
    try {
      // Use D3's built-in US atlas
      const us = await d3.json('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json');

      const path = d3.geoPath().projection(this.projection);

      // Draw states
      this.statesGroup.selectAll('path')
        .data(topojson.feature(us, us.objects.states).features)
        .join('path')
        .attr('class', 'state')
        .attr('d', path)
        .attr('fill', '#111827')
        .attr('stroke', '#1f2937')
        .attr('stroke-width', 0.5);

    } catch (error) {
      console.error('Failed to load map data:', error);
      // Fallback: just show schools without map background
    }
  }

  /**
   * Draw school markers
   */
  drawSchools() {
    // Sort schools so Purdue is drawn last (on top)
    const sortedSchools = [...this.schools].sort((a, b) => {
      if (isPurdue(a)) return 1;
      if (isPurdue(b)) return -1;
      return 0;
    });

    // Create school groups
    const schoolGroups = this.schoolsGroup.selectAll('g.school')
      .data(sortedSchools, d => d.school)
      .join('g')
      .attr('class', d => `school ${isPurdue(d) ? 'purdue' : ''}`)
      .attr('transform', d => {
        const coords = this.projection([d.lng, d.lat]);
        if (!coords) return 'translate(-1000, -1000)'; // Hide if outside projection
        return `translate(${coords[0]}, ${coords[1]})`;
      })
      .style('cursor', 'pointer')
      .on('mouseenter', (event, d) => this.handleMouseEnter(event, d))
      .on('mousemove', (event, d) => this.handleMouseMove(event, d))
      .on('mouseleave', (event, d) => this.handleMouseLeave(event, d))
      .on('click', (event, d) => this.handleClick(event, d));

    // Draw glow circle
    schoolGroups.append('circle')
      .attr('class', 'school-glow')
      .attr('r', d => this.getRadius(d) * 2)
      .attr('fill', d => isPurdue(d) ? PURDUE_COLORS.goldGlow : `${getConferenceColor(d.conference)}33`)
      .attr('opacity', d => isPurdue(d) ? 0.6 : 0.5);

    // Draw main circle
    schoolGroups.append('circle')
      .attr('class', 'school-core')
      .attr('r', d => this.getRadius(d))
      .attr('fill', d => isPurdue(d) ? PURDUE_COLORS.gold : getConferenceColor(d.conference))
      .attr('stroke', d => isPurdue(d) ? PURDUE_COLORS.goldLight : 'rgba(255,255,255,0.3)')
      .attr('stroke-width', d => isPurdue(d) ? 2 : 1);

    // Apply Purdue glow filter
    this.schoolsGroup.selectAll('g.school.purdue')
      .attr('filter', 'url(#purdue-glow)');

    // Animate Purdue pulse
    this.animatePurduePulse();
  }

  /**
   * Get radius for a school marker
   */
  getRadius(school) {
    if (isPurdue(school)) {
      return this.config.purdueRadius;
    }
    return this.config.baseRadius + school.trope_count * this.config.radiusMultiplier;
  }

  /**
   * Animate Purdue marker pulse
   */
  animatePurduePulse() {
    const purdueGlow = this.schoolsGroup.select('g.school.purdue .school-glow');

    if (!purdueGlow.empty()) {
      const pulseAnimation = () => {
        purdueGlow
          .transition()
          .duration(1000)
          .attr('r', this.config.purdueRadius * 3)
          .attr('opacity', 0.3)
          .transition()
          .duration(1000)
          .attr('r', this.config.purdueRadius * 2)
          .attr('opacity', 0.6)
          .on('end', pulseAnimation);
      };

      pulseAnimation();
    }
  }

  /**
   * Handle mouse enter
   */
  handleMouseEnter(event, school) {
    this.hoveredSchool = school;
    hoverSchool(school);

    // Highlight this school
    this.highlightSchool(school);

    // Show tooltip
    tooltip.show(school, event.clientX, event.clientY);
  }

  /**
   * Handle mouse move
   */
  handleMouseMove(event, school) {
    tooltip.move(event.clientX, event.clientY);
  }

  /**
   * Handle mouse leave
   */
  handleMouseLeave(event, school) {
    this.hoveredSchool = null;
    hoverSchool(null);

    // Remove highlight
    this.unhighlightSchool(school);

    // Hide tooltip
    tooltip.hide();
  }

  /**
   * Handle click
   */
  handleClick(event, school) {
    event.stopPropagation();
    this.selectedSchool = school;
    selectSchool(school);
  }

  /**
   * Highlight a school marker
   */
  highlightSchool(school) {
    const group = this.schoolsGroup.selectAll('g.school')
      .filter(d => d.school === school.school);

    // Apply hover filter
    if (!isPurdue(school)) {
      group.attr('filter', 'url(#hover-glow)');
    }

    // Scale up
    group.select('.school-core')
      .transition()
      .duration(150)
      .attr('r', this.getRadius(school) * 1.5);

    group.select('.school-glow')
      .transition()
      .duration(150)
      .attr('r', this.getRadius(school) * 3)
      .attr('opacity', 0.7);

    // Dim other schools
    this.schoolsGroup.selectAll('g.school')
      .filter(d => d.school !== school.school)
      .transition()
      .duration(150)
      .style('opacity', 0.3);
  }

  /**
   * Remove highlight from school
   */
  unhighlightSchool(school) {
    const group = this.schoolsGroup.selectAll('g.school')
      .filter(d => d.school === school.school);

    // Remove hover filter (keep Purdue filter)
    if (!isPurdue(school)) {
      group.attr('filter', null);
    }

    // Reset size
    group.select('.school-core')
      .transition()
      .duration(150)
      .attr('r', this.getRadius(school));

    group.select('.school-glow')
      .transition()
      .duration(150)
      .attr('r', this.getRadius(school) * 2)
      .attr('opacity', isPurdue(school) ? 0.6 : 0.5);

    // Restore other schools
    this.schoolsGroup.selectAll('g.school')
      .transition()
      .duration(150)
      .style('opacity', 1);
  }

  /**
   * Setup state listeners
   */
  setupStateListeners() {
    // Listen for conference filter changes
    subscribe('activeConference', (conference) => {
      this.filterByConference(conference);
    });

    // Listen for external hover
    subscribe('hoveredSchool', (school) => {
      if (school && school !== this.hoveredSchool) {
        this.externalHighlight(school);
      } else if (!school && this.hoveredSchool) {
        this.externalUnhighlight();
      }
    });

    // Listen for selection
    subscribe('selectedSchool', (school) => {
      this.selectedSchool = school;
    });
  }

  /**
   * Filter schools by conference
   */
  filterByConference(conference) {
    const isAll = conference === 'all';

    this.schoolsGroup.selectAll('g.school')
      .transition()
      .duration(this.config.transitionDuration)
      .style('opacity', d => {
        if (isAll || d.conference === conference) return 1;
        return 0.15;
      });
  }

  /**
   * Highlight school from external source
   */
  externalHighlight(school) {
    // Dim all schools
    this.schoolsGroup.selectAll('g.school')
      .transition()
      .duration(150)
      .style('opacity', d => d.school === school.school ? 1 : 0.3);

    // Highlight the target
    const group = this.schoolsGroup.selectAll('g.school')
      .filter(d => d.school === school.school);

    group.select('.school-core')
      .transition()
      .duration(150)
      .attr('r', this.getRadius(school) * 1.3);
  }

  /**
   * Remove external highlight
   */
  externalUnhighlight() {
    // Restore all schools based on current filter
    const conference = getState('activeConference') || 'all';
    this.filterByConference(conference);

    // Reset sizes
    this.schoolsGroup.selectAll('g.school')
      .each((d, i, nodes) => {
        d3.select(nodes[i]).select('.school-core')
          .transition()
          .duration(150)
          .attr('r', this.getRadius(d));
      });
  }

  /**
   * Setup resize handler
   */
  setupResize() {
    const resizeObserver = new ResizeObserver(() => {
      const rect = this.container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        this.width = rect.width;
        this.height = rect.height;

        this.svg.attr('viewBox', `0 0 ${this.width} ${this.height}`);

        this.projection
          .scale(this.width * 1.1)
          .translate([this.width / 2, this.height / 2]);

        // Update school positions
        this.schoolsGroup.selectAll('g.school')
          .attr('transform', d => {
            const coords = this.projection([d.lng, d.lat]);
            if (!coords) return 'translate(-1000, -1000)';
            return `translate(${coords[0]}, ${coords[1]})`;
          });
      }
    });

    resizeObserver.observe(this.container);
  }

  /**
   * Update visualization
   */
  update(state) {
    if (state.activeConference) {
      this.filterByConference(state.activeConference);
    }
  }
}

export default USAMap;
