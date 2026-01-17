/**
 * Network Graph Module
 * ====================
 * Force-directed network showing similarity relationships between schools
 */

import { getConferenceColor, isPurdue, PURDUE_COLORS } from './utils.js';
import { subscribe, hoverSchool, selectSchool, getState } from './state.js';
import tooltip from './tooltip.js';

class NetworkGraph {
  constructor(containerId, schools) {
    this.container = document.getElementById(containerId);
    this.schools = schools;
    this.svg = null;
    this.simulation = null;
    this.nodes = [];
    this.links = [];

    this.config = {
      nodeRadius: 6,
      purdueRadius: 10,
      linkDistance: 80,
      chargeStrength: -150,
      similarityThreshold: 0.7
    };

    this.init();
    this.setupStateListeners();
  }

  init() {
    const rect = this.container.getBoundingClientRect();
    this.width = rect.width || 600;
    this.height = rect.height || 400;

    this.svg = d3.select(this.container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${this.width} ${this.height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    this.addDefs();
    this.g = this.svg.append('g');

    this.prepareData();
    this.createSimulation();
    this.draw();
    this.setupResize();
  }

  addDefs() {
    const defs = this.svg.append('defs');

    const glowFilter = defs.append('filter')
      .attr('id', 'network-glow')
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

  prepareData() {
    this.nodes = this.schools.map(s => ({
      id: s.school,
      school: s,
      x: this.width / 2 + (Math.random() - 0.5) * 100,
      y: this.height / 2 + (Math.random() - 0.5) * 100
    }));

    this.links = [];
    for (let i = 0; i < this.schools.length; i++) {
      for (let j = i + 1; j < this.schools.length; j++) {
        const similarity = this.calculateSimilarity(this.schools[i], this.schools[j]);
        if (similarity > this.config.similarityThreshold) {
          this.links.push({
            source: this.schools[i].school,
            target: this.schools[j].school,
            similarity: similarity
          });
        }
      }
    }
  }

  calculateSimilarity(s1, s2) {
    const bpmDiff = Math.abs(s1.bpm - s2.bpm);
    const durationDiff = Math.abs(s1.sec_duration - s2.sec_duration);
    const tropeDiff = Math.abs(s1.trope_count - s2.trope_count);

    const bpmSim = 1 - Math.min(bpmDiff / 100, 1);
    const durationSim = 1 - Math.min(durationDiff / 60, 1);
    const tropeSim = 1 - Math.min(tropeDiff / 10, 1);
    const confSim = s1.conference === s2.conference ? 0.3 : 0;

    return (bpmSim * 0.3 + durationSim * 0.2 + tropeSim * 0.2 + confSim) / 0.7;
  }

  createSimulation() {
    this.simulation = d3.forceSimulation(this.nodes)
      .force('link', d3.forceLink(this.links)
        .id(d => d.id)
        .distance(this.config.linkDistance))
      .force('charge', d3.forceManyBody()
        .strength(this.config.chargeStrength))
      .force('center', d3.forceCenter(this.width / 2, this.height / 2))
      .force('collision', d3.forceCollide().radius(15));
  }

  draw() {
    const linkGroup = this.g.append('g').attr('class', 'links');
    const nodeGroup = this.g.append('g').attr('class', 'nodes');

    this.linkElements = linkGroup.selectAll('line')
      .data(this.links)
      .join('line')
      .attr('stroke', '#ffffff')
      .attr('stroke-opacity', d => d.similarity * 0.3)
      .attr('stroke-width', d => d.similarity * 2);

    this.nodeElements = nodeGroup.selectAll('g')
      .data(this.nodes)
      .join('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (event, d) => this.dragStarted(event, d))
        .on('drag', (event, d) => this.dragged(event, d))
        .on('end', (event, d) => this.dragEnded(event, d)))
      .on('mouseenter', (event, d) => this.handleMouseEnter(event, d))
      .on('mousemove', (event, d) => this.handleMouseMove(event, d))
      .on('mouseleave', (event, d) => this.handleMouseLeave(event, d))
      .on('click', (event, d) => this.handleClick(event, d));

    this.nodeElements.append('circle')
      .attr('r', d => isPurdue(d.school) ? this.config.purdueRadius : this.config.nodeRadius)
      .attr('fill', d => isPurdue(d.school) ? PURDUE_COLORS.gold : getConferenceColor(d.school.conference))
      .attr('stroke', d => isPurdue(d.school) ? PURDUE_COLORS.goldLight : '#ffffff')
      .attr('stroke-width', d => isPurdue(d.school) ? 2 : 1)
      .attr('opacity', 0.9);

    this.nodeElements.filter(d => isPurdue(d.school))
      .attr('filter', 'url(#network-glow)');

    this.simulation.on('tick', () => {
      this.linkElements
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      this.nodeElements
        .attr('transform', d => `translate(${d.x}, ${d.y})`);
    });
  }

  dragStarted(event, d) {
    if (!event.active) this.simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  dragEnded(event, d) {
    if (!event.active) this.simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  handleMouseEnter(event, d) {
    hoverSchool(d.school);
    this.highlightNode(d);
    tooltip.show(d.school, event.clientX, event.clientY);
  }

  handleMouseMove(event, d) {
    tooltip.move(event.clientX, event.clientY);
  }

  handleMouseLeave(event, d) {
    hoverSchool(null);
    this.unhighlightNode(d);
    tooltip.hide();
  }

  handleClick(event, d) {
    event.stopPropagation();
    selectSchool(d.school);
  }

  highlightNode(node) {
    const connectedNodes = new Set([node.id]);
    this.links.forEach(link => {
      if (link.source.id === node.id) connectedNodes.add(link.target.id);
      if (link.target.id === node.id) connectedNodes.add(link.source.id);
    });

    this.nodeElements
      .transition().duration(150)
      .style('opacity', d => connectedNodes.has(d.id) ? 1 : 0.2);

    this.linkElements
      .transition().duration(150)
      .attr('stroke-opacity', d =>
        (d.source.id === node.id || d.target.id === node.id) ? d.similarity * 0.6 : 0.05);
  }

  unhighlightNode(node) {
    const conference = getState('activeConference') || 'all';

    this.nodeElements
      .transition().duration(150)
      .style('opacity', d => {
        if (conference === 'all' || d.school.conference === conference) return 0.9;
        return 0.2;
      });

    this.linkElements
      .transition().duration(150)
      .attr('stroke-opacity', d => d.similarity * 0.3);
  }

  setupStateListeners() {
    subscribe('activeConference', (conference) => {
      this.filterByConference(conference);
    });

    subscribe('hoveredSchool', (school) => {
      if (school) {
        const node = this.nodes.find(n => n.school.school === school.school);
        if (node) this.highlightNode(node);
      }
    });
  }

  filterByConference(conference) {
    const isAll = conference === 'all';

    this.nodeElements
      .transition().duration(300)
      .style('opacity', d => {
        if (isAll || d.school.conference === conference) return 0.9;
        return 0.2;
      });

    this.linkElements
      .transition().duration(300)
      .attr('stroke-opacity', d => {
        const sourceMatch = isAll || d.source.school.conference === conference;
        const targetMatch = isAll || d.target.school.conference === conference;
        return (sourceMatch && targetMatch) ? d.similarity * 0.3 : 0.05;
      });
  }

  setupResize() {
    const resizeObserver = new ResizeObserver(() => {
      const rect = this.container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        this.width = rect.width;
        this.height = rect.height;
        this.svg.attr('viewBox', `0 0 ${this.width} ${this.height}`);
        this.simulation.force('center', d3.forceCenter(this.width / 2, this.height / 2));
        this.simulation.alpha(0.3).restart();
      }
    });

    resizeObserver.observe(this.container);
  }

  update(state) {
    if (state.activeConference) {
      this.filterByConference(state.activeConference);
    }
  }
}

export default NetworkGraph;
