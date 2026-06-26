// ============================================================
// HEN LAY EGG - A cute egg-catching game
// 10 levels, superpower eggs, obstacles, progressive difficulty
// ============================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI elements
const ui = document.getElementById('ui');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const levelScreen = document.getElementById('levelScreen');
const controlsDiv = document.getElementById('controls');

// Game state
let game = {
  state: 'start', // start, playing, levelComplete, gameOver
  score: 0,
  lives: 7,
  level: 1,
  unlockedLevels: 1,
  highScores: {},
  levelTime: 60, // seconds per level
  timeLeft: 60,
  lastTime: 0,
  hens: [],
  eggs: [],
  obstacles: [],
  powerups: [],
  particles: [],
  basket: null,
  levelStartTime: 0,
  spawnTimer: 0,
  bgOffset: 0,
  combo: 0,
  comboTimer: 0,
  shakeAmount: 0,
  flashTimer: 0,
  flashColor: '',
};

// Preloaded assets (images loaded from generated files)
const assets = {};
function loadAssets() {
  const images = {
    hen: 'hen.png',
    basket: 'basket.png',
    eggs: 'eggs.png',
  };
  Object.entries(images).forEach(([key, src]) => {
    try {
      const img = new Image();
      img.onload = () => { assets[key] = img; };
      img.onerror = () => { /* fallback to drawn graphics */ };
      img.src = src;
    } catch(e) {
      /* Image not available, use fallback graphics */
    }
  });
}

// Safe startup - wait for DOM to be ready
function startup() {
  resize();
  try { loadAssets(); } catch(e) { /* continue without image assets */ }
  try {
    showStartScreen();
  } catch(e) {
    console.error('Start screen error:', e.message);
  }
  try {
    requestAnimationFrame(gameLoop);
  } catch(e) {
    console.error('Animation frame error:', e.message);
  }
}

// Safe startup - script is at end of body, DOM is ready
startup();
// Force an initial draw (requestAnimationFrame may be throttled in some contexts)
setTimeout(function() { try { draw(); } catch(e) {} }, 50);
setTimeout(function() { try { draw(); } catch(e) {} }, 200);
setTimeout(function() { try { draw(); } catch(e) {} }, 500);

const powerupEmoji = {
  golden: '🟡', speed: '⚡', shield: '🛡️', magnet: '🧲',
  shrink: '📦', slowmo: '⏱️', double: '✨', giant: '🔶',
  multi: '🌟', rainbow: '🌈'
};

function resize() {
  if (!canvas) return;
  // Use visualViewport for accurate mobile sizing (excludes URL bar)
  const vw = window.visualViewport ? window.visualViewport.width : window.innerWidth;
  const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  const isMobile = vw < 768;
  if (isMobile) {
    W = vw;
    H = vh;
  } else {
    W = Math.min(800, vw);
    H = Math.min(900, vh);
  }
  SCALE = W / 400;
  canvas.width = W;
  canvas.height = H;
}
window.addEventListener('resize', resize);
// resize() is called in startup() after DOM is ready

