/**
 * Parallel Coordinates Module
 * ============================
 * Multi-dimensional visualization showing all metrics simultaneously
 */

import { getConferenceColor, isPurdue, PURDUE_COLORS } from './utils.js';
import { subscribe, hoverSchool, selectSchool, getState } from './state.js';
import tooltip from './tooltip.js';

class ParallelCoordinates {
  constructor(containerId, schools) {
    this.container = document.getElementById(containerId);
    this.schools = schools;
    this.svg = null;
    this.dimensions = [];
    this.scales = {};
    this.axes = {};
    this.brushes = {};

    this.config = {
      margin: { top: 40, right: 40, bottom: 20, left: 50 },
      lineOpacity: 0.3,
      lineOpacityHover: 0.8
    };

    this.init();
    this.setupStateListeners();
  }

  init() {
    const rect = this.container.getBoundingClientRect();
    this.width = rect.width || 800;
    this.height = rect.height || 300;

    const innerWidth = this.width - this.config.margin.left - this.config.margin.right;
    const innerHeight = this.height - this.config.margin.top - this.config.margin.bottom;

    this.svg = d3.select(this.container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${this.width} ${this.height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    this.g = this.svg.append('g')
      .attr('transform', `translate(${this.config.margin.left}, ${this.config.margin.top})`);

    this.dimensions = [
      { key: 'bpm', label: 'BPM', format: d => Math.round(d), isBoolean: false },
      { key: 'sec_duration', label: 'Duration (s)', format: d => Math.round(d), isBoolean: false },
      { key: 'year', label: 'Year', format: d => Math.round(d), isBoolean: false },
      { key: 'fight', label: 'Fight', format: d => d ? 'Yes' : 'No', isBoolean: true },
      { key: 'victory', label: 'Victory', format: d => d ? 'Yes' : 'No', isBoolean: true }
    ];

    this.xScale = d3.scalePoint()
      .domain(this.dimensions.map(d => d.key))
      .range([0, innerWidth]);

    this.dimensions.forEach(dim => {
      if (dim.isBoolean) {
        // Boolean dimensions: 0 (No) at bottom, 1 (Yes) at top
        this.scales[dim.key] = d3.scaleLinear()
          .domain([0, 1])
          .range([innerHeight, 0]);
      } else if (dim.key === 'year') {
        // Year: filter out null values and get proper extent
        const validYears = this.schools.filter(s => s.year != null).map(s => s.year);
        const extent = d3.extent(validYears);
        this.scales[dim.key] = d3.scaleLinear()
          .domain(extent)
          .range([innerHeight, 0]);
      } else {
        const extent = d3.extent(this.schools, s => s[dim.key] || 0);
        this.scales[dim.key] = d3.scaleLinear()
          .domain(extent)
          .range([innerHeight, 0]);
      }
    });

    this.draw();
    this.setupResize();
  }

  draw() {
    const innerHeight = this.height - this.config.margin.top - this.config.margin.bottom;

    const linesGroup = this.g.append('g').attr('class', 'lines');

    const sortedSchools = [...this.schools].sort((a, b) => {
      if (isPurdue(a)) return 1;
      if (isPurdue(b)) return -1;
      return 0;
    });

    this.lines = linesGroup.selectAll('path')
      .data(sortedSchools)
      .join('path')
      .attr('class', 'parallel-line')
      .attr('d', d => this.path(d))
      .attr('stroke', d => isPurdue(d) ? PURDUE_COLORS.gold : getConferenceColor(d.conference))
      .attr('stroke-width', d => isPurdue(d) ? 2.5 : 1.5)
      .attr('fill', 'none')
      .attr('opacity', d => isPurdue(d) ? 0.8 : this.config.lineOpacity)
      .style('cursor', 'pointer')
      .on('mouseenter', (event, d) => this.handleMouseEnter(event, d))
      .on('mousemove', (event, d) => this.handleMouseMove(event, d))
      .on('mouseleave', (event, d) => this.handleMouseLeave(event, d))
      .on('click', (event, d) => this.handleClick(event, d));

    const axesGroup = this.g.append('g').attr('class', 'axes');

    this.dimensions.forEach(dim => {
      const axisGroup = axesGroup.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(${this.xScale(dim.key)}, 0)`);

      axisGroup.append('line')
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', 'rgba(255, 255, 255, 0.5)')
        .attr('stroke-width', 1);

      let axis;
      if (dim.isBoolean) {
        // Boolean axis: only show Yes (1) and No (0)
        axis = d3.axisLeft(this.scales[dim.key])
          .tickValues([0, 1])
          .tickFormat(d => d === 1 ? 'Yes' : 'No');
      } else {
        axis = d3.axisLeft(this.scales[dim.key])
          .ticks(5)
          .tickFormat(d => dim.format(d));
      }

      axisGroup.call(axis)
        .call(g => {
          g.selectAll('.tick line')
            .attr('stroke', 'rgba(255, 255, 255, 0.2)')
            .attr('x2', 6);
          g.selectAll('.tick text')
            .attr('fill', '#ffffff')
            .attr('font-size', '10px')
            .attr('x', -10);
          g.select('.domain').remove();
        });

      axisGroup.append('text')
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .attr('fill', '#ffffff')
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .text(dim.label);

      this.setupBrush(dim.key, axisGroup, innerHeight);
    });
  }

  path(d) {
    const points = this.dimensions.map(dim => {
      let value;
      if (dim.isBoolean) {
        value = d[dim.key] ? 1 : 0;
      } else if (dim.key === 'year') {
        // For schools without year, use median year
        value = d.year != null ? d.year : 1930;
      } else {
        value = d[dim.key] || 0;
      }
      return [this.xScale(dim.key), this.scales[dim.key](value)];
    });
    return d3.line()(points);
  }

  setupBrush(dimKey, axisGroup, height) {
    const brush = d3.brushY()
      .extent([[-10, 0], [10, height]])
      .on('brush end', (event) => {
        if (event.selection) {
          const [y0, y1] = event.selection;
          this.brushes[dimKey] = [y0, y1];
          this.filterLines();
        } else {
          delete this.brushes[dimKey];
          this.filterLines();
        }
      });

    axisGroup.append('g')
      .attr('class', 'brush')
      .call(brush);
  }

  filterLines() {
    const activeFilters = Object.keys(this.brushes);

    this.lines
      .transition().duration(150)
      .attr('opacity', d => {
        if (isPurdue(d)) return 0.8;

        const isVisible = activeFilters.every(dimKey => {
          const [y0, y1] = this.brushes[dimKey];
          const dim = this.dimensions.find(dim => dim.key === dimKey);
          let value;
          if (dim.isBoolean) {
            value = d[dimKey] ? 1 : 0;
          } else if (dimKey === 'year') {
            value = d.year != null ? d.year : 1930;
          } else {
            value = d[dimKey] || 0;
          }

          const yPos = this.scales[dimKey](value);
          return yPos >= y0 && yPos <= y1;
        });

        return isVisible ? this.config.lineOpacity : 0.05;
      });
  }

  handleMouseEnter(event, school) {
    hoverSchool(school);
    this.highlightLine(school);
    tooltip.show(school, event.clientX, event.clientY);
  }

  handleMouseMove(event, school) {
    tooltip.move(event.clientX, event.clientY);
  }

  handleMouseLeave(event, school) {
    hoverSchool(null);
    this.unhighlightLine(school);
    tooltip.hide();
  }

  handleClick(event, school) {
    event.stopPropagation();
    selectSchool(school);
  }

  highlightLine(school) {
    this.lines
      .transition().duration(150)
      .attr('opacity', d => {
        if (d.school === school.school) return this.config.lineOpacityHover;
        if (isPurdue(d)) return 0.3;
        return 0.1;
      })
      .attr('stroke-width', d => {
        if (d.school === school.school) return 3;
        return isPurdue(d) ? 2.5 : 1.5;
      });

    this.lines.filter(d => d.school === school.school).raise();
  }

  unhighlightLine(school) {
    const conference = getState('activeConference') || 'all';

    this.lines
      .transition().duration(150)
      .attr('opacity', d => {
        if (isPurdue(d)) return 0.8;
        if (conference === 'all' || d.conference === conference) {
          return this.config.lineOpacity;
        }
        return 0.1;
      })
      .attr('stroke-width', d => isPurdue(d) ? 2.5 : 1.5);
  }

  setupStateListeners() {
    subscribe('activeConference', (conference) => {
      this.filterByConference(conference);
    });

    subscribe('hoveredSchool', (school) => {
      if (school) {
        this.highlightLine(school);
      }
    });
  }

  filterByConference(conference) {
    const isAll = conference === 'all';

    this.lines
      .transition().duration(300)
      .attr('opacity', d => {
        if (isPurdue(d)) return 0.8;
        if (isAll || d.conference === conference) {
          return this.config.lineOpacity;
        }
        return 0.1;
      });
  }

  setupResize() {
    const resizeObserver = new ResizeObserver(() => {
      this.container.innerHTML = '';
      this.init();
    });

    resizeObserver.observe(this.container);
  }

  update(state) {
    if (state.activeConference) {
      this.filterByConference(state.activeConference);
    }
  }
}

export default ParallelCoordinates;
