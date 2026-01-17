/**
 * Scatter Plot Module
 * ===================
 * Tempo vs Duration scatter plot showing energy distribution
 */

import { getConferenceColor, isPurdue, PURDUE_COLORS } from './utils.js';
import { subscribe, hoverSchool, selectSchool, getState } from './state.js';
import tooltip from './tooltip.js';

class ScatterPlot {
  constructor(containerId, schools) {
    this.container = document.getElementById(containerId);
    this.schools = schools;
    this.svg = null;
    this.xScale = null;
    this.yScale = null;
    this.hoveredSchool = null;

    // Configuration
    this.config = {
      margin: { top: 30, right: 30, bottom: 50, left: 50 },
      baseRadius: 4,
      radiusMultiplier: 1,
      purdueRadius: 10,
      transitionDuration: 300,
      quadrantLabels: [
        { x: 0.25, y: 0.75, text: 'Epic', subtext: 'Slow & Long' },
        { x: 0.75, y: 0.75, text: 'Intense', subtext: 'Fast & Long' },
        { x: 0.25, y: 0.25, text: 'Lyrical', subtext: 'Slow & Short' },
        { x: 0.75, y: 0.25, text: 'Explosive', subtext: 'Fast & Short' }
      ]
    };

    this.init();
    this.setupStateListeners();
  }

  /**
   * Initialize the scatter plot
   */
  init() {
    // Get container dimensions
    const rect = this.container.getBoundingClientRect();
    this.width = rect.width || 400;
    this.height = rect.height || 250;

    const innerWidth = this.width - this.config.margin.left - this.config.margin.right;
    const innerHeight = this.height - this.config.margin.top - this.config.margin.bottom;

    // Create SVG
    this.svg = d3.select(this.container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${this.width} ${this.height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    // Add defs
    this.addDefs();

    // Create main group
    this.g = this.svg.append('g')
      .attr('transform', `translate(${this.config.margin.left}, ${this.config.margin.top})`);

    // Create scales
    const bpmExtent = d3.extent(this.schools, d => d.bpm);
    const durationExtent = d3.extent(this.schools, d => d.sec_duration);

    this.xScale = d3.scaleLinear()
      .domain([Math.floor(bpmExtent[0] / 10) * 10 - 10, Math.ceil(bpmExtent[1] / 10) * 10 + 10])
      .range([0, innerWidth]);

    this.yScale = d3.scaleLinear()
      .domain([0, Math.ceil(durationExtent[1] / 20) * 20 + 20])
      .range([innerHeight, 0]);

    // Draw quadrant backgrounds
    this.drawQuadrants(innerWidth, innerHeight);

    // Draw axes
    this.drawAxes(innerWidth, innerHeight);

    // Draw points
    this.drawPoints();

    // Draw Purdue label
    this.drawPurdueLabel();

    // Setup resize
    this.setupResize();
  }

  /**
   * Add SVG defs
   */
  addDefs() {
    const defs = this.svg.append('defs');

    // Glow filter for Purdue
    const glowFilter = defs.append('filter')
      .attr('id', 'scatter-purdue-glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');

    glowFilter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'coloredBlur');

    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
  }

  /**
   * Draw quadrant backgrounds and labels
   */
  drawQuadrants(innerWidth, innerHeight) {
    // Quadrant dividers
    const midX = innerWidth / 2;
    const midY = innerHeight / 2;

    // Vertical line
    this.g.append('line')
      .attr('x1', midX)
      .attr('y1', 0)
      .attr('x2', midX)
      .attr('y2', innerHeight)
      .attr('stroke', 'rgba(255, 255, 255, 0.35)')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,4');

    // Horizontal line
    this.g.append('line')
      .attr('x1', 0)
      .attr('y1', midY)
      .attr('x2', innerWidth)
      .attr('y2', midY)
      .attr('stroke', 'rgba(255, 255, 255, 0.35)')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,4');

    // Quadrant labels
    this.config.quadrantLabels.forEach(label => {
      const labelGroup = this.g.append('g')
        .attr('class', 'quadrant-label')
        .attr('transform', `translate(${label.x * innerWidth}, ${(1 - label.y) * innerHeight})`);

      labelGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('fill', '#ffffff')
        .attr('font-size', '12px')
        .attr('font-weight', '600')
        .text(label.text);

      labelGroup.append('text')
        .attr('y', 14)
        .attr('text-anchor', 'middle')
        .attr('fill', '#ffffff')
        .attr('font-size', '9px')
        .text(label.subtext);
    });
  }

  /**
   * Draw axes
   */
  drawAxes(innerWidth, innerHeight) {
    // X axis
    const xAxis = d3.axisBottom(this.xScale)
      .ticks(5)
      .tickSize(-innerHeight)
      .tickPadding(10);

    this.g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(xAxis)
      .call(g => {
        g.select('.domain').remove();
        g.selectAll('.tick line')
          .attr('stroke', 'rgba(255, 255, 255, 0.35)');
        g.selectAll('.tick text')
          .attr('fill', '#ffffff')
          .attr('font-size', '10px');
      });

    // X axis label
    this.g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 40)
      .attr('text-anchor', 'middle')
      .attr('fill', '#ffffff')
      .attr('font-size', '11px')
      .text('BPM (Tempo)');

    // Y axis
    const yAxis = d3.axisLeft(this.yScale)
      .ticks(5)
      .tickSize(-innerWidth)
      .tickPadding(10);

    this.g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis)
      .call(g => {
        g.select('.domain').remove();
        g.selectAll('.tick line')
          .attr('stroke', 'rgba(255, 255, 255, 0.35)');
        g.selectAll('.tick text')
          .attr('fill', '#ffffff')
          .attr('font-size', '10px');
      });

