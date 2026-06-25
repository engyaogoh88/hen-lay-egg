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
  { // Level 1 - Tutorial
    name: 'Sunny Farm',
    hens: 1,
    spawnRate: 2.0,
    eggSpeed: 1.5,
    blackChance: 0,
    powerupChance: 0.05,
    obstacles: [],
    powerupTypes: ['golden'],
    bgColor1: '#87CEEB', bgColor2: '#98FB98',
    desc: 'Catch eggs! Use arrow keys or touch buttons.',
  },
  { // Level 2
    name: 'Duck Pond',
    hens: 1,
    spawnRate: 1.8,
    eggSpeed: 1.7,
    blackChance: 0.05,
    powerupChance: 0.08,
    obstacles: ['rock1'],
    powerupTypes: ['golden', 'speed'],
    bgColor1: '#5BA3D9', bgColor2: '#7EC8E3',
    desc: 'Watch out for rocks! Black eggs reduce life!',
  },
  { // Level 3
    name: 'Berry Bushes',
    hens: 2,
    spawnRate: 1.6,
    eggSpeed: 1.8,
    blackChance: 0.08,
    powerupChance: 0.1,
    obstacles: ['bush1', 'bush2'],
    powerupTypes: ['golden', 'speed', 'shield'],
    bgColor1: '#6BCB77', bgColor2: '#90EE90',
    desc: 'Two hens now! Shield egg protects from one black egg!',
  },
  { // Level 4
    name: 'Windy Hill',
    hens: 2,
    spawnRate: 1.4,
    eggSpeed: 2.0,
    blackChance: 0.1,
    powerupChance: 0.1,
    obstacles: ['wind1', 'rock1'],
    powerupTypes: ['golden', 'speed', 'shield', 'magnet'],
    bgColor1: '#B8E6FF', bgColor2: '#E0F7FA',
    desc: 'Wind blows eggs sideways! Magnet egg attracts eggs!',
  },
  { // Level 5
    name: 'Corn Field',
    hens: 2,
    spawnRate: 1.3,
    eggSpeed: 2.1,
    blackChance: 0.12,
    powerupChance: 0.12,
    obstacles: ['corn1', 'corn2', 'bush1'],
    powerupTypes: ['golden', 'speed', 'shield', 'magnet', 'shrink'],
    bgColor1: '#FFD93D', bgColor2: '#FFF3B0',
    desc: 'Corn blocks the way! Shrink egg makes basket bigger!',
  },
  { // Level 6
    name: 'Rainy Day',
    hens: 3,
    spawnRate: 1.2,
    eggSpeed: 2.2,
    blackChance: 0.15,
    powerupChance: 0.12,
    obstacles: ['rain1', 'rock1', 'bush2'],
    powerupTypes: ['golden', 'speed', 'shield', 'magnet', 'shrink', 'slowmo'],
    bgColor1: '#5C6BC0', bgColor2: '#9FA8DA',
    desc: 'Rain makes things slippery! Slow-mo egg slows time!',
  },
  { // Level 7
    name: 'Fox Night',
    hens: 3,
    spawnRate: 1.1,
    eggSpeed: 2.4,
    blackChance: 0.18,
    powerupChance: 0.13,
    obstacles: ['fox1', 'rock1', 'bush1'],
    powerupTypes: ['golden', 'speed', 'shield', 'magnet', 'shrink', 'slowmo', 'double'],
    bgColor1: '#2C3E50', bgColor2: '#34495E',
    desc: 'Foxes steal eggs! Double points egg appears!',
  },
  { // Level 8
    name: 'Mountain Path',
    hens: 3,
    spawnRate: 1.0,
    eggSpeed: 2.6,
    blackChance: 0.2,
    powerupChance: 0.13,
    obstacles: ['rock1', 'rock2', 'wind1', 'corn1'],
    powerupTypes: ['golden', 'speed', 'shield', 'magnet', 'shrink', 'slowmo', 'double', 'giant'],
    bgColor1: '#8D6E63', bgColor2: '#BCAAA4',
    desc: 'Bumpy path! Giant egg gives massive points!',
  },
  { // Level 9
    name: 'Storm Castle',
    hens: 4,
    spawnRate: 0.9,
    eggSpeed: 2.8,
    blackChance: 0.22,
    powerupChance: 0.14,
    obstacles: ['wind1', 'rain1', 'fox1', 'rock2', 'corn2'],
    powerupTypes: ['golden', 'speed', 'shield', 'magnet', 'shrink', 'slowmo', 'double', 'giant', 'multi'],
    bgColor1: '#4A148C', bgColor2: '#7B1FA2',
    desc: 'Storm with all obstacles! Multi-egg splits into 3!',
  },
  { // Level 10
    name: 'Dragon Farm',
    hens: 4,
    spawnRate: 0.8,
    eggSpeed: 3.0,
    blackChance: 0.25,
    powerupChance: 0.15,
    obstacles: ['dragon1', 'wind1', 'rain1', 'fox1', 'rock2', 'corn2'],
    powerupTypes: ['golden', 'speed', 'shield', 'magnet', 'shrink', 'slowmo', 'double', 'giant', 'multi', 'rainbow'],
    bgColor1: '#E65100', bgColor2: '#FF9800',
    desc: 'Final level! Rainbow egg = all powerups at once!',
  },
];