// ============================================================
// LEVEL CONFIGURATIONS
// ============================================================
const LEVELS = [
  {
    name: 'Sunny Farm', hens: 1, spawnRate: 1.8, eggGravity: 0.28,
    blackChance: 0, powerupChance: 0.08,
    planks: 4, plankYs: [0.22, 0.38, 0.54, 0.70],
    plankAngles: [8, -8, 8, -8],
    powerupTypes: ['golden'],
    bgColor1: '#87CEEB', bgColor2: '#90EE90',
    desc: '4 wooden planks! Eggs bounce off each one!',
  },
  {
    name: 'Berry Bushes', hens: 2, spawnRate: 1.6, eggGravity: 0.30,
    blackChance: 0.05, powerupChance: 0.1,
    planks: 5, plankYs: [0.18, 0.32, 0.46, 0.60, 0.74],
    plankAngles: [-10, 10, -10, 10, -10],
    powerupTypes: ['golden', 'speed'],
    bgColor1: '#5BA3D9', bgColor2: '#7EC8E3',
    desc: '5 planks + speed egg!',
  },
  {
    name: 'Corn Field', hens: 2, spawnRate: 1.5, eggGravity: 0.32,
    blackChance: 0.08, powerupChance: 0.1,
    planks: 6, plankYs: [0.15, 0.27, 0.39, 0.51, 0.63, 0.75],
    plankAngles: [12, -12, 12, -12, 12, -12],
    powerupTypes: ['golden', 'speed', 'shield'],
    bgColor1: '#FFD93D', bgColor2: '#FFF3B0',
    desc: '6 planks! Shield protects from black eggs!',
  },
  {
    name: 'Windy Hill', hens: 2, spawnRate: 1.4, eggGravity: 0.33,
    blackChance: 0.1, powerupChance: 0.1,
    planks: 6, plankYs: [0.14, 0.25, 0.36, 0.47, 0.58, 0.69],
    plankAngles: [-15, 15, -15, 15, -15, 15],
    hasWind: true, windStrength: 0.3,
    powerupTypes: ['golden', 'speed', 'shield', 'magnet'],
    bgColor1: '#B8E6FF', bgColor2: '#E0F7FA',
    desc: 'Wind blows eggs! Magnet attracts them!',
  },
  {
    name: 'Rainy Day', hens: 3, spawnRate: 1.3, eggGravity: 0.34,
    blackChance: 0.12, powerupChance: 0.12,
    planks: 7, plankYs: [0.12, 0.22, 0.32, 0.42, 0.52, 0.62, 0.72],
    plankAngles: [10, -10, 10, -10, 10, -10, 10],
    hasRain: true,
    powerupTypes: ['golden', 'speed', 'shield', 'magnet', 'shrink'],
    bgColor1: '#5C6BC0', bgColor2: '#9FA8DA',
    desc: '7 planks + rain! Big basket helps!',
  },
  {
    name: 'Mountain Path', hens: 3, spawnRate: 1.2, eggGravity: 0.36,
    blackChance: 0.15, powerupChance: 0.13,
    planks: 7, plankYs: [0.10, 0.21, 0.30, 0.39, 0.48, 0.57, 0.66],
    plankAngles: [-18, 18, -18, 18, -18, 18, -18],
    powerupTypes: ['golden', 'speed', 'shield', 'magnet', 'shrink', 'slowmo'],
    bgColor1: '#8D6E63', bgColor2: '#BCAAA4',
    desc: 'Steep angles! Slow-mo essential!',
  },
  {
    name: 'Fox Night', hens: 3, spawnRate: 1.1, eggGravity: 0.38,
    blackChance: 0.18, powerupChance: 0.13,
    planks: 8, plankYs: [0.10, 0.18, 0.26, 0.34, 0.42, 0.50, 0.58, 0.66],
    plankAngles: [15, -15, 15, -15, 15, -15, 15, -15],
    hasWind: true, windStrength: 0.4,
    powerupTypes: ['golden', 'speed', 'shield', 'magnet', 'shrink', 'slowmo', 'double'],
    bgColor1: '#2C3E50', bgColor2: '#34495E',
    desc: '8 planks at night! Double points!',
  },
  {
    name: 'Storm Castle', hens: 4, spawnRate: 1.0, eggGravity: 0.40,
    blackChance: 0.20, powerupChance: 0.14,
    planks: 8, plankYs: [0.10, 0.17, 0.24, 0.31, 0.38, 0.45, 0.52, 0.59],
    plankAngles: [-20, 20, -20, 20, -20, 20, -20, 20],
    hasWind: true, windStrength: 0.5, hasRain: true,
    powerupTypes: ['golden', 'speed', 'shield', 'magnet', 'shrink', 'slowmo', 'double', 'giant'],
    bgColor1: '#4A148C', bgColor2: '#7B1FA2',
    desc: 'Storm chaos! Giant egg = big points!',
  },
  {
    name: 'Dragon Farm', hens: 4, spawnRate: 0.9, eggGravity: 0.42,
    blackChance: 0.22, powerupChance: 0.14,
    planks: 8, plankYs: [0.10, 0.165, 0.23, 0.295, 0.36, 0.425, 0.49, 0.555],
    plankAngles: [-22, 22, -22, 22, -22, 22, -22, 22],
    hasWind: true, windStrength: 0.4, hasRain: true, dragon: true,
    powerupTypes: ['golden', 'speed', 'shield', 'magnet', 'shrink', 'slowmo', 'double', 'giant', 'multi'],
    bgColor1: '#E65100', bgColor2: '#FF9800',
    desc: 'Dragon! Multi-egg splits into 3!',
  },
  {
    name: 'Lava Kingdom', hens: 4, spawnRate: 0.85, eggGravity: 0.45,
    blackChance: 0.25, powerupChance: 0.15,
    planks: 8, plankYs: [0.09, 0.155, 0.22, 0.285, 0.35, 0.415, 0.48, 0.545],
    plankAngles: [25, -25, 25, -25, 25, -25, 25, -25],
    hasWind: true, windStrength: 0.6, hasRain: true, dragon: true,
    powerupTypes: ['golden', 'speed', 'shield', 'magnet', 'shrink', 'slowmo', 'double', 'giant', 'multi', 'rainbow'],
    bgColor1: '#B71C1C', bgColor2: '#E65100',
    desc: 'FINAL: Lava, Dragon, Rainbow! Everything!',
  },
];

// ============================================================
// BASKET
// ============================================================
function createBasket() {
  return {
    x: W/2, y: H - 45 * SCALE,
    width: 75 * SCALE, height: 42 * SCALE,
    speed: 8 * SCALE, dir: 0,
    shield: false, shieldTimer: 0, magnet: false, magnetTimer: 0,
    slowmo: false, slowmoTimer: 0, doublePoints: false, doubleTimer: 0,
    big: false, bigTimer: 0, rainbow: false, rainbowTimer: 0,
    speedBoostTimer: 0,
  };
}

// ============================================================
// HEN
// ============================================================
function createHen(x) {
  return {
    x: x,
    y: 80 * SCALE,  // Below the UI bar
    width: 45 * SCALE,
    height: 45 * SCALE,
    animTimer: 0,
    laying: false,
    layTimer: Math.random() * 1000 + 500,
  };
}

// ============================================================
// EGG
// ============================================================
function createEgg(x, y, type = 'normal') {
  return {
    x, y, vx: (Math.random() - 0.5) * 0.5 * SCALE,
    vy: 2 * SCALE,
    width: 18 * SCALE, height: 24 * SCALE,
    type, rotation: 0, active: true, bounces: 0,
    rolling: false, rollSpeed: 0, rollDir: 0, currentPlank: -1,
  };
}

// ============================================================
// OBSTACLE
// ============================================================
function createObstacle(type, x, y) {
  const sizes = {
    rock1: { w: 50, h: 35 },
    rock2: { w: 60, h: 40 },
    bush1: { w: 45, h: 30 },
    bush2: { w: 50, h: 35 },
    corn1: { w: 30, h: 50 },
    corn2: { w: 35, h: 55 },
    wind1: { w: 80, h: 30 },
    rain1: { w: 60, h: 25 },
    fox1: { w: 45, h: 40 },
    dragon1: { w: 70, h: 50 },
  };
  const s = sizes[type] || { w: 40, h: 30 };
  return {
    type: type,
    x: x,
    y: y,
    width: s.w * SCALE,
    height: s.h * SCALE,
    animTimer: Math.random() * 1000,
  };
}

// ============================================================
// PARTICLES
// ============================================================
function spawnParticles(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    game.particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 6 * SCALE,
      vy: (Math.random() - 0.5) * 6 * SCALE - 2,
      life: 1,
      color: color,
      size: (Math.random() * 4 + 2) * SCALE,
    });
  }
}

