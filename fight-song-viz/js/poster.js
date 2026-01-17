/**
 * Poster Module
 * =============
 * Final summary poster with mini galaxy and Purdue spotlight
 */

import { isPurdue, PURDUE_COLORS, getConferenceColor, calculateEnergyScore } from './utils.js';
import { subscribe, getState } from './state.js';

class PosterGalaxy {
  constructor(containerId, schools) {
    this.container = document.getElementById(containerId) ||
                     document.querySelector('.mini-galaxy-container');
    if (!this.container) return;

    this.schools = schools;
    this.canvas = null;
    this.ctx = null;
    this.animationId = null;
    this.isVisible = false;

    // Configuration
    this.config = {
      particleCount: 100,
      purdueSize: 20,
      starMinSize: 1,
      starMaxSize: 4,
      rotationSpeed: 0.0003,
      pulseSpeed: 0.002
    };

    this.particles = [];
    this.purdue = null;
    this.time = 0;

    this.init();
    this.setupVisibilityObserver();
  }

  /**
   * Initialize the mini galaxy
   */
  init() {
    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'poster-galaxy-canvas';
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    // Set size
    this.resize();

    // Find Purdue
    this.purdue = this.schools.find(s => isPurdue(s));

    // Create particles
    this.createParticles();

    // Setup resize handler
    window.addEventListener('resize', () => this.resize());
  }

  /**
   * Resize canvas
   */
  resize() {
    const rect = this.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    // Reset transform and apply new scale
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);