// ============================================================
// BASKET
// ============================================================
function createBasket() {
  return {
    x: W / 2,
    y: H - 60 * SCALE,
    width: 70 * SCALE,
    height: 40 * SCALE,
    speed: 6 * SCALE,
    dir: 0,
    shield: false,
    shieldTimer: 0,
    magnet: false,
    magnetTimer: 0,
    slowmo: false,
    slowmoTimer: 0,
    doublePoints: false,
    doubleTimer: 0,
    big: false,
    bigTimer: 0,
    rainbow: false,
    rainbowTimer: 0,
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
    x: x,
    y: y,
    vx: (Math.random() - 0.5) * 2 * SCALE,
    vy: 1,
    width: 18 * SCALE,
    height: 24 * SCALE,
    type: type, // normal, black, golden, speed, shield, magnet, shrink, slowmo, double, giant, multi, rainbow
    rotation: 0,
    active: true,
    bounces: 0,
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
  game.hens = [];
  game.eggs = [];
  game.obstacles = [];
  game.powerups = [];
  game.particles = [];
  game.basket = createBasket();
  game.spawnTimer = 0;
  game.combo = 0;
  game.comboTimer = 0;
  game.timeLeft = game.levelTime;
  game.levelStartTime = performance.now();
  game.shakeAmount = 0;

  // Create hens
  const henSpacing = W / (config.hens + 1);
  for (let i = 0; i < config.hens; i++) {
    game.hens.push(createHen(henSpacing * (i + 1)));
  }

  // Create obstacles
  const availableSpace = H - 200 * SCALE;
  config.obstacles.forEach((type, i) => {
    const row = Math.floor(i / 3);
    const col = i % 3;
    const rowY = (100 + row * (availableSpace / 3)) * SCALE;
    const colX = (col + 1) * (W / 4);
    game.obstacles.push(createObstacle(type, colX, rowY));
  });
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

  // Update eggs
  const baseSpeed = config.eggSpeed * SCALE;
  game.eggs.forEach(egg => {
    if (!egg.active) return;
    egg.vy += 0.15 * SCALE * effectiveDt * 0.06;
    egg.vy = Math.min(egg.vy, baseSpeed * 2);
    egg.x += egg.vx * effectiveDt * 0.06;
    egg.y += egg.vy * effectiveDt * 0.06;
    egg.rotation += 0.02 * effectiveDt;

    // Wind effect
    game.obstacles.forEach(obs => {
      if (obs.type === 'wind1') {
        const dx = egg.x - obs.x;
        const dy = egg.y - obs.y;
        if (Math.abs(dx) < obs.width && Math.abs(dy) < obs.height) {
          egg.vx += 0.3 * SCALE * (dx > 0 ? 1 : -1) * effectiveDt * 0.06;
        }
      }
    });

    // Magnet attraction
    if (basket.magnet) {
      const dx = basket.x - egg.x;
      const dy = basket.y - egg.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 150 * SCALE) {
        egg.vx += (dx / dist) * 0.5 * SCALE * effectiveDt * 0.06;
        egg.vy += (dy / dist) * 0.3 * SCALE * effectiveDt * 0.06;
      }
    }

    // Bounce off obstacles
    game.obstacles.forEach(obs => {
      if (obs.type === 'wind1' || obs.type === 'rain1') return;
      const eggLeft = egg.x - egg.width / 2;
      const eggRight = egg.x + egg.width / 2;
      const eggTop = egg.y - egg.height / 2;
      const eggBottom = egg.y + egg.height / 2;
      const obsLeft = obs.x - obs.width / 2;
      const obsRight = obs.x + obs.width / 2;
      const obsTop = obs.y - obs.height / 2;
      const obsBottom = obs.y + obs.height / 2;

      if (eggRight > obsLeft && eggLeft < obsRight && eggBottom > obsTop && eggTop < obsBottom) {
        // Bounce
        egg.vy = -Math.abs(egg.vy) * 0.8;
        egg.y = obsTop - egg.height / 2;
        egg.bounces++;
        spawnParticles(egg.x, egg.y, '#8B4513', 3);
      }
    });

    // Wall bounce
    if (egg.x < egg.width / 2) { egg.x = egg.width / 2; egg.vx = Math.abs(egg.vx); }
    if (egg.x > W - egg.width / 2) { egg.x = W - egg.width / 2; egg.vx = -Math.abs(egg.vx); }

    // Basket collision
    const baskLeft = basket.x - basket.width / 2;
    const baskRight = basket.x + basket.width / 2;
    const baskTop = basket.y - basket.height / 2;
    const baskBottom = basket.y + basket.height / 2;

    if (eggRight > baskLeft && eggLeft < baskRight && eggBottom > baskTop && eggTop < baskBottom) {
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

    // Draw obstacles
    game.obstacles.forEach(obs => drawObstacle(obs));

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
function drawObstacle(obs) {
  ctx.save();
  ctx.translate(obs.x, obs.y);
  const s = SCALE;

  switch (obs.type) {
    case 'rock1':
    case 'rock2':
      // Rock
      ctx.fillStyle = '#78909C';
      ctx.beginPath();
      ctx.ellipse(0, 0, obs.width / 2, obs.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#90A4AE';
      ctx.beginPath();
      ctx.ellipse(-obs.width * 0.1, -obs.height * 0.1, obs.width * 0.3, obs.height * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#546E7A';
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.ellipse(0, 0, obs.width / 2, obs.height / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'bush1':
    case 'bush2':
      // Bush
      ctx.fillStyle = '#388E3C';
      ctx.beginPath();
      ctx.arc(-obs.width * 0.2, 0, obs.width * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(obs.width * 0.2, 0, obs.width * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -obs.height * 0.2, obs.width * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4CAF50';
      ctx.beginPath();
      ctx.arc(-obs.width * 0.1, -obs.height * 0.1, obs.width * 0.15, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'corn1':
    case 'corn2':
      // Corn stalk
      ctx.fillStyle = '#7CB342';
      ctx.fillRect(-5 * s, -obs.height / 2, 10 * s, obs.height);
      ctx.fillStyle = '#FDD835';
      ctx.beginPath();
      ctx.ellipse(0, -obs.height * 0.1, 12 * s, 18 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#F9A825';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc((i - 1.5) * 5 * s, -obs.height * 0.1 + (i % 2) * 8 * s, 3 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'wind1':
      // Wind indicator
      const windAlpha = 0.3 + Math.sin(performance.now() / 500) * 0.2;
      ctx.fillStyle = `rgba(200,230,255,${windAlpha})`;
      ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      ctx.strokeStyle = `rgba(100,180,255,${windAlpha + 0.2})`;
      ctx.lineWidth = 2 * s;
      // Wind lines
      for (let i = 0; i < 3; i++) {
        const wy = (i - 1) * obs.height * 0.3;
        const wx = Math.sin(performance.now() / 300 + i) * 10 * s;
        ctx.beginPath();
        ctx.moveTo(-obs.width / 2 + wx, wy);
        ctx.lineTo(obs.width / 2 + wx, wy);
        ctx.stroke();
        // Arrow
        ctx.beginPath();
        ctx.moveTo(obs.width / 2 + wx, wy);
        ctx.lineTo(obs.width / 2 - 8 * s + wx, wy - 4 * s);
        ctx.lineTo(obs.width / 2 - 8 * s + wx, wy + 4 * s);
        ctx.closePath();
        ctx.fillStyle = `rgba(100,180,255,${windAlpha + 0.2})`;
        ctx.fill();
      }
      break;
    case 'rain1':
      // Rain zone
      const rainAlpha = 0.2 + Math.sin(performance.now() / 400) * 0.1;
      ctx.fillStyle = `rgba(100,150,255,${rainAlpha})`;
      ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      // Rain drops
      ctx.strokeStyle = `rgba(150,200,255,${rainAlpha + 0.3})`;
      ctx.lineWidth = 1.5 * s;
      for (let i = 0; i < 6; i++) {
        const rx = (i / 6) * obs.width - obs.width / 2;
        const ry = ((performance.now() / 10 + i * 20) % obs.height) - obs.height / 2;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 3 * s, ry + 10 * s);
        ctx.stroke();
      }
      break;
    case 'fox1':
      // Fox
      ctx.fillStyle = '#FF7043';
      ctx.beginPath();
      ctx.ellipse(0, 5 * s, 18 * s, 14 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      // Head
      ctx.fillStyle = '#FF5722';
      ctx.beginPath();
      ctx.arc(15 * s, -5 * s, 12 * s, 0, Math.PI * 2);
      ctx.fill();
      // Ears
      ctx.beginPath();
      ctx.moveTo(8 * s, -14 * s);
      ctx.lineTo(12 * s, -24 * s);
      ctx.lineTo(18 * s, -14 * s);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(18 * s, -14 * s);
      ctx.lineTo(22 * s, -24 * s);
      ctx.lineTo(28 * s, -14 * s);
      ctx.closePath();
      ctx.fill();
      // Eyes
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(18 * s, -6 * s, 2 * s, 0, Math.PI * 2);
      ctx.fill();
      // Tail
      ctx.fillStyle = '#FFAB91';
      ctx.beginPath();
      ctx.ellipse(-18 * s, 0, 10 * s, 6 * s, 0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'dragon1':
      // Mini dragon
      ctx.fillStyle = '#E53935';
      ctx.beginPath();
      ctx.ellipse(0, 5 * s, 25 * s, 18 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      // Head
      ctx.fillStyle = '#C62828';
      ctx.beginPath();
      ctx.arc(22 * s, -5 * s, 14 * s, 0, Math.PI * 2);
      ctx.fill();
      // Wings
      ctx.fillStyle = '#EF5350';
      ctx.beginPath();
      ctx.moveTo(-5 * s, -5 * s);
      ctx.lineTo(-20 * s, -25 * s);
      ctx.lineTo(5 * s, -10 * s);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(5 * s, -5 * s);
      ctx.lineTo(20 * s, -25 * s);
      ctx.lineTo(-5 * s, -10 * s);
      ctx.closePath();
      ctx.fill();
      // Eyes
      ctx.fillStyle = '#FFEB3B';
      ctx.beginPath();
      ctx.arc(25 * s, -8 * s, 3 * s, 0, Math.PI * 2);
      ctx.fill();
      // Fire breath
      if (Math.sin(performance.now() / 300) > 0.5) {
        ctx.fillStyle = '#FF9800';
        ctx.beginPath();
        ctx.moveTo(35 * s, -5 * s);
        ctx.lineTo(50 * s, -10 * s);
        ctx.lineTo(50 * s, 0 * s);
        ctx.closePath();
        ctx.fill();
      }
      break;
  }

  // Speed boost visual
  if (basket.speedBoostTimer > 0) {
    ctx.strokeStyle = 'rgba(0,230,118,0.4)';
    ctx.lineWidth = 2 * SCALE;
    for (let i = 0; i < 5; i++) {
      const sx = basket.x - basket.width/2 + Math.random() * basket.width;
      const sy = basket.y + basket.height/2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - 5 * SCALE, sy + 20 * SCALE);
      ctx.stroke();
    }
  }

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
    <button class="btn" onclick="startGame()">🎮 START</button>
    <p style="font-size:14px; margin-top:15px; opacity:0.7;">
      Desktop: Arrow Keys / WASD<br>
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

function showLevelComplete() {
  levelScreen.classList.remove('hidden');
  const config = LEVELS[game.level - 1];
  const nextConfig = LEVELS[game.level] || null;
  const newPowerups = nextConfig ? nextConfig.powerupTypes.filter(p => !config.powerupTypes.includes(p)) : [];
  const newObs = nextConfig ? nextConfig.obstacles.filter(o => !config.obstacles.includes(o)) : [];
  let hints = '';
  if (newPowerups.length > 0) hints += `<p style="font-size:14px; color:#FFD700;">New Powerups: ${newPowerups.map(p => powerupEmoji[p] || p).join(', ')}</p>`;
  if (newObs.length > 0) hints += `<p style="font-size:14px; color:#FF8A65;">New Obstacles: ${newObs.join(', ')}</p>`;
  levelScreen.innerHTML = `
    <h2>🎉 Level ${game.level} Complete!</h2>
    <p style="font-size:20px; margin:10px 0;">Score: ⭐ ${game.score}</p>
    <p style="font-size:16px; color:#90EE90;">Lives remaining: ${'❤️'.repeat(game.lives)}</p>
    ${nextConfig ? `<p style="font-size:14px; margin-top:15px; color:#FFD700;">Next: ${nextConfig.name}<br>${nextConfig.desc}</p>${hints}` : '<p style="font-size:20px; color:#FFD700; margin-top:15px;">🏆 ALL LEVELS COMPLETE! YOU WIN! 🏆</p>'}
    <button class="btn" onclick="nextLevel()">${nextConfig ? '➡️ NEXT LEVEL' : '🏆 FINISH'}</button>
  `;
}

// ============================================================
// GAME CONTROL
// ============================================================
function startGame() {
  initAudio();
  startScreen.classList.add('hidden');
  game.score = 0;
  game.lives = 7;
  game.level = 1;
  initLevel(game.level);
  game.state = 'playing';
  updateUI();
}

function restartGame() {
  gameOverScreen.classList.add('hidden');
  startGame();
}

function nextLevel() {
  levelScreen.classList.add('hidden');
  playSound('levelup');
  if (game.level >= 10) {
    // Won the game!
    gameOverScreen.classList.remove('hidden');
    gameOverScreen.innerHTML = `
      <h2 style="color:#FFD700;">🏆 YOU WIN! 🏆</h2>
      <p style="font-size:24px; margin:10px 0;">Final Score: ⭐ ${game.score}</p>
      <p style="font-size:18px;">All 10 levels completed!</p>
      <p style="font-size:16px; color:#90EE90;">Lives remaining: ${'❤️'.repeat(game.lives)}</p>
      <button class="btn" onclick="restartGame()">🔄 PLAY AGAIN</button>
    `;
    game.state = 'gameOver';
    return;
  }
  game.level++;
  // Bonus life every 2 levels
  if (game.level % 2 === 0 && game.lives < 7) {
    game.lives++;
  }
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
    const dt = Math.min((timestamp - lastFrameTime) / 1000, 0.05); // cap at 50ms
    lastFrameTime = timestamp;

    update(dt);
    draw();
  } catch(e) {
    console.error('Game loop error:', e.message);
  }

  requestAnimationFrame(gameLoop);
}

// Startup is handled by the DOMContentLoaded/readyState check near the top