// ============================================================
// INIT LEVEL
// ============================================================
function initLevel(level) {
  const config = LEVELS[level - 1];
  game.hens = []; game.eggs = []; game.obstacles = [];
  game.powerups = []; game.particles = [];
  game.basket = createBasket();
  game.spawnTimer = 0; game.combo = 0; game.comboTimer = 0;
  game.timeLeft = game.levelTime; game.levelStartTime = performance.now();
  game.shakeAmount = 0;
  game.hasWind = config.hasWind || false;
  game.hasRain = config.hasRain || false;

  const henSpacing = W / (config.hens + 1);
  for (let i = 0; i < config.hens; i++) {
    game.hens.push(createHen(henSpacing * (i + 1)));
  }

  // Create wooden planks
  const margin = 50 * SCALE;
  const usableW = W - margin * 2;
  for (let i = 0; i < config.planks; i++) {
    const py = config.plankYs[i];
    const yPos = 100 * SCALE + py * (H - 200 * SCALE);
    const angle = (config.plankAngles[i] || 0) * Math.PI / 180;
    const pWidth = (0.22 + Math.random() * 0.18) * usableW;
    const offsetX = (Math.random() - 0.5) * usableW * 0.4;
    const xPos = margin + usableW * 0.5 + offsetX;
    game.obstacles.push({
      type: 'plank', x: xPos, y: yPos, width: pWidth, height: 16 * SCALE,
      angle, index: i,
    });
  }
  game.obstacles.sort((a, b) => a.y - b.y);
  // Update plank indices after sorting
  game.obstacles.forEach((o, i) => o.index = i);
}

// ============================================================
// INPUT
// ============================================================
const keys = {};
window.addEventListener('keydown', e => { keys[e.key] = true; });
window.addEventListener('keyup', e => { keys[e.key] = false; });

// Touch controls
let touchLeft = false, touchRight = false;
function setupTouch() {
  const leftBtn = document.createElement('button');
  leftBtn.textContent = '◀';
  leftBtn.id = 'leftBtn';
  const rightBtn = document.createElement('button');
  rightBtn.textContent = '▶';
  rightBtn.id = 'rightBtn';
  controlsDiv.appendChild(leftBtn);
  controlsDiv.appendChild(rightBtn);

  leftBtn.addEventListener('touchstart', e => { e.preventDefault(); touchLeft = true; });
  leftBtn.addEventListener('touchend', e => { e.preventDefault(); touchLeft = false; });
  rightBtn.addEventListener('touchstart', e => { e.preventDefault(); touchRight = true; });
  rightBtn.addEventListener('touchend', e => { e.preventDefault(); touchRight = false; });
  leftBtn.addEventListener('mousedown', e => { e.preventDefault(); touchLeft = true; });
  leftBtn.addEventListener('mouseup', e => { e.preventDefault(); touchLeft = false; });
  rightBtn.addEventListener('mousedown', e => { e.preventDefault(); touchRight = true; });
  rightBtn.addEventListener('mouseup', e => { e.preventDefault(); touchRight = false; });
}
setupTouch();

