/**
 * Trope DNA Matrix Module
 * =======================
 * Heatmap showing which tropes appear in each fight song
 */

import { getConferenceColor, isPurdue, PURDUE_COLORS, TROPE_LABELS, sortSchools } from './utils.js';
import { subscribe, hoverSchool, selectSchool, getState } from './state.js';
import tooltip from './tooltip.js';

class TropeMatrix {
  constructor(containerId, schools) {
    this.container = document.getElementById(containerId);
    this.schools = schools;
    this.sortedSchools = sortSchools(schools, 'conference');
    this.svg = null;
    this.hoveredSchool = null;
    this.currentSort = 'conference';

    // Trope keys
    this.tropes = ['fight', 'victory', 'win_won', 'rah', 'nonsense', 'colors', 'men', 'opponents', 'spelling'];

    // Configuration
    this.config = {
      margin: { top: 40, right: 20, bottom: 30, left: 80 },
      cellHeight: 22,
      cellGap: 2,
      minCellWidth: 12,
      transitionDuration: 500
    };

    this.init();
    this.setupStateListeners();
  }

  /**
   * Initialize the matrix
   */
  init() {
    // Clear container
    this.container.innerHTML = '';

    // Get container dimensions
    const rect = this.container.getBoundingClientRect();
    this.width = rect.width || 1000;

    const innerWidth = this.width - this.config.margin.left - this.config.margin.right;
    const cellWidth = Math.max(this.config.minCellWidth, innerWidth / this.schools.length - this.config.cellGap);

    this.cellWidth = cellWidth;
    this.innerHeight = this.tropes.length * (this.config.cellHeight + this.config.cellGap);
    this.height = this.innerHeight + this.config.margin.top + this.config.margin.bottom;

    // Create SVG
    this.svg = d3.select(this.container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', this.height)
      .attr('viewBox', `0 0 ${this.width} ${this.height}`)
      .attr('preserveAspectRatio', 'xMinYMid meet');

    // Create main group
    this.g = this.svg.append('g')
      .attr('transform', `translate(${this.config.margin.left}, ${this.config.margin.top})`);

    // Draw row labels (tropes)
    this.drawRowLabels();

    // Draw cells
    this.drawCells();

    // Draw Purdue highlight
    this.drawPurdueHighlight();

    // Draw column labels (schools - shown on hover)
    this.drawColumnLabels();
  }

  /**
   * Draw row labels (trope names)
   */
  drawRowLabels() {
    this.g.selectAll('text.row-label')
      .data(this.tropes)
      .join('text')
      .attr('class', 'row-label')
      .attr('x', -10)
      .attr('y', (d, i) => i * (this.config.cellHeight + this.config.cellGap) + this.config.cellHeight / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('fill', 'var(--text-secondary)')
      .attr('font-size', '11px')
      .text(d => TROPE_LABELS[d]);
  }

  /**
   * Draw matrix cells
   */
  drawCells() {
    const self = this;

    // Create column groups for each school
    const columns = this.g.selectAll('g.column')
      .data(this.sortedSchools, d => d.school)
      .join('g')
      .attr('class', d => `column ${isPurdue(d) ? 'purdue' : ''}`)
      .attr('transform', (d, i) => `translate(${i * (this.cellWidth + this.config.cellGap)}, 0)`)
      .style('cursor', 'pointer')
      .on('mouseenter', function(event, d) { self.handleMouseEnter(event, d, this); })
      .on('mousemove', (event, d) => this.handleMouseMove(event, d))
      .on('mouseleave', function(event, d) { self.handleMouseLeave(event, d, this); })
      .on('click', (event, d) => this.handleClick(event, d));

    // Draw cells within each column
    columns.selectAll('rect.cell')
      .data(d => this.tropes.map((trope, i) => ({
        school: d,
        trope,
        value: d[trope],
        rowIndex: i
      })))
      .join('rect')
      .attr('class', 'cell')
      .attr('x', 0)
      .attr('y', d => d.rowIndex * (this.config.cellHeight + this.config.cellGap))
      .attr('width', this.cellWidth)
      .attr('height', this.config.cellHeight)
      .attr('rx', 2)
      .attr('fill', d => {
        if (!d.value) return '#1f2937';
        if (isPurdue(d.school)) return PURDUE_COLORS.gold;
        return getConferenceColor(d.school.conference);
      })
      .attr('opacity', d => d.value ? 0.85 : 0.5);
  }

  /**
   * Draw Purdue column highlight
   */
  drawPurdueHighlight() {
    const purdueIndex = this.sortedSchools.findIndex(s => isPurdue(s));
    if (purdueIndex === -1) return;

    const x = purdueIndex * (this.cellWidth + this.config.cellGap) - 3;
    const width = this.cellWidth + 6;
    const height = this.innerHeight + 6;

    this.g.append('rect')
      .attr('class', 'purdue-highlight-box')
      .attr('x', x)
      .attr('y', -3)
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'none')
      .attr('stroke', PURDUE_COLORS.gold)
      .attr('stroke-width', 2)
      .attr('rx', 4)
      .attr('opacity', 0.8);

    // Purdue label above
    this.g.append('text')
      .attr('class', 'purdue-label')
      .attr('x', x + width / 2)
      .attr('y', -12)
      .attr('text-anchor', 'middle')
      .attr('fill', PURDUE_COLORS.gold)
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .text('PURDUE');
  }

  /**
   * Draw column labels (school names)
   */
  drawColumnLabels() {
    // Conference divider labels
    let currentConf = null;
    const confStarts = [];

    this.sortedSchools.forEach((school, i) => {
      if (school.conference !== currentConf) {
        confStarts.push({ conference: school.conference, index: i });
        currentConf = school.conference;
      }
    });

    // Draw conference labels at bottom
    confStarts.forEach((conf, idx) => {
      const nextConf = confStarts[idx + 1];
      const endIndex = nextConf ? nextConf.index : this.sortedSchools.length;
      const midIndex = (conf.index + endIndex) / 2;
      const x = midIndex * (this.cellWidth + this.config.cellGap);

      this.g.append('text')
        .attr('class', 'conf-label')
        .attr('x', x)
        .attr('y', this.innerHeight + 20)
        .attr('text-anchor', 'middle')
        .attr('fill', getConferenceColor(conf.conference))
        .attr('font-size', '10px')
        .attr('font-weight', '500')
        .text(conf.conference);
    });
  }

  /**
   * Handle mouse enter
   */
  handleMouseEnter(event, school, element) {
    this.hoveredSchool = school;
    hoverSchool(school);

    // Highlight this column
    d3.select(element).selectAll('rect.cell')
      .transition()
      .duration(100)
      .attr('opacity', d => d.value ? 1 : 0.7);

    // Dim other columns
    this.g.selectAll('g.column')
      .filter(d => d.school !== school.school)
      .transition()
      .duration(100)
      .attr('opacity', 0.3);

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
  handleMouseLeave(event, school, element) {
    this.hoveredSchool = null;
    hoverSchool(null);

    // Restore all columns
    this.g.selectAll('g.column')
      .transition()
      .duration(100)
      .attr('opacity', 1);

    d3.select(element).selectAll('rect.cell')
      .transition()
      .duration(100)
      .attr('opacity', d => d.value ? 0.85 : 0.5);

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
   * Resort the matrix
   */
  resort(sortBy) {
    this.currentSort = sortBy;
    this.sortedSchools = sortSchools(this.schools, sortBy);

    // Animate columns to new positions
    this.g.selectAll('g.column')
      .data(this.sortedSchools, d => d.school)
      .transition()
      .duration(this.config.transitionDuration)
      .attr('transform', (d, i) => `translate(${i * (this.cellWidth + this.config.cellGap)}, 0)`);

    // Update Purdue highlight position
    const purdueIndex = this.sortedSchools.findIndex(s => isPurdue(s));
    const x = purdueIndex * (this.cellWidth + this.config.cellGap) - 3;

    this.g.select('.purdue-highlight-box')
      .transition()
      .duration(this.config.transitionDuration)
      .attr('x', x);

    this.g.select('.purdue-label')
      .transition()
      .duration(this.config.transitionDuration)
      .attr('x', x + this.cellWidth / 2 + 3);

    // Update conference labels
    this.g.selectAll('.conf-label').remove();

    setTimeout(() => {
      // Redraw conference labels after animation
      let currentConf = null;
      const confStarts = [];

      this.sortedSchools.forEach((school, i) => {
        if (school.conference !== currentConf) {
          confStarts.push({ conference: school.conference, index: i });
          currentConf = school.conference;
        }
      });

      confStarts.forEach((conf, idx) => {
        const nextConf = confStarts[idx + 1];
        const endIndex = nextConf ? nextConf.index : this.sortedSchools.length;
        const midIndex = (conf.index + endIndex) / 2;
        const labelX = midIndex * (this.cellWidth + this.config.cellGap);

        this.g.append('text')
          .attr('class', 'conf-label')
          .attr('x', labelX)
          .attr('y', this.innerHeight + 20)
          .attr('text-anchor', 'middle')
          .attr('fill', getConferenceColor(conf.conference))
          .attr('font-size', '10px')
          .attr('font-weight', '500')
          .attr('opacity', 0)
          .text(conf.conference)
          .transition()
          .duration(200)
          .attr('opacity', 1);
      });
    }, this.config.transitionDuration);
  }

  /**
   * Setup state listeners
   */
  setupStateListeners() {
    // Listen for sort change
    subscribe('matrixSort', (sortBy) => {
      if (sortBy !== this.currentSort) {
        this.resort(sortBy);
      }
    });

    // Listen for conference filter
    subscribe('activeConference', (conference) => {
      this.filterByConference(conference);
    });

    // Listen for external hover
    subscribe('hoveredSchool', (school) => {
      if (school && school !== this.hoveredSchool) {
        this.externalHighlight(school);
      } else if (!school && !this.hoveredSchool) {
        this.externalUnhighlight();
      }
    });
  }

  /**
   * Filter by conference
   */
  filterByConference(conference) {
    const isAll = conference === 'all';

    this.g.selectAll('g.column')
      .transition()
      .duration(this.config.transitionDuration)
      .attr('opacity', d => {
        if (isAll || d.conference === conference) return 1;
        return 0.2;
      });
  }

  /**
   * External highlight
   */
  externalHighlight(school) {
    this.g.selectAll('g.column')
      .transition()
      .duration(100)
      .attr('opacity', d => d.school === school.school ? 1 : 0.3);
  }

  /**
   * Remove external highlight
   */
  externalUnhighlight() {
    const conference = getState('activeConference') || 'all';
    this.filterByConference(conference);
  }

  /**
   * Update visualization
   */
  update(state) {
    if (state.matrixSort && state.matrixSort !== this.currentSort) {
      this.resort(state.matrixSort);
    }
  }
}

export default TropeMatrix;