    this.centerX = this.width / 2;
    this.centerY = this.height / 2;
  }

  /**
   * Create particle system
   */
  createParticles() {
    this.particles = [];

    // Create school particles
    this.schools.forEach(school => {
      if (isPurdue(school)) return; // Skip Purdue, it's special

      const energy = calculateEnergyScore(school);
      const angle = Math.random() * Math.PI * 2;
      const radius = 30 + Math.random() * (Math.min(this.width, this.height) / 2 - 50);

      this.particles.push({
        school,
        angle,
        radius,
        size: this.config.starMinSize + energy * (this.config.starMaxSize - this.config.starMinSize),
        color: getConferenceColor(school.conference),
        speed: 0.0002 + Math.random() * 0.0003,
        opacity: 0.5 + Math.random() * 0.5
      });
    });

    // Add background stars (decorative)
    for (let i = 0; i < 50; i++) {
      this.particles.push({
        isBackground: true,
        angle: Math.random() * Math.PI * 2,
        radius: Math.random() * Math.min(this.width, this.height) / 2,
        size: 0.5 + Math.random() * 1.5,
        color: 'rgba(255, 255, 255, 0.3)',
        speed: 0.0001 + Math.random() * 0.0002,
        opacity: 0.2 + Math.random() * 0.3
      });
    }
  }

  /**
   * Setup visibility observer
   */
  setupVisibilityObserver() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        this.isVisible = entry.isIntersecting;
        if (this.isVisible && !this.animationId) {
          this.animate();
        }
      });
    }, { threshold: 0.1 });

    observer.observe(this.container);
  }

  /**
   * Animation loop
   */
  animate() {
    if (!this.isVisible) {
      this.animationId = null;
      return;
    }

    this.time += 16;
    this.draw();
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  /**
   * Draw the mini galaxy
   */
  draw() {
    const ctx = this.ctx;

    // Clear
    ctx.clearRect(0, 0, this.width, this.height);

    // Draw orbit rings
    this.drawOrbitRings();

    // Draw particles
    this.drawParticles();

    // Draw Purdue center
    this.drawPurdue();
  }

  /**
   * Draw faint orbit rings
   */
  drawOrbitRings() {
    const ctx = this.ctx;
    const rings = [0.3, 0.5, 0.7, 0.9];
    const maxRadius = Math.min(this.width, this.height) / 2 - 20;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    rings.forEach(ratio => {
      ctx.beginPath();
      ctx.arc(this.centerX, this.centerY, maxRadius * ratio, 0, Math.PI * 2);
      ctx.stroke();
    });
  }

  /**
   * Draw particles
   */
  drawParticles() {
    const ctx = this.ctx;

    this.particles.forEach(p => {
      // Update angle
      p.angle += p.speed;

      // Calculate position
      const x = this.centerX + Math.cos(p.angle) * p.radius;
      const y = this.centerY + Math.sin(p.angle) * p.radius;

      // Draw particle
      ctx.beginPath();
      ctx.arc(x, y, p.size, 0, Math.PI * 2);

      if (p.isBackground) {
        ctx.fillStyle = p.color;
      } else {
        // Slight twinkle effect
        const twinkle = 0.7 + Math.sin(this.time * 0.003 + p.angle) * 0.3;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity * twinkle;
      }

      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }

  /**
   * Draw Purdue as central star
   */
  drawPurdue() {
    if (!this.purdue) return;

    const ctx = this.ctx;
    const pulse = 1 + Math.sin(this.time * this.config.pulseSpeed) * 0.15;
    const size = this.config.purdueSize * pulse;

    // Outer glow
    const gradient = ctx.createRadialGradient(
      this.centerX, this.centerY, 0,
      this.centerX, this.centerY, size * 3
    );
    gradient.addColorStop(0, PURDUE_COLORS.goldGlow);
    gradient.addColorStop(0.5, 'rgba(207, 185, 145, 0.2)');
    gradient.addColorStop(1, 'transparent');

    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, size * 3, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Core
    const coreGradient = ctx.createRadialGradient(
      this.centerX, this.centerY, 0,
      this.centerX, this.centerY, size
    );
    coreGradient.addColorStop(0, '#fff');
    coreGradient.addColorStop(0.3, PURDUE_COLORS.goldLight);
    coreGradient.addColorStop(1, PURDUE_COLORS.gold);

    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, size, 0, Math.PI * 2);
    ctx.fillStyle = coreGradient;
    ctx.fill();

    // Draw rays
    this.drawRays(size);
  }

  /**
   * Draw decorative rays from Purdue
   */
  drawRays(size) {
    const ctx = this.ctx;
    const rayCount = 8;
    const rayLength = size * 2;
    const rotation = this.time * 0.0002;

    ctx.strokeStyle = PURDUE_COLORS.gold;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;

    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2 + rotation;
      const x1 = this.centerX + Math.cos(angle) * (size + 5);
      const y1 = this.centerY + Math.sin(angle) * (size + 5);
      const x2 = this.centerX + Math.cos(angle) * (size + rayLength);
      const y2 = this.centerY + Math.sin(angle) * (size + rayLength);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}

/**
 * Initialize poster section with all components
 */
export function initPoster(schools, conferences) {
  // Initialize mini galaxy
  const miniGalaxy = new PosterGalaxy('poster-galaxy', schools);

  // Setup Spotify embed if available
  setupSpotifyEmbed(schools);

  // Setup share buttons
  setupShareButtons();

  return miniGalaxy;
}

/**
 * Setup Spotify embed for Purdue fight song
 */
function setupSpotifyEmbed(schools) {
  const purdue = schools.find(s => isPurdue(s));
  if (!purdue || !purdue.spotify_id) return;

  const embedContainer = document.getElementById('spotify-embed');
  if (!embedContainer) return;

  // Create Spotify embed iframe
  const iframe = document.createElement('iframe');
  iframe.src = `https://open.spotify.com/embed/track/${purdue.spotify_id}?theme=0`;
  iframe.width = '100%';
  iframe.height = '80';
  iframe.frameBorder = '0';
  iframe.allow = 'encrypted-media';
  iframe.loading = 'lazy';

  embedContainer.appendChild(iframe);
}

/**
 * Setup share functionality
 */
function setupShareButtons() {
  const shareButtons = document.querySelectorAll('.share-btn');

  shareButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const platform = btn.dataset.platform;
      const url = encodeURIComponent(window.location.href);
      const title = encodeURIComponent('College Fight Songs Data Visualization - Hail Purdue!');

      let shareUrl = '';

      switch (platform) {
        case 'twitter':
          shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
          break;
        case 'linkedin':
          shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
          break;
        case 'copy':
          navigator.clipboard.writeText(window.location.href).then(() => {
            btn.textContent = 'Copied!';
            setTimeout(() => {
              btn.textContent = 'Copy Link';
            }, 2000);
          });
          return;
      }

      if (shareUrl) {
        window.open(shareUrl, '_blank', 'width=600,height=400');
      }
    });
  });
}

export default PosterGalaxy;