// ============================================================
// UPDATE
// ============================================================
function update(dt) {
  if (game.state !== 'playing') return;

  const config = LEVELS[game.level - 1];
  const slowFactor = game.basket.slowmo ? 0.5 : 1;
  const effectiveDt = dt * slowFactor;

  // Update time
  game.timeLeft -= dt;
  if (game.timeLeft <= 0) {
    game.state = 'levelComplete';
    showLevelComplete();
    return;
  }

  // Basket movement
  const basket = game.basket;
  if (keys['ArrowLeft'] || keys['a'] || keys['A'] || touchLeft) basket.dir = -1;
  else if (keys['ArrowRight'] || keys['d'] || keys['D'] || touchRight) basket.dir = 1;
  else basket.dir = 0;
  basket.x += basket.dir * basket.speed;
  basket.x = Math.max(basket.width / 2, Math.min(W - basket.width / 2, basket.x));

  // Powerup timers
  if (basket.speedBoostTimer > 0) { basket.speedBoostTimer -= dt; if (basket.speedBoostTimer <= 0) basket.speed = 6 * SCALE; }
  if (basket.shieldTimer > 0) { basket.shieldTimer -= dt; if (basket.shieldTimer <= 0) basket.shield = false; }
  if (basket.magnetTimer > 0) { basket.magnetTimer -= dt; if (basket.magnetTimer <= 0) basket.magnet = false; }
  if (basket.slowmoTimer > 0) { basket.slowmoTimer -= dt; if (basket.slowmoTimer <= 0) basket.slowmo = false; }
  if (basket.doubleTimer > 0) { basket.doubleTimer -= dt; if (basket.doubleTimer <= 0) basket.doublePoints = false; }
  if (basket.bigTimer > 0) { basket.bigTimer -= dt; if (basket.bigTimer <= 0) basket.big = false; }
  if (basket.rainbowTimer > 0) { basket.rainbowTimer -= dt; if (basket.rainbowTimer <= 0) basket.rainbow = false; }

  // Update basket size
  basket.width = (basket.big ? 105 : 70) * SCALE;

  // Spawn eggs
  game.spawnTimer -= dt;
  if (game.spawnTimer <= 0) {
    game.spawnTimer = config.spawnRate;
    const hen = game.hens[Math.floor(Math.random() * game.hens. length)];
    let type = 'normal';
    const r = Math.random();
    if (r < config.blackChance) {
      type = 'black';
    } else if (r < config.blackChance + config.powerupChance) {
      type = config.powerupTypes[Math.floor(Math.random() * config.powerupTypes.length)];
    }
    game.eggs.push(createEgg(hen.x, hen.y + hen.height / 2, type));
  }

  // Update hens animation
  game.hens.forEach(hen => {
    hen.animTimer += dt;
  });

  // Update eggs - New physics: vertical fall + roll on planks
  const gravity = config.eggGravity * SCALE;
  const planks = game.obstacles.filter(o => o.type === 'plank');
  
  game.eggs.forEach(egg => {
    if (!egg.active) return;
    
    if (egg.rolling) {
      // Rolling along a plank
      egg.x += egg.rollSpeed * egg.rollDir * effectiveDt * 60;
      const currentPlank = planks.find(p => p.index === egg.currentPlank);
      if (currentPlank) {
        egg.y = currentPlank.y - currentPlank.height/2 - egg.height/2;
        // Check if rolled off the edge
        const pLeft = currentPlank.x - currentPlank.width/2;
        const pRight = currentPlank.x + currentPlank.width/2;
        if (egg.x < pLeft - egg.width/2 || egg.x > pRight + egg.width/2) {
          egg.rolling = false;
          egg.vy = 4 * SCALE;
          egg.vx = egg.rollDir * 1.5 * SCALE;
          egg.currentPlank = -1;
        }
      } else {
        egg.rolling = false;
      }
    } else {
      // Falling vertically
      egg.vy += gravity * effectiveDt * 60;
      egg.vy = Math.min(egg.vy, 14 * SCALE);
      egg.x += egg.vx * effectiveDt * 60;
      egg.y += egg.vy * effectiveDt * 60;
      egg.rotation += egg.vx * 0.03 * effectiveDt * 60;

      // Wind effect
      if (game.hasWind) {
        egg.vx += Math.sin(performance.now()/500 + egg.x) * config.windStrength * 0.5 * SCALE * effectiveDt;
      }

      // Magnet attraction
      if (basket.magnet) {
        const dx = basket.x - egg.x;
        const dy = basket.y - egg.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 10 && dist < 180*SCALE) {
          egg.vx += (dx/dist) * 3 * SCALE * effectiveDt;
          egg.vy += (dy/dist) * 2 * SCALE * effectiveDt;
        }
      }

      // Wall bounce
      if (egg.x < egg.width/2) { egg.x = egg.width/2; egg.vx = Math.abs(egg.vx)*0.6; }
      if (egg.x > W - egg.width/2) { egg.x = W - egg.width/2; egg.vx = -Math.abs(egg.vx)*0.6; }

      // Check collision with planks
      for (let pi = 0; pi < planks.length; pi++) {
        if (egg.vy <= 0) continue;
        const p = planks[pi];
        // Check if egg is above and hitting the plank
        if (egg.y + egg.height/2 > p.y - p.height/2 - 5 && 
            egg.y + egg.height/2 < p.y + p.height/2 &&
            egg.x > p.x - p.width/2 - egg.width/2 &&
            egg.x < p.x + p.width/2 + egg.width/2 &&
            egg.vy > 1) {
          
          // Hit the plank! Roll left or right
          const hitPos = (egg.x - p.x) / (p.width/2);
          egg.rollDir = Math.random() < 0.5 + hitPos * 0.3 ? 1 : -1;
          egg.rolling = true;
          egg.rollSpeed = 2.5 + Math.random() * 2.5;
          egg.y = p.y - p.height/2 - egg.height/2;
          egg.vy = 0;
          egg.vx = 0;
          egg.currentPlank = p.index;
          spawnParticles(egg.x, p.y - p.height/2, '#8B4513', 4);
          break;
        }
      }
    }

    // Basket collision
    const bLeft = basket.x - basket.width/2;
    const bRight = basket.x + basket.width/2;
    const bTop = basket.y - basket.height/2;
    const bBottom = basket.y + basket.height/2;

    if (egg.x + egg.width/2 > bLeft && egg.x - egg.width/2 < bRight &&
        egg.y + egg.height/2 > bTop && egg.y - egg.height/2 < bBottom) {
      egg.active = false;
      handleEggCatch(egg);
    }

    // Off screen
    if (egg.y > H + 50) {
      egg.active = false;
      if (egg.type !== 'black') {
        game.combo = 0;
      }
    }
  });

  // Clean up inactive eggs
  game.eggs = game.eggs.filter(e => e.active);

  // Update particles
  game.particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.1 * SCALE;
    p.life -= 0.02;
  });
  game.particles = game.particles.filter(p => p.life > 0);

  // Combo timer
  if (game.comboTimer > 0) {
    game.comboTimer -= dt;
    if (game.comboTimer <= 0) game.combo = 0;
  }

  // Shake decay
  if (game.shakeAmount > 0) game.shakeAmount *= 0.9;
  if (game.shakeAmount < 0.1) game.shakeAmount = 0;

  // Flash decay
  if (game.flashTimer > 0) game.flashTimer -= dt;
}

