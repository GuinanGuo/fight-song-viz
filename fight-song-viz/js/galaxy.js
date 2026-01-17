/**
 * Hero Map Module (was Energy Galaxy)
 * ====================================
 * Full-screen USA map with schools at their geographic locations
 * Purdue highlighted as the protagonist
 */

import { getConferenceColor, isPurdue, PURDUE_COLORS, calculateEnergyScore, getRelativeMousePosition, FONT_FAMILY } from './utils.js';
import { subscribe, hoverSchool, selectSchool, getState } from './state.js';
import tooltip from './tooltip.js';

class EnergyGalaxy {
  constructor(canvasId, schools) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.schools = schools;
    this.markers = [];
    this.animationId = null;
    this.startTime = performance.now();
    this.hoveredMarker = null;
    this.selectedMarker = null;
    this.mapLoaded = false;
    this.usStates = null;

    // Configuration
    this.config = {
      purdueRadius: 29,
      baseRadius: 6,
      radiusMultiplier: 1.2,
      pulseIntensity: 0.25,
      mapFillColor: '#1f2832',
      mapStrokeColor: '#2c3642',
      glowRadius: 40
    };

    // Initialize
    this.setupCanvas();
    this.loadMap();
    this.bindEvents();
    this.setupStateListeners();
  }

  /**
   * Setup canvas dimensions
   */
  setupCanvas() {
    const resize = () => {
      const container = this.canvas.parentElement;
      const dpr = window.devicePixelRatio || 1;

      this.width = container.clientWidth;
      this.height = container.clientHeight;

      this.canvas.width = this.width * dpr;
      this.canvas.height = this.height * dpr;
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;

      // Reset transform and apply new scale
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(dpr, dpr);

      // Recalculate projection
      this.setupProjection();

      // Update marker positions
      if (this.markers.length > 0) {
        this.updateMarkerPositions();
      }
    };

    resize();
    window.addEventListener('resize', resize);
  }

  /**
   * Setup map projection
   */
  setupProjection() {
    // Custom Albers USA projection for canvas - increased by 30%
    const scale = Math.min(this.width, this.height) * 1.69;
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    this.projection = d3.geoAlbersUsa()
      .scale(scale)
      .translate([centerX, centerY]);
  }

  /**
   * Load US map data
   */
  async loadMap() {
    try {
      const us = await d3.json('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json');
      this.usStates = topojson.feature(us, us.objects.states).features;
      this.mapLoaded = true;

      // Create markers after map loads
      this.createMarkers();

      // Start animation
      this.animate();

    } catch (error) {
      console.error('Failed to load map:', error);
      // Still create markers and animate without map background
      this.createMarkers();
      this.animate();
    }
  }

  /**
   * Create marker objects from school data
   */
  createMarkers() {
    this.markers = this.schools.map(school => {
      const coords = this.projection([school.lng, school.lat]);
      const energy = calculateEnergyScore(school);

      return {
        school,
        x: coords ? coords[0] : -1000,
        y: coords ? coords[1] : -1000,
        size: isPurdue(school)
          ? this.config.purdueRadius
          : this.config.baseRadius + school.trope_count * this.config.radiusMultiplier,
        color: isPurdue(school) ? PURDUE_COLORS.gold : getConferenceColor(school.conference),
        glowColor: isPurdue(school) ? PURDUE_COLORS.goldGlow : `${getConferenceColor(school.conference)}60`,
        pulseSpeed: school.bpm / 60,
        energy,
        isPurdue: isPurdue(school)
      };
    });

    // Sort so Purdue is drawn last (on top)
    this.markers.sort((a, b) => {
      if (a.isPurdue) return 1;
      if (b.isPurdue) return -1;
      return 0;
    });
  }

  /**
   * Update marker positions after resize
   */
  updateMarkerPositions() {
    this.markers.forEach(marker => {
      const coords = this.projection([marker.school.lng, marker.school.lat]);
      if (coords) {
        marker.x = coords[0];
        marker.y = coords[1];
      }
    });
  }

  /**
   * Bind mouse/touch events
   */
  bindEvents() {
    // Mouse move for hover
    this.canvas.addEventListener('mousemove', (e) => {
      const pos = getRelativeMousePosition(e, this.canvas);
      this.handleHover(pos.x, pos.y, e.clientX, e.clientY);
    });

    // Mouse leave
    this.canvas.addEventListener('mouseleave', () => {
      this.hoveredMarker = null;
      tooltip.hide();
      hoverSchool(null);
      this.canvas.style.cursor = 'default';
    });

    // Click for selection
    this.canvas.addEventListener('click', (e) => {
      const pos = getRelativeMousePosition(e, this.canvas);
      this.handleClick(pos.x, pos.y);
    });
  }

  /**
   * Handle hover interaction
   */
  handleHover(x, y, clientX, clientY) {
    let found = null;

    // Check markers (reverse order so Purdue is checked first)
    for (let i = this.markers.length - 1; i >= 0; i--) {
      const marker = this.markers[i];
      const dist = Math.hypot(x - marker.x, y - marker.y);
      const hitRadius = marker.size + 8;

      if (dist < hitRadius) {
        found = marker;
        break;
      }
    }

    if (found) {
      if (this.hoveredMarker !== found) {
        this.hoveredMarker = found;
        hoverSchool(found.school);
        tooltip.show(found.school, clientX, clientY);
        this.canvas.style.cursor = 'pointer';
      } else {
        tooltip.move(clientX, clientY);
      }
    } else {
      if (this.hoveredMarker) {
        this.hoveredMarker = null;
        hoverSchool(null);
        tooltip.hide();
        this.canvas.style.cursor = 'default';
      }
    }
  }

  /**
   * Handle click interaction
   */
  handleClick(x, y) {
    for (let i = this.markers.length - 1; i >= 0; i--) {
      const marker = this.markers[i];
      const dist = Math.hypot(x - marker.x, y - marker.y);

      if (dist < marker.size + 8) {
        this.selectedMarker = marker;
        selectSchool(marker.school);
        this.scrollToAct2();
        return;
      }
    }
  }

  /**
   * Scroll to Act 2 (Dashboard)
   */
  scrollToAct2() {
    const act2 = document.getElementById('act-2');
    if (!act2) return;

    if (window.gsap && window.ScrollToPlugin) {
      gsap.to(window, {
        scrollTo: { y: act2, offsetY: 0 },
        duration: 0.8,
        ease: 'power3.out'
      });
    } else {
      act2.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /**
   * Setup state listeners
   */
  setupStateListeners() {
    subscribe('hoveredSchool', (school) => {
      if (school) {
        const marker = this.markers.find(m => m.school.school === school.school);
        if (marker) {
          this.hoveredMarker = marker;
        }
      } else {
        this.hoveredMarker = null;
      }
    });

    subscribe('activeConference', (conference) => {
      this.activeConference = conference;
    });
  }

  /**
   * Main animation loop
   */
  animate() {
    const time = (performance.now() - this.startTime) / 1000;
    this.draw(time);
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  /**
   * Draw the entire visualization
   */
  draw(time) {
    const ctx = this.ctx;

    // Clear with dark background
    ctx.fillStyle = '#2b3440';
    ctx.fillRect(0, 0, this.width, this.height);

    // Draw US map if loaded
    if (this.mapLoaded && this.usStates) {
      this.drawMap();
    }

    // Draw connection lines (subtle)
    this.drawConnectionLines(time);

    // Draw markers
    this.drawMarkers(time);

    // Draw Purdue spotlight
    this.drawPurdueSpotlight(time);
  }

  /**
   * Draw US map background
   */
  drawMap() {
    const ctx = this.ctx;
    const path = d3.geoPath().projection(this.projection).context(ctx);

    ctx.beginPath();
    this.usStates.forEach(state => {
      path(state);
    });

    ctx.fillStyle = this.config.mapFillColor;
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.0;
    ctx.stroke();
  }

  /**
   * Draw subtle connection lines from Purdue to other schools
   */
  drawConnectionLines(time) {
    const ctx = this.ctx;
    const purdueMarker = this.markers.find(m => m.isPurdue);
    if (!purdueMarker) return;

    const activeConf = this.activeConference || 'all';

    ctx.lineWidth = 1.6;
    ctx.strokeStyle = 'rgba(207, 185, 145, 0.08)';

    this.markers.forEach(marker => {
      if (marker.isPurdue) return;

      // Only draw to same conference or all
      if (activeConf !== 'all' && marker.school.conference !== activeConf) return;

      // Subtle glow layer
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(207, 185, 145, 0.12)';
      ctx.lineWidth = 2.4;
      ctx.moveTo(purdueMarker.x, purdueMarker.y);
      ctx.lineTo(marker.x, marker.y);
      ctx.stroke();

      // Core line
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(207, 185, 145, 0.2)';
      ctx.lineWidth = 1.2;
      ctx.moveTo(purdueMarker.x, purdueMarker.y);
      ctx.lineTo(marker.x, marker.y);
      ctx.stroke();
    });
  }

  /**
   * Draw all markers
   */
  drawMarkers(time) {
    const ctx = this.ctx;
    const activeConf = this.activeConference || 'all';

    this.markers.forEach(marker => {
      if (marker.isPurdue) return; // Draw Purdue separately

      // Dimming for conference filter
      const isActive = activeConf === 'all' || marker.school.conference === activeConf;
      const isHovered = this.hoveredMarker === marker;
      const alpha = isActive ? (isHovered ? 1 : 0.85) : 0.15;

      // Pulse calculation
      const pulse = Math.sin(time * marker.pulseSpeed) * this.config.pulseIntensity + (1 - this.config.pulseIntensity);
      const size = marker.size * pulse * (isHovered ? 1.4 : 1);

      // Draw glow
      const gradient = ctx.createRadialGradient(
        marker.x, marker.y, 0,
        marker.x, marker.y, size * 3
      );
      gradient.addColorStop(0, this.hexToRgba(marker.color, 0.4 * alpha));
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(marker.x, marker.y, size * 3, 0, Math.PI * 2);
      ctx.fill();

      // Draw core
      ctx.fillStyle = this.hexToRgba(marker.color, alpha);
      ctx.beginPath();
      ctx.arc(marker.x, marker.y, size, 0, Math.PI * 2);
      ctx.fill();

      // Draw border
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 * alpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }

  /**
   * Draw Purdue marker with special spotlight effect
   */
  drawPurdueSpotlight(time) {
    const ctx = this.ctx;
    const purdueMarker = this.markers.find(m => m.isPurdue);
    if (!purdueMarker) return;

    const { x, y, pulseSpeed } = purdueMarker;
    const pulse = Math.sin(time * pulseSpeed) * 0.2 + 0.8;
    const isHovered = this.hoveredMarker === purdueMarker;

    // Large outer glow
    for (let i = 4; i >= 0; i--) {
      const layerRadius = (this.config.glowRadius + i * 15) * pulse;
      const layerAlpha = 0.15 - i * 0.025;

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, layerRadius);
      gradient.addColorStop(0, `rgba(207, 185, 145, ${layerAlpha})`);
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, layerRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Core circle
    const coreRadius = this.config.purdueRadius * pulse * (isHovered ? 1.3 : 1);
    const coreGradient = ctx.createRadialGradient(x, y, 0, x, y, coreRadius);
    coreGradient.addColorStop(0, '#fff');
    coreGradient.addColorStop(0.3, PURDUE_COLORS.goldLight);
    coreGradient.addColorStop(1, PURDUE_COLORS.gold);

    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(x, y, coreRadius, 0, Math.PI * 2);
    ctx.fill();

    // Gold border
    ctx.strokeStyle = PURDUE_COLORS.goldLight;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label
    ctx.fillStyle = '#0a0f1a';
    ctx.font = `bold 10px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PURDUE', x, y);

    // "Hail Purdue" label below
    ctx.fillStyle = PURDUE_COLORS.gold;
    ctx.font = `300 11px ${FONT_FAMILY}`;
    ctx.fillText('Hail Purdue', x, y + coreRadius + 15);
  }

  /**
   * Convert hex color to rgba
   */
  hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * Update visualization
   */
  update(state) {
    this.activeConference = state.activeConference;
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

export default EnergyGalaxy;
