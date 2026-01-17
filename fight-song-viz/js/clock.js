/**
 * Fight Song Clock Module (Nightingale Rose Chart)
 * =================================================
 * 6 conference sectors with varying radii based on avg BPM
 * Schools shown as arc lines within each sector
 */

import { getConferenceColor, isPurdue, PURDUE_COLORS, CONFERENCE_COLORS, mapRange } from './utils.js';
import { subscribe, hoverSchool, selectSchool, getState } from './state.js';
import tooltip from './tooltip.js';

class FightSongClock {
  constructor(containerId, schools) {
    this.container = document.getElementById(containerId);
    this.schools = schools;
    this.svg = null;
    this.sectors = null;
    this.arcs = null;

    this.config = {
      sectorGap: 3,           // degrees between sectors
      innerRadius: 0.15,      // as fraction of max radius
      minOuterRadius: 0.5,    // minimum outer radius for Nightingale effect
      arcThickness: 2,        // thickness of school arc lines
      transitionDuration: 200
    };

    this.conferences = ['ACC', 'Big 12', 'Big Ten', 'Pac-12', 'SEC', 'Independent'];
    this.conferenceStats = {};  // Will store avg BPM per conference

    this.init();
    this.setupStateListeners();
  }

  init() {
    const rect = this.container.getBoundingClientRect();
    this.width = rect.width || 400;
    this.height = rect.height || 400;
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;
    this.maxRadius = Math.min(this.width, this.height) / 2 * 1.3 - 35;
    this.innerRadius = this.maxRadius * this.config.innerRadius;

    // Calculate conference statistics for Nightingale radii
    this.calculateConferenceStats();

    this.svg = d3.select(this.container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${this.width} ${this.height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    this.addDefs();

    this.g = this.svg.append('g')
      .attr('transform', `translate(${this.centerX}, ${this.centerY})`);

    this.drawSectors();
    this.drawSchoolArcs();
    this.drawCenterLabel();
    this.drawSectorLabels();

    this.setupResize();
  }

  /**
   * Calculate conference stats - sector radius based on school count
   */
  calculateConferenceStats() {
    // Get school counts per conference
    const counts = this.conferences.map(conf =>
      this.schools.filter(s => s.conference === conf).length
    );
    const countExtent = d3.extent(counts);

    this.conferences.forEach(conf => {
      const confSchools = this.schools.filter(s => s.conference === conf);
      const schoolCount = confSchools.length;

      if (schoolCount > 0) {
        // Map school count to radius (minOuterRadius to 1.0)
        const normalizedRadius = mapRange(
          schoolCount,
          countExtent[0],
          countExtent[1],
          this.config.minOuterRadius,
          1.0
        );
        this.conferenceStats[conf] = {
          schoolCount,
          schools: confSchools,
          outerRadius: this.maxRadius * normalizedRadius
        };
      } else {
        this.conferenceStats[conf] = {
          schoolCount: 0,
          schools: [],
          outerRadius: this.maxRadius * this.config.minOuterRadius
        };
      }
    });
  }

  addDefs() {
    const defs = this.svg.append('defs');

    // Glow filter for Purdue
    const glowFilter = defs.append('filter')
      .attr('id', 'clock-glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');

    glowFilter.append('feGaussianBlur')
      .attr('stdDeviation', '4')
      .attr('result', 'blur');

    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'blur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Gradient for each conference sector
    this.conferences.forEach(conf => {
      const color = CONFERENCE_COLORS[conf];
      const gradient = defs.append('radialGradient')
        .attr('id', `sector-gradient-${conf.replace(/\s+/g, '-')}`)
        .attr('cx', '50%')
        .attr('cy', '50%')
        .attr('r', '70%');

      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', color)
        .attr('stop-opacity', 0.15);

      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', color)
        .attr('stop-opacity', 0.05);
    });
  }

  /**
   * Calculate sector angles for each conference
   */
  getSectorAngles() {
    const totalGap = this.config.sectorGap * this.conferences.length;
    const availableAngle = 360 - totalGap;
    const sectorAngle = availableAngle / this.conferences.length;
    const gapRad = (this.config.sectorGap * Math.PI) / 180;
    const sectorRad = (sectorAngle * Math.PI) / 180;

    const angles = {};
    let currentAngle = -Math.PI / 2; // Start at 12 o'clock

    this.conferences.forEach(conf => {
      angles[conf] = {
        start: currentAngle,
        end: currentAngle + sectorRad,
        mid: currentAngle + sectorRad / 2
      };
      currentAngle += sectorRad + gapRad;
    });

    return angles;
  }

  /**
   * Draw Nightingale Rose sector backgrounds (varying radii)
   */
  drawSectors() {
    const sectorsGroup = this.g.append('g').attr('class', 'sectors');
    const angles = this.getSectorAngles();

    this.conferences.forEach(conf => {
      const angle = angles[conf];
      const color = CONFERENCE_COLORS[conf];
      const gradientId = `sector-gradient-${conf.replace(/\s+/g, '-')}`;
      const outerRadius = this.conferenceStats[conf].outerRadius;

      const arc = d3.arc()
        .innerRadius(this.innerRadius)
        .outerRadius(outerRadius)
        .startAngle(angle.start)
        .endAngle(angle.end)
        .cornerRadius(3);

      // Sector background with Nightingale varying radius
      sectorsGroup.append('path')
        .attr('class', `sector sector-${conf.replace(/\s+/g, '-')}`)
        .attr('d', arc)
        .attr('fill', `url(#${gradientId})`)
        .attr('stroke', color)
        .attr('stroke-width', 1.5)
        .attr('stroke-opacity', 0.5);
    });

    this.sectors = sectorsGroup;
  }

  /**
   * Draw school arc lines within each Nightingale sector
   */
  drawSchoolArcs() {
    const arcsGroup = this.g.append('g').attr('class', 'school-arcs');
    const angles = this.getSectorAngles();

    // Get BPM extent for mapping individual school radii
    const bpmExtent = d3.extent(this.schools, d => d.bpm);

    // Draw arc lines for each conference
    this.conferences.forEach(conf => {
      const confData = this.conferenceStats[conf];
      const schools = confData.schools;
      const angle = angles[conf];
      const color = CONFERENCE_COLORS[conf];
      const sectorOuterRadius = confData.outerRadius;

      if (schools.length === 0) return;

      // Sort schools by BPM for consistent ordering
      const sortedSchools = [...schools].sort((a, b) => a.bpm - b.bpm);

      sortedSchools.forEach((school) => {
        // Map individual school BPM to radius within sector
        const schoolRadius = mapRange(
          school.bpm,
          bpmExtent[0],
          bpmExtent[1],
          this.innerRadius + 10,
          sectorOuterRadius - 5
        );

        // Arc line spans the sector with padding
        const padding = 0.06; // radians
        const arcStart = angle.start + padding;
        const arcEnd = angle.end - padding;

        const arc = d3.arc()
          .innerRadius(schoolRadius - this.config.arcThickness / 2)
          .outerRadius(schoolRadius + this.config.arcThickness / 2)
          .startAngle(arcStart)
          .endAngle(arcEnd)
          .cornerRadius(this.config.arcThickness / 2);

        const isPurdueSchool = isPurdue(school);
        const arcColor = isPurdueSchool ? PURDUE_COLORS.gold : color;

        const arcPath = arcsGroup.append('path')
          .datum(school)
          .attr('class', `school-arc ${isPurdueSchool ? 'purdue' : ''}`)
          .attr('d', arc)
          .attr('fill', 'none')
          .attr('stroke', arcColor)
          .attr('stroke-width', isPurdueSchool ? 4 : this.config.arcThickness)
          .attr('stroke-opacity', isPurdueSchool ? 1 : 0.6)
          .style('cursor', 'pointer')
          .on('mouseenter', (event, d) => this.handleMouseEnter(event, d))
          .on('mousemove', (event, d) => this.handleMouseMove(event, d))
          .on('mouseleave', (event, d) => this.handleMouseLeave(event, d))
          .on('click', (event, d) => this.handleClick(event, d));

        if (isPurdueSchool) {
          arcPath.attr('filter', 'url(#clock-glow)');
        }
      });
    });

    this.arcs = arcsGroup.selectAll('.school-arc');
  }

  /**
   * Draw center label
   */
  drawCenterLabel() {
    const centerGroup = this.g.append('g').attr('class', 'center-label');

    centerGroup.append('circle')
      .attr('r', this.innerRadius - 5)
      .attr('fill', 'rgba(0,0,0,0.3)')
      .attr('stroke', 'rgba(255,255,255,0.1)')
      .attr('stroke-width', 1);

    centerGroup.append('text')
      .attr('y', -6)
      .attr('text-anchor', 'middle')
      .attr('fill', 'rgba(255,255,255,0.8)')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .text('BPM');

    centerGroup.append('text')
      .attr('y', 10)
      .attr('text-anchor', 'middle')
      .attr('fill', 'rgba(255,255,255,0.5)')
      .attr('font-size', '8px')
      .text('Inner→Outer');
  }

  /**
   * Draw sector labels at edge of each Nightingale petal
   */
  drawSectorLabels() {
    const labelsGroup = this.g.append('g').attr('class', 'sector-labels');
    const angles = this.getSectorAngles();

    this.conferences.forEach(conf => {
      const angle = angles[conf];
      const midAngle = angle.mid;
      const outerRadius = this.conferenceStats[conf].outerRadius;
      const labelRadius = outerRadius + 15;

      const x = labelRadius * Math.cos(midAngle);
      const y = labelRadius * Math.sin(midAngle);

      // Adjust text anchor based on position
      let textAnchor = 'middle';
      if (midAngle > -Math.PI / 4 && midAngle < Math.PI / 4) {
        textAnchor = 'start';
      } else if (midAngle > 3 * Math.PI / 4 || midAngle < -3 * Math.PI / 4) {
        textAnchor = 'end';
      }

      // Conference name
      labelsGroup.append('text')
        .attr('x', x)
        .attr('y', y)
        .attr('text-anchor', textAnchor)
        .attr('dominant-baseline', 'middle')
        .attr('fill', CONFERENCE_COLORS[conf])
        .attr('font-size', '10px')
        .attr('font-weight', '600')
        .text(conf);

      // School count indicator
      const count = this.conferenceStats[conf].schoolCount;
      labelsGroup.append('text')
        .attr('x', x)
        .attr('y', y + 12)
        .attr('text-anchor', textAnchor)
        .attr('dominant-baseline', 'middle')
        .attr('fill', 'rgba(255,255,255,0.5)')
        .attr('font-size', '8px')
        .text(`${count} universities`);
    });
  }

  handleMouseEnter(event, school) {
    hoverSchool(school);
    this.highlightArc(school);
    tooltip.show(school, event.clientX, event.clientY);
  }

  handleMouseMove(event, school) {
    tooltip.move(event.clientX, event.clientY);
  }

  handleMouseLeave(event, school) {
    hoverSchool(null);
    this.unhighlightArc();
    tooltip.hide();
  }

  handleClick(event, school) {
    event.stopPropagation();
    selectSchool(school);
  }

  highlightArc(school) {
    this.arcs
      .transition().duration(100)
      .attr('stroke-opacity', d => {
        if (d.school === school.school) return 1;
        if (isPurdue(d)) return 0.5;
        return 0.15;
      })
      .attr('stroke-width', d => {
        if (d.school === school.school) return isPurdue(d) ? 4 : 4;
        return isPurdue(d) ? 3 : this.config.arcThickness;
      });

    this.arcs.filter(d => d.school === school.school).raise();
  }

  unhighlightArc() {
    const conference = getState('activeConference') || 'all';

    this.arcs
      .transition().duration(100)
      .attr('stroke-opacity', d => {
        if (isPurdue(d)) return 1;
        if (conference === 'all' || d.conference === conference) {
          return 0.75;
        }
        return 0.15;
      })
      .attr('stroke-width', d => isPurdue(d) ? 3 : this.config.arcThickness);
  }

  filterByConference(conference) {
    const isAll = conference === 'all';

    this.arcs
      .transition().duration(this.config.transitionDuration)
      .attr('stroke-opacity', d => {
        if (isPurdue(d)) return 1;
        if (isAll || d.conference === conference) return 0.75;
        return 0.15;
      });

    // Highlight/dim sector backgrounds
    this.conferences.forEach(conf => {
      const sector = this.sectors.select(`.sector-${conf.replace(/\s+/g, '-')}`);
      sector.transition().duration(this.config.transitionDuration)
        .attr('stroke-opacity', isAll || conf === conference ? 0.5 : 0.15);
    });
  }

  setupStateListeners() {
    subscribe('activeConference', (conference) => {
      this.filterByConference(conference);
    });

    subscribe('hoveredSchool', (school) => {
      if (school) {
        this.highlightArc(school);
      }
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

export default FightSongClock;