// ============================================================
// HANDLE EGG CATCH
// ============================================================
function handleEggCatch(egg) {
  const basket = game.basket;
  let points = 10;
  let particleColor = '#FFD700';

  switch (egg.type) {
    case 'black':
      if (basket.shield) {
        basket.shield = false;
        basket.shieldTimer = 0;
        particleColor = '#4FC3F7';
        spawnParticles(egg.x, egg.y, particleColor, 12);
        showText(egg.x, egg.y, 'BLOCKED!', '#4FC3F7');
        playSound('hit');
      } else {
        game.lives--;
        game.combo = 0;
        particleColor = '#333';
        spawnParticles(egg.x, egg.y, '#FF0000', 15);
        showText(egg.x, egg.y, '-1 LIFE', '#FF0000');
        game.shakeAmount = 10;
        game.flashTimer = 0.3;
        game.flashColor = 'rgba(255,0,0,0.3)';
        playSound('bad');
        if (game.lives <= 0) {
          game.state = 'gameOver';
          showGameOver();
          return;
        }
      }
      break;
    case 'golden':
      points = 50;
      particleColor = '#FFD700';
      spawnParticles(egg.x, egg.y, particleColor, 20);
      showText(egg.x, egg.y, '+50', '#FFD700');
      playSound('golden');
      break;
    case 'speed':
      points = 15;
      basket.speed = 9 * SCALE;
      basket.speedBoostTimer = 5;
      particleColor = '#00E676';
      spawnParticles(egg.x, egg.y, particleColor, 15);
      showText(egg.x, egg.y, 'SPEED!', '#00E676');
      playSound('powerup');
      break;
    case 'shield':
      points = 15;
      basket.shield = true;
      basket.shieldTimer = 15;
      particleColor = '#4FC3F7';
      spawnParticles(egg.x, egg.y, particleColor, 15);
      showText(egg.x, egg.y, 'SHIELD!', '#4FC3F7');
      playSound('powerup');
      break;
    case 'magnet':
      points = 15;
      basket.magnet = true;
      basket.magnetTimer = 10;
      particleColor = '#E91E63';
      spawnParticles(egg.x, egg.y, particleColor, 15);
      showText(egg.x, egg.y, 'MAGNET!', '#E91E63');
      playSound('powerup');
      break;
    case 'shrink':
      points = 15;
      basket.big = true;
      basket.bigTimer = 12;
      particleColor = '#9C27B0';
      spawnParticles(egg.x, egg.y, particleColor, 15);
      showText(egg.x, egg.y, 'BIG BASKET!', '#9C27B0');
      playSound('powerup');
      break;
    case 'slowmo':
      points = 15;
      basket.slowmo = true;
      basket.slowmoTimer = 8;
      particleColor = '#00BCD4';
      spawnParticles(egg.x, egg.y, particleColor, 15);
      showText(egg.x, egg.y, 'SLOW-MO!', '#00BCD4');
      playSound('powerup');
      break;
    case 'double':
      points = 15;
      basket.doublePoints = true;
      basket.doubleTimer = 10;
      particleColor = '#FF9800';
      spawnParticles(egg.x, egg.y, particleColor, 15);
      showText(egg.x, egg.y, '2X POINTS!', '#FF9800');
      playSound('powerup');
      break;
    case 'giant':
      points = 100;
      particleColor = '#FF5722';
      spawnParticles(egg.x, egg.y, particleColor, 25);
      showText(egg.x, egg.y, '+100 GIANT!', '#FF5722');
      game.shakeAmount = 5;
      playSound('golden');
      break;
    case 'multi':
      points = 5;
      // Spawn 3 mini eggs
      for (let i = 0; i < 3; i++) {
        const mini = createEgg(egg.x, egg.y, 'normal');
        mini.vx = (i - 1) * 3 * SCALE;
        mini.vy = -2;
        game.eggs.push(mini);
      }
      particleColor = '#E040FB';
      spawnParticles(egg.x, egg.y, particleColor, 20);
      showText(egg.x, egg.y, 'MULTI!', '#E040FB');
      playSound('powerup');
      break;
    case 'rainbow':
      points = 30;
      basket.shield = true; basket.shieldTimer = 10;
      basket.magnet = true; basket.magnetTimer = 10;
      basket.doublePoints = true; basket.doubleTimer = 10;
      basket.big = true; basket.bigTimer = 10;
      particleColor = '#FFFFFF';
      spawnParticles(egg.x, egg.y, '#FF0000', 10);
      spawnParticles(egg.x, egg.y, '#00FF00', 10);
      spawnParticles(egg.x, egg.y, '#0000FF', 10);
      showText(egg.x, egg.y, '🌈 RAINBOW!', '#FF69B4');
      game.shakeAmount = 8;
      playSound('golden');
      break;
    default:
      // Normal egg
      particleColor = '#FFD700';
      spawnParticles(egg.x, egg.y, '#90EE90', 8);
      playSound('catch');
      break;
  }

  // Combo
  game.combo++;
  game.comboTimer = 2;
  if (game.combo > 1) {
    points += game.combo * 2;
  }

  // Double points
  if (basket.doublePoints) points *= 2;

  game.score += points;
  updateUI();
}

// Floating texts
let floatingTexts = [];
function showText(x, y, text, color) {
  floatingTexts.push({ x, y, text, color, life: 1 });
}

// ============================================================
// AUDIO (Web Audio API - procedural sounds)
// ============================================================
let audioCtx = null;
function initAudio() {
  if (audioCtx) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch(e) { /* no audio support */ }
}

function playSound(type) {
  if (muted) return;
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  const now = audioCtx.currentTime;

  switch(type) {
    case 'catch':
      osc.frequency.setValueAtTime(523, now); // C5
      osc.frequency.setValueAtTime(659, now + 0.1); // E5
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now); osc.stop(now + 0.2);
      break;
    case 'golden':
      osc.frequency.setValueAtTime(523, now);
      osc.frequency.setValueAtTime(659, now + 0.08);
      osc.frequency.setValueAtTime(784, now + 0.16);
      osc.frequency.setValueAtTime(1047, now + 0.24);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.start(now); osc.stop(now + 0.35);
      break;
    case 'bad':
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.3);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now); osc.stop(now + 0.3);
      break;
    case 'powerup':
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(554, now + 0.06);
      osc.frequency.setValueAtTime(659, now + 0.12);
      osc.frequency.setValueAtTime(880, now + 0.18);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now); osc.stop(now + 0.3);
      break;
    case 'levelup':
      [523, 659, 784, 1047].forEach((freq, i) => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.connect(g); g.connect(audioCtx.destination);
        o.frequency.setValueAtTime(freq, now + i * 0.1);
        g.gain.setValueAtTime(0.25, now + i * 0.1);
        g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.3);
        o.start(now + i * 0.1); o.stop(now + i * 0.1 + 0.3);
      });
      break;
    case 'hit':
      osc.type = 'square';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now); osc.stop(now + 0.1);
      break;
  }
}