    // Y axis label
    this.g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -35)
      .attr('text-anchor', 'middle')
      .attr('fill', '#ffffff')
      .attr('font-size', '11px')
      .text('Duration (seconds)');
  }

  /**
   * Draw scatter points
   */
  drawPoints() {
    // Sort schools so Purdue is drawn last
    const sortedSchools = [...this.schools].sort((a, b) => {
      if (isPurdue(a)) return 1;
      if (isPurdue(b)) return -1;
      return 0;
    });

    // Create points group
    this.pointsGroup = this.g.append('g').attr('class', 'points-layer');

    // Draw points
    const points = this.pointsGroup.selectAll('circle.point')
      .data(sortedSchools, d => d.school)
      .join('circle')
      .attr('class', d => `point ${isPurdue(d) ? 'purdue' : ''}`)
      .attr('cx', d => this.xScale(d.bpm))
      .attr('cy', d => this.yScale(d.sec_duration))
      .attr('r', d => this.getRadius(d))
      .attr('fill', d => isPurdue(d) ? PURDUE_COLORS.gold : getConferenceColor(d.conference))
      .attr('stroke', d => isPurdue(d) ? PURDUE_COLORS.goldLight : 'rgba(255,255,255,0.2)')
      .attr('stroke-width', d => isPurdue(d) ? 2 : 1)
      .attr('opacity', 0.85)
      .style('cursor', 'pointer')
      .on('mouseenter', (event, d) => this.handleMouseEnter(event, d))
      .on('mousemove', (event, d) => this.handleMouseMove(event, d))
      .on('mouseleave', (event, d) => this.handleMouseLeave(event, d))
      .on('click', (event, d) => this.handleClick(event, d));

    // Apply Purdue glow
    this.pointsGroup.select('circle.point.purdue')
      .attr('filter', 'url(#scatter-purdue-glow)');
  }

  /**
   * Draw Purdue label
   */
  drawPurdueLabel() {
    const purdue = this.schools.find(s => isPurdue(s));
    if (!purdue) return;

    const x = this.xScale(purdue.bpm);
    const y = this.yScale(purdue.sec_duration);

    // Label with line
    const labelGroup = this.g.append('g')
      .attr('class', 'purdue-label');

    // Connector line
    labelGroup.append('line')
      .attr('x1', x + this.config.purdueRadius)
      .attr('y1', y)
      .attr('x2', x + 40)
      .attr('y2', y - 30)
      .attr('stroke', PURDUE_COLORS.gold)
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,2')
      .attr('opacity', 0.6);

    // Label text
    labelGroup.append('text')
      .attr('x', x + 45)
      .attr('y', y - 35)
      .attr('fill', PURDUE_COLORS.gold)
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .text('Hail Purdue');

    labelGroup.append('text')
      .attr('x', x + 45)
      .attr('y', y - 22)
      .attr('fill', '#ffffff')
      .attr('font-size', '9px')
      .text('#2 Fastest in Big Ten');
  }

  /**
   * Get radius for a point
   */
  getRadius(school) {
    if (isPurdue(school)) {
      return this.config.purdueRadius;
    }
    return this.config.baseRadius + school.trope_count * this.config.radiusMultiplier;
  }

  /**
   * Handle mouse enter
   */
  handleMouseEnter(event, school) {
    this.hoveredSchool = school;
    hoverSchool(school);

    // Highlight this point
    this.highlightPoint(school);

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
    this.unhighlightPoint(school);

    // Hide tooltip
    tooltip.hide();
  }

  /**
   * Handle click
   */
  handleClick(event, school) {
    event.stopPropagation();
    selectSchool(school);
  }

  /**
   * Highlight a point
   */
  highlightPoint(school) {
    // Dim other points
    this.pointsGroup.selectAll('circle.point')
      .transition()
      .duration(150)
      .attr('opacity', d => d.school === school.school ? 1 : 0.2);

    // Enlarge this point
    this.pointsGroup.selectAll('circle.point')
      .filter(d => d.school === school.school)
      .transition()
      .duration(150)
      .attr('r', this.getRadius(school) * 1.5);
  }

  /**
   * Remove highlight
   */
  unhighlightPoint(school) {
    const conference = getState('activeConference') || 'all';

    // Restore opacity based on filter
    this.pointsGroup.selectAll('circle.point')
      .transition()
      .duration(150)
      .attr('opacity', d => {
        if (conference === 'all' || d.conference === conference) return 0.85;
        return 0.15;
      })
      .attr('r', d => this.getRadius(d));
  }

  /**
   * Setup state listeners
   */
  setupStateListeners() {
    // Listen for conference filter
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
  }

  /**
   * Filter by conference
   */
  filterByConference(conference) {
    const isAll = conference === 'all';

    this.pointsGroup.selectAll('circle.point')
      .transition()
      .duration(this.config.transitionDuration)
      .attr('opacity', d => {
        if (isAll || d.conference === conference) return 0.85;
        return 0.15;
      });
  }

  /**
   * External highlight
   */
  externalHighlight(school) {
    this.pointsGroup.selectAll('circle.point')
      .transition()
      .duration(150)
      .attr('opacity', d => d.school === school.school ? 1 : 0.2);

    this.pointsGroup.selectAll('circle.point')
      .filter(d => d.school === school.school)
      .transition()
      .duration(150)
      .attr('r', this.getRadius(school) * 1.3);
  }

  /**
   * Remove external highlight
   */
  externalUnhighlight() {
    const conference = getState('activeConference') || 'all';
    this.filterByConference(conference);

    this.pointsGroup.selectAll('circle.point')
      .transition()
      .duration(150)
      .attr('r', d => this.getRadius(d));
  }

  /**
   * Setup resize handler
   */
  setupResize() {
    const resizeObserver = new ResizeObserver(() => {
      // Re-render on resize
      this.container.innerHTML = '';
      this.init();
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

export default ScatterPlot;