// ============================================================
// DRAW
// ============================================================
function draw() {
  if (!ctx) return;
  
  const config = LEVELS[game.level - 1] || LEVELS[0];

  ctx.save();

  // Screen shake
  if (game.shakeAmount > 0) {
    const sx = (Math.random() - 0.5) * game.shakeAmount;
    const sy = (Math.random() - 0.5) * game.shakeAmount;
    ctx.translate(sx, sy);
  }

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, config.bgColor1);
  grad.addColorStop(1, config.bgColor2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Only draw game objects if game has been initialized
  if (game.state === 'playing' || game.state === 'levelComplete' || game.state === 'gameOver') {
    // Background decorations (clouds, grass)
    drawBackground(config);

    // Draw planks
    game.obstacles.forEach(obs => drawPlank(obs));

    // Draw hens
    game.hens.forEach(hen => drawHen(hen));

    // Draw eggs
    game.eggs.forEach(egg => drawEgg(egg));

    // Draw basket
    if (game.basket) drawBasket(game.basket);
  }

  // Draw particles (always)
  game.particles.forEach(p => {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  // Floating texts
  floatingTexts.forEach(ft => {
    ft.y -= 1.5;
    ft.life -= 0.02;
    ctx.globalAlpha = ft.life;
    ctx.fillStyle = ft.color;
    ctx.font = `bold ${16 * SCALE}px Comic Sans MS`;
    ctx.textAlign = 'center';
    ctx.fillText(ft.text, ft.x, ft.y);
  });
  ctx.globalAlpha = 1;
  floatingTexts = floatingTexts.filter(ft => ft.life > 0);

  // Combo display
  if (game.combo > 1) {
    ctx.fillStyle = '#FFD700';
    ctx.font = `bold ${20 * SCALE}px Comic Sans MS`;
    ctx.textAlign = 'center';
    ctx.globalAlpha = game.comboTimer / 2;
    ctx.fillText(`COMBO x${game.combo}!`, W / 2, H / 2 - 50 * SCALE);
    ctx.globalAlpha = 1;
  }

  // Flash overlay
  if (game.flashTimer > 0) {
    ctx.fillStyle = game.flashColor;
    ctx.globalAlpha = game.flashTimer;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

// ============================================================
// DRAW BACKGROUND
// ============================================================
function drawBackground(config) {
  // Clouds
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  const time = performance.now() / 5000;
  for (let i = 0; i < 5; i++) {
    const cx = ((i * 120 + time * 30 * (i % 2 + 1)) % (W + 100)) - 50;
    const cy = 30 + i * 25;
    drawCloud(cx, cy, 30 + i * 5);
  }

  // Ground
  ctx.fillStyle = '#7CB342';
  ctx.fillRect(0, H - 30 * SCALE, W, 30 * SCALE);
  ctx.fillStyle = '#558B2F';
  for (let i = 0; i < W; i += 20) {
    ctx.beginPath();
    ctx.moveTo(i, H - 30 * SCALE);
    ctx.lineTo(i + 5, H - 40 * SCALE);
    ctx.lineTo(i + 10, H - 30 * SCALE);
    ctx.fill();
  }
}

function drawCloud(x, y, size) {
  ctx.beginPath();
  ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
  ctx.arc(x + size * 0.4, y - size * 0.1, size * 0.4, 0, Math.PI * 2);
  ctx.arc(x + size * 0.8, y, size * 0.35, 0, Math.PI * 2);
  ctx.arc(x + size * 0.4, y + size * 0.1, size * 0.3, 0, Math.PI * 2);
  ctx.fill();
}

// ============================================================
// DRAW HEN
// ============================================================
function drawHen(hen) {
  const x = hen.x;
  const y = hen.y;
  const s = hen.width / 45;
  const bob = Math.sin(hen.animTimer * 3) * 3 * s;

  ctx.save();
  ctx.translate(x, y + bob);

  // Try to use image asset
  if (assets.hen) {
    const hw = hen.width * 1.2;
    const hh = hen.height * 1.2;
    ctx.drawImage(assets.hen, -hw/2, -hh/2, hw, hh);
  } else {
    // Fallback: drawn hen
    ctx.fillStyle = '#FFF8E1';
    ctx.beginPath();
    ctx.ellipse(0, 0, 22 * s, 20 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFB74D';
    ctx.lineWidth = 2 * s;
    ctx.stroke();

    ctx.fillStyle = '#FFE0B2';
    ctx.beginPath();
    ctx.ellipse(-10 * s, 5 * s, 12 * s, 10 * s, -0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFF8E1';
    ctx.beginPath();
    ctx.arc(15 * s, -15 * s, 14 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFB74D';
    ctx.stroke();

    ctx.fillStyle = '#F44336';
    ctx.beginPath();
    ctx.moveTo(10 * s, -26 * s);
    ctx.lineTo(13 * s, -33 * s);
    ctx.lineTo(16 * s, -26 * s);
    ctx.lineTo(19 * s, -33 * s);
    ctx.lineTo(22 * s, -26 * s);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(20 * s, -16 * s, 3 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(21 * s, -17 * s, 1.2 * s, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FF8F00';
    ctx.beginPath();
    ctx.moveTo(27 * s, -14 * s);
    ctx.lineTo(35 * s, -12 * s);
    ctx.lineTo(27 * s, -10 * s);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255,150,150,0.5)';
    ctx.beginPath();
    ctx.ellipse(22 * s, -10 * s, 4 * s, 3 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FF8F00';
    ctx.fillRect(-8 * s, 18 * s, 6 * s, 8 * s);
    ctx.fillRect(4 * s, 18 * s, 6 * s, 8 * s);
  }

  ctx.restore();
}

// ============================================================
// DRAW EGG
// ============================================================
function drawEgg(egg) {
  ctx.save();
  ctx.translate(egg.x, egg.y);
  ctx.rotate(egg.rotation);

  const w = egg.width;
  const h = egg.height;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  ctx.beginPath();
  ctx.ellipse(2, h / 2 + 3, w / 2, h / 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Egg body colors by type
  const colors = {
    normal: { body: '#FFFDE7', spot: '#FFE082' },
    black: { body: '#37474F', spot: '#546E7A' },
    golden: { body: '#FFD700', spot: '#FFF176' },
    speed: { body: '#00E676', spot: '#69F0AE' },
    shield: { body: '#4FC3F7', spot: '#81D4FA' },
    magnet: { body: '#E91E63', spot: '#F48FB1' },
    shrink: { body: '#9C27B0', spot: '#CE93D8' },
    slowmo: { body: '#00BCD4', spot: '#80DEEA' },
    double: { body: '#FF9800', spot: '#FFCC80' },
    giant: { body: '#FF5722', spot: '#FFAB91' },
    multi: { body: '#E040FB', spot: '#EA80FC' },
    rainbow: { body: '#FFFFFF', spot: '#FF69B4' },
  };

  const c = colors[egg.type] || colors.normal;

  // Egg body
  ctx.fillStyle = c.body;
  ctx.beginPath();
  ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Spots
  ctx.fillStyle = c.spot;
  ctx.beginPath();
  ctx.arc(-w * 0.15, -h * 0.1, w * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(w * 0.15, h * 0.15, w * 0.08, 0, Math.PI * 2);
  ctx.fill();

  // Glow for special eggs
  if (egg.type !== 'normal' && egg.type !== 'black') {
    ctx.shadowColor = c.body;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.strokeStyle = c.body;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Rainbow effect
  if (egg.type === 'rainbow') {
    const hue = (performance.now() / 10) % 360;
    ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2 + 2, h / 2 + 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Black egg skull icon
  if (egg.type === 'black') {
    ctx.fillStyle = '#FFF';
    ctx.font = `${12 * SCALE}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💀', 0, 0);
  }

  ctx.restore();
}

// ============================================================
// DRAW OBSTACLE
// ============================================================
function drawPlank(p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle || 0);
  
  const w = p.width;
  const h = p.height;
  
  // Wooden plank body
  ctx.fillStyle = '#8B5A2B';
  ctx.strokeStyle = '#5D3A1A';
  ctx.lineWidth = 2 * SCALE;
  
  // Rounded rectangle
  const r = 4 * SCALE;
  ctx.beginPath();
  ctx.moveTo(-w/2 + r, -h/2);
  ctx.lineTo(w/2 - r, -h/2);
  ctx.quadraticCurveTo(w/2, -h/2, w/2, -h/2 + r);
  ctx.lineTo(w/2, h/2 - r);
  ctx.quadraticCurveTo(w/2, h/2, w/2 - r, h/2);
  ctx.lineTo(-w/2 + r, h/2);
  ctx.quadraticCurveTo(-w/2, h/2, -w/2, h/2 - r);
  ctx.lineTo(-w/2, -h/2 + r);
  ctx.quadraticCurveTo(-w/2, -h/2, -w/2 + r, -h/2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  // Wood grain lines
  ctx.strokeStyle = '#A0722B';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const xPos = -w/2 + (i+1) * w/6;
    ctx.beginPath();
    ctx.moveTo(xPos, -h/2 + 2);
    ctx.lineTo(xPos, h/2 - 2);
    ctx.stroke();
  }
  
  // Top highlight
  ctx.fillStyle = 'rgba(255,200,150,0.3)';
  ctx.fillRect(-w/2 + 3, -h/2 + 1, w - 6, 3 * SCALE);
  
  // Bottom shadow
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(-w/2 + 3, h/2 - 4 * SCALE, w - 6, 3 * SCALE);
  
  ctx.restore();
}

// ============================================================
// DRAW BASKET
// ============================================================
function drawBasket(basket) {
  ctx.save();
  ctx.translate(basket.x, basket.y);

  const w = basket.width;
  const h = basket.height;

  // Shield glow
  if (basket.shield) {
    ctx.strokeStyle = '#4FC3F7';
    ctx.lineWidth = 3 * SCALE;
    ctx.globalAlpha = 0.5 + Math.sin(performance.now() / 200) * 0.3;
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2 + 8 * SCALE, h / 2 + 8 * SCALE, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Magnet indicator
  if (basket.magnet) {
    ctx.strokeStyle = '#E91E63';
    ctx.lineWidth = 2 * SCALE;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2 + 15 * SCALE, h / 2 + 15 * SCALE, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Try to use image asset
  if (assets.basket) {
    const bw = w * 1.3;
    const bh = h * 1.5;
    ctx.drawImage(assets.basket, -bw/2, -bh/2, bw, bh);
  } else {
    // Fallback: drawn basket
    ctx.fillStyle = '#8D6E63';
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 4);
    ctx.lineTo(-w / 2 - 3 * SCALE, h / 2);
    ctx.lineTo(w / 2 + 3 * SCALE, h / 2);
    ctx.lineTo(w / 2, -h / 4);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#6D4C41';
    ctx.lineWidth = 1.5 * SCALE;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-w / 2 + i * w / 7, -h / 4);
      ctx.lineTo(-w / 2 - 3 * SCALE + i * w / 7, h / 2);
      ctx.stroke();
    }
    for (let i = 0; i < 3; i++) {
      const yy = -h / 4 + i * h / 3;
      ctx.beginPath();
      ctx.moveTo(-w / 2, yy);
      ctx.lineTo(w / 2, yy);
      ctx.stroke();
    }

    ctx.fillStyle = '#A1887F';
    ctx.beginPath();
    ctx.ellipse(0, -h / 4, w / 2 + 3 * SCALE, 5 * SCALE, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Double points indicator
  if (basket.doublePoints) {
    ctx.fillStyle = '#FF9800';
    ctx.font = `bold ${10 * SCALE}px Comic Sans MS`;
    ctx.textAlign = 'center';
    ctx.fillText('2X', 0, h / 2 + 12 * SCALE);
  }

  // Rainbow aura
  if (basket.rainbow) {
    const hue = (performance.now() / 5) % 360;
    ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
    ctx.lineWidth = 4 * SCALE;
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2 + 5 * SCALE, h / 2 + 5 * SCALE, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

// ============================================================
// UI
// ============================================================
let muted = false;
function toggleMute() {
  muted = !muted;
  document.getElementById('muteBtn').textContent = muted ? '🔇' : '🔊';
}

function updateUI() {
  const livesStr = '❤️'.repeat(game.lives) + '🖤'.repeat(Math.max(0, 7 - game.lives));
  const pct = Math.max(0, (game.timeLeft / game.levelTime) * 100);
  ui.innerHTML = `
    <div style="position:relative;">
      <div class="lives">${livesStr}</div>
      <div class="level">Level ${game.level}: ${LEVELS[game.level - 1].name}</div>
      <div class="timer-bar"><div class="timer-fill" style="width: ${pct}%"></div></div>
    </div>
    <div style="display:flex;align-items:center;gap:10px;">
      <div class="score">⭐ ${game.score}</div>
      <button id="muteBtn" onclick="toggleMute()" style="background:none;border:none;font-size:20px;cursor:pointer;">🔊</button>
    </div>
  `;
}

// ============================================================
// SCREENS
// ============================================================
function showStartScreen() {
  startScreen.classList.remove('hidden');
  game.state = 'start';
  startScreen.innerHTML = `
    <h1>🐔 Hen Lay Egg 🥚</h1>
    <p>Catch eggs falling from hens!</p>
    <p>🟡 Golden = Bonus | 💀 Black = Danger</p>
    <p>🌈 Special eggs give superpowers!</p>
    <p>Survive 60 seconds per level, 10 levels total!</p>
    <button class="btn" onclick="showLevelSelect()">🎮 PLAY</button>
    <p style="font-size:13px; margin-top:12px; opacity:0.6;">
      Desktop: ← → Arrow keys<br>
      Mobile: Touch buttons
    </p>
    <p style="font-size:12px; margin-top:10px; opacity:0.5;">
      🛡️ Shield blocks 1 black egg | 🧲 Magnet attracts eggs<br>
      ⚡ Speed boost | 📦 Big basket | ⏱️ Slow-mo | ✨ Double points
    </p>
  `;
}

function showGameOver() {
  gameOverScreen.classList.remove('hidden');
  gameOverScreen.innerHTML = `
    <h2>💔 Game Over!</h2>
    <p style="font-size:24px; margin:10px 0;">Score: ⭐ ${game.score}</p>
    <p style="font-size:18px;">Reached Level ${game.level}</p>
    <button class="btn" onclick="restartGame()">🔄 TRY AGAIN</button>
  `;
}

function showLevelSelect() {
  game.state = 'levelSelect';
  startScreen.classList.add('hidden');
  levelScreen.classList.remove('hidden');
  
  let gridHTML = '';
  LEVELS.forEach((lvl, i) => {
    const num = i + 1;
    const unlocked = num <= game.unlockedLevels;
    const stars = game.highScores[num] ? '⭐'.repeat(Math.min(3, Math.floor(game.highScores[num]/200)+1)) : '';
    gridHTML += `
      <div class="level-card ${unlocked ? 'unlocked' : 'locked'}" 
           onclick="${unlocked ? `selectLevel(${num})` : ''}">
        <div class="level-num">${unlocked ? num : '🔒'}</div>
        <div class="level-name">${lvl.name}</div>
        <div class="level-stars">${stars}</div>
        <div class="level-desc">${lvl.planks} planks</div>
      </div>
    `;
  });
  
  levelScreen.innerHTML = `<h2>Select Level</h2>
    <div class="level-grid">${gridHTML}</div>
    <button class="btn" onclick="showStartScreen()" style="margin-top:12px;padding:10px 25px;font-size:16px;">← Back</button>`;
}

function selectLevel(num) {
  game.level = num;
  game.lives = 7;
  game.score = 0;
  levelScreen.classList.add('hidden');
  initLevel(num);
  game.state = 'playing';
  updateUI();
}

function showLevelComplete() {
  game.state = 'levelComplete';
  levelScreen.classList.remove('hidden');
  
  if (!game.highScores[game.level] || game.score > game.highScores[game.level]) {
    game.highScores[game.level] = game.score;
  }
  if (game.level >= game.unlockedLevels && game.level < 10) {
    game.unlockedLevels = game.level + 1;
  }
  
  const hasNext = game.level < 10;
  const nextConfig = LEVELS[game.level] || null;
  
  levelScreen.innerHTML = `<h2>🎉 Level ${game.level} Complete!</h2>
    <p style="font-size:22px;margin:6px 0;">Score: ⭐${game.score}</p>
    <p style="color:#90EE90;">Lives: ${'❤️'.repeat(game.lives)}</p>
    ${hasNext ? `<p style="font-size:13px;color:#FFD700;margin-top:6px;">Next: ${nextConfig.name}</p>` : '<p style="font-size:18px;color:#FFD700;margin-top:6px;">🏆 ALL LEVELS COMPLETE! 🏆</p>'}
    <button class="btn" onclick="nextLevel()" style="margin-top:10px;">${hasNext?'➡️ NEXT LEVEL':'🏆 FINISH'}</button>
    <button class="btn" onclick="showLevelSelect()" style="margin-top:6px;padding:10px 25px;font-size:16px;">📋 Levels</button>`;
}

function nextLevel() {
  levelScreen.classList.add('hidden');
  if (game.level >= 10) {
    gameOverScreen.classList.remove('hidden');
    gameOverScreen.innerHTML = `<h2 style="color:#FFD700;">🏆 YOU WIN! 🏆</h2><p style="font-size:22px;">Final Score: ⭐${game.score}</p><p style="color:#90EE90;">Lives: ${'❤️'.repeat(game.lives)}</p><button class="btn" onclick="showStartScreen()">🔄 PLAY AGAIN</button>`;
    game.state = 'gameOver'; return;
  }
  game.level++;
  if (game.lives < 7 && game.level % 2 === 0) game.lives++;
  initLevel(game.level);
  game.state = 'playing';
  updateUI();
}

function showGameOver() {
  gameOverScreen.classList.remove('hidden');
  gameOverScreen.innerHTML = `<h2>💔 Game Over!</h2><p style="font-size:22px;">Score: ⭐${game.score}</p><p>Level: ${game.level}</p>
    <button class="btn" onclick="retryLevel()">🔄 RETRY</button>
    <button class="btn" onclick="showLevelSelect()" style="margin-top:6px;padding:10px 25px;font-size:16px;">📋 Levels</button>`;
}

function retryLevel() {
  gameOverScreen.classList.add('hidden');
  game.lives = 7; game.score = 0;
  initLevel(game.level);
  game.state = 'playing';
  updateUI();
}

// ============================================================
// MAIN LOOP
// ============================================================
let lastFrameTime = 0;
function gameLoop(timestamp) {
  try {
    const dt = Math.min((timestamp - lastFrameTime) / 1000, 0.05);
    lastFrameTime = timestamp;
    update(dt);
    draw();
  } catch(e) {
    console.error('Game loop error:', e.message);
  }
  requestAnimationFrame(gameLoop);
}

// Startup
resize();
try { loadAssets(); } catch(e) {}
showStartScreen();
requestAnimationFrame(gameLoop);