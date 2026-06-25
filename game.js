// ============================================================
// HEN LAY EGG - A cute egg-catching game
// 10 levels, wooden obstacles, superpowers, level selection
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
  state: 'start', // start, levelSelect, playing, levelComplete, gameOver
  score: 0,
  lives: 7,
  level: 1,
  unlockedLevels: 1,
  highScores: {},
  levelTime: 60,
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
  combo: 0,
  comboTimer: 0,
  shakeAmount: 0,
  flashTimer: 0,
  flashColor: '',
  muted: false,
};

// Canvas sizing
let W, H, SCALE;

const powerupEmoji = {
  golden: '🟡', speed: '⚩', shield: '🛡', magnet: '🧲',
  shrink: '📦', slowmo: '⏱', double: '✨', giant: '🔶',
  multi: '🌟', rainbow: '🌈'
};

function resize() {
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

// Preloaded assets
const assets = {};
function loadAssets() {
  const images = { hen: 'hen.png', basket: 'basket.png', eggs: 'eggs.png' };
  Object.entries(images).forEach(([key, src]) => {
    try {
      const img = new Image();
      img.onload = () => { assets[key] = img; };
      img.onerror = () => {};
      img.src = src;
    } catch(e) {}
  });
}

// ============================================================
// LEVEL CONFIGURATIONS
// ============================================================
const LEVELS = [
  {
    name: 'Sunny Farm', hens: 1, spawnRate: 1.8, eggGravity: 0.35,
    blackChance: 0, powerupChance: 0.08,
    obstacles: [
      { type: 'wood', x: 0.3, y: 0.35, angle: 12 },
      { type: 'wood', x: 0.7, y: 0.35, angle: -12 },
    ],
    powerupTypes: ['golden'],
    bgColor1: '#87CEEB', bgColor2: '#98FB98',
    desc: 'Eggs bounce off wooden planks! Catch them!',
  },
  {
    name: 'Duck Pond', hens: 1, spawnRate: 1.6, eggGravity: 0.38,
    blackChance: 0.05, powerupChance: 0.1,
    obstacles: [
      { type: 'wood', x: 0.25, y: 0.3, angle: 15 },
      { type: 'wood', x: 0.75, y: 0.3, angle: -15 },
      { type: 'wood', x: 0.5, y: 0.5, angle: 0 },
    ],
    powerupTypes: ['golden', 'speed'],
    bgColor1: '#5BA3D9', bgColor2: '#7EC8E3',
    desc: 'More planks! Eggs roll left and right!',
  },
  {
    name: 'Berry Bushes', hens: 2, spawnRate: 1.5, eggGravity: 0.4,
    blackChance: 0.08, powerupChance: 0.1,
    obstacles: [
      { type: 'wood', x: 0.2, y: 0.25, angle: -20 },
      { type: 'wood', x: 0.5, y: 0.4, angle: 20 },
      { type: 'wood', x: 0.8, y: 0.25, angle: -20 },
      { type: 'bush', x: 0.5, y: 0.65 },
    ],
    powerupTypes: ['golden', 'speed', 'shield'],
    bgColor1: '#6BCB77', bgColor2: '#90EE90',
    desc: 'Two hens! Shield egg protects from black eggs!',
  },
  {
    name: 'Windy Hill', hens: 2, spawnRate: 1.4, eggGravity: 0.42,
    blackChance: 0.1, powerupChance: 0.1,
    obstacles: [
      { type: 'wood', x: 0.15, y: 0.2, angle: 25 },
      { type: 'wood', x: 0.45, y: 0.35, angle: -25 },
      { type: 'wood', x: 0.75, y: 0.2, angle: 25 },
      { type: 'wind', x: 0.5, y: 0.55, w: 120 },
    ],
    powerupTypes: ['golden', 'speed', 'shield', 'magnet'],
    bgColor1: '#B8E6FF', bgColor2: '#E0F7FA',
    desc: 'Wind blows eggs! Magnet attracts them!',
  },
  {
    name: 'Corn Field', hens: 2, spawnRate: 1.3, eggGravity: 0.45,
    blackChance: 0.12, powerupChance: 0.12,
    obstacles: [
      { type: 'wood', x: 0.2, y: 0.2, angle: -15 },
      { type: 'wood', x: 0.4, y: 0.35, angle: 15 },
      { type: 'wood', x: 0.6, y: 0.35, angle: -15 },
      { type: 'wood', x: 0.8, y: 0.2, angle: 15 },
      { type: 'corn', x: 0.15, y: 0.7 },
      { type: 'corn', x: 0.85, y: 0.7 },
    ],
    powerupTypes: ['golden', 'speed', 'shield', 'magnet', 'shrink'],
    bgColor1: '#FFD93D', bgColor2: '#FFF3B0',
    desc: 'Corn blocks + 4 planks! Big basket helps!',
  },
  {
    name: 'Rainy Day', hens: 3, spawnRate: 1.2, eggGravity: 0.45,
    blackChance: 0.15, powerupChance: 0.12,
    obstacles: [
      { type: 'wood', x: 0.2, y: 0.18, angle: 30 },
      { type: 'wood', x: 0.5, y: 0.3, angle: -30 },
      { type: 'wood', x: 0.8, y: 0.18, angle: 30 },
      { type: 'wood', x: 0.35, y: 0.48, angle: 0 },
      { type: 'wood', x: 0.65, y: 0.48, angle: 0 },
      { type: 'rain', x: 0.5, y: 0.4, w: 200 },
    ],
    powerupTypes: ['golden', 'speed', 'shield', 'magnet', 'shrink', 'slowmo'],
    bgColor1: '#5C6BC0', bgColor2: '#9FA8DA',
    desc: 'Rain makes it slippery! Slow-mo helps!',
  },
  {
    name: 'Fox Night', hens: 3, spawnRate: 1.1, eggGravity: 0.5,
    blackChance: 0.18, powerupChance: 0.13,
    obstacles: [
      { type: 'wood', x: 0.15, y: 0.15, angle: -35 },
      { type: 'wood', x: 0.4, y: 0.25, angle: 35 },
      { type: 'wood', x: 0.65, y: 0.25, angle: -35 },
      { type: 'wood', x: 0.85, y: 0.15, angle: 35 },
      { type: 'wood', x: 0.5, y: 0.45, angle: 0 },
      { type: 'fox', x: 0.8, y: 0.65 },
    ],
    powerupTypes: ['golden', 'speed', 'shield', 'magnet', 'shrink', 'slowmo', 'double'],
    bgColor1: '#2C3E50', bgColor2: '#34495E',
    desc: 'Fox at the bottom! Double points egg!',
  },
  {
    name: 'Mountain Path', hens: 3, spawnRate: 1.0, eggGravity: 0.52,
    blackChance: 0.2, powerupChance: 0.13,
    obstacles: [
      { type: 'wood', x: 0.1, y: 0.12, angle: 40 },
      { type: 'wood', x: 0.3, y: 0.22, angle: -40 },
      { type: 'wood', x: 0.5, y: 0.22, angle: 40 },
      { type: 'wood', x: 0.7, y: 0.22, angle: -40 },
      { type: 'wood', x: 0.9, y: 0.12, angle: 40 },
      { type: 'rock', x: 0.5, y: 0.45 },
    ],
    powerupTypes: ['golden', 'speed', 'shield', 'magnet', 'shrink', 'slowmo', 'double', 'giant'],
    bgColor1: '#8D6E63', bgColor2: '#BCAAA4',
    desc: 'Steep planks + rocks! Giant egg = big points!',
  },
  {
    name: 'Storm Castle', hens: 4, spawnRate: 0.9, eggGravity: 0.55,
    blackChance: 0.22, powerupChance: 0.14,
    obstacles: [
      { type: 'wood', x: 0.12, y: 0.12, angle: -45 },
      { type: 'wood', x: 0.35, y: 0.2, angle: 45 },
      { type: 'wood', x: 0.65, y: 0.2, angle: -45 },
      { type: 'wood', x: 0.88, y: 0.12, angle: 45 },
      { type: 'wood', x: 0.25, y: 0.35, angle: 0 },
      { type: 'wood', x: 0.75, y: 0.35, angle: 0 },
      { type: 'wind', x: 0.3, y: 0.55, w: 100 },
      { type: 'rain', x: 0.7, y: 0.55, w: 100 },
    ],
    powerupTypes: ['golden', 'speed', 'shield', 'magnet', 'shrink', 'slowmo', 'double', 'giant', 'multi'],
    bgColor1: '#4A148C', bgColor2: '#7B1FA2',
    desc: 'Storm chaos! Multi-egg splits into 3!',
  },
  {
    name: 'Dragon Farm', hens: 4, spawnRate: 0.8, eggGravity: 0.6,
    blackChance: 0.25, powerupChance: 0.15,
    obstacles: [
      { type: 'wood', x: 0.1, y: 0.1, angle: 50 },
      { type: 'wood', x: 0.25, y: 0.18, angle: -50 },
      { type: 'wood', x: 0.4, y: 0.25, angle: 50 },
      { type: 'wood', x: 0.6, y: 0.25, angle: -50 },
      { type: 'wood', x: 0.75, y: 0.18, angle: 50 },
      { type: 'wood', x: 0.9, y: 0.1, angle: -50 },
      { type: 'wood', x: 0.5, y: 0.38, angle: 0 },
      { type: 'wind', x: 0.2, y: 0.55, w: 100 },
      { type: 'rain', x: 0.8, y: 0.55, w: 100 },
      { type: 'dragon', x: 0.5, y: 0.65 },
    ],
    powerupTypes: ['golden', 'speed', 'shield', 'magnet', 'shrink', 'slowmo', 'double', 'giant', 'multi', 'rainbow'],
    bgColor1: '#E65100', bgColor2: '#FF9800',
    desc: 'FINAL: Dragon! Rainbow egg! Everything!',
  },
];

// ============================================================
// INPUT
// ============================================================
const keys = {};
window.addEventListener('keydown', e => { keys[e.key] = true; if (['ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault(); });
window.addEventListener('keyup', e => { keys[e.key] = false; });

let touchLeft = false, touchRight = false;
const leftBtn = document.createElement('button');
leftBtn.textContent = '◀'; leftBtn.id = 'leftBtn';
const rightBtn = document.createElement('button');
rightBtn.textContent = '▶'; rightBtn.id = 'rightBtn';
controlsDiv.appendChild(leftBtn); controlsDiv.appendChild(rightBtn);
leftBtn.addEventListener('touchstart', e => { e.preventDefault(); touchLeft = true; });
leftBtn.addEventListener('touchend', e => { e.preventDefault(); touchLeft = false; });
rightBtn.addEventListener('touchstart', e => { e.preventDefault(); touchRight = true; });
rightBtn.addEventListener('touchend', e => { e.preventDefault(); touchRight = false; });

// ============================================================
// CREATION FUNCTIONS
// ============================================================
function createBasket() {
  return {
    x: W / 2, y: H - 50 * SCALE,
    width: 70 * SCALE, height: 40 * SCALE,
    speed: 8 * SCALE, dir: 0,
    shield: false, shieldTimer: 0,
    magnet: false, magnetTimer: 0,
    slowmo: false, slowmoTimer: 0,
    doublePoints: false, doubleTimer: 0,
    big: false, bigTimer: 0,
    rainbow: false, rainbowTimer: 0,
    speedBoostTimer: 0,
  };
}

function createHen(x) {
  return {
    x, y: 55 * SCALE,
    width: 50 * SCALE, height: 50 * SCALE,
    animTimer: 0, layTimer: Math.random() * 500,
    baseY: 55 * SCALE,
  };
}

function createEgg(x, y, type = 'normal') {
  return {
    x, y,
    vx: (Math.random() - 0.5) * 1.5 * SCALE,
    vy: 0.5 * SCALE,
    width: 16 * SCALE, height: 22 * SCALE,
    type, rotation: 0, active: true, bounces: 0,
    onGround: false, groundTimer: 0,
  };
}

function createObstacle(cfg, idx) {
  const margin = 40 * SCALE;
  const usableW = W - margin * 2;
  const col = (idx % 3);
  const row = Math.floor(idx / 3);
  const spacing = usableW / 4;
  
  let x, y;
  if (cfg.x !== undefined) {
    x = margin + cfg.x * usableW;
    y = 100 * SCALE + cfg.y * (H - 220 * SCALE);
  } else {
    x = margin + spacing + col * spacing;
    y = 130 * SCALE + row * 120 * SCALE;
  }
  
  const sizes = {
    wood: { w: 90 * SCALE, h: 18 * SCALE },
    rock: { w: 55 * SCALE, h: 40 * SCALE },
    bush: { w: 50 * SCALE, h: 35 * SCALE },
    corn: { w: 30 * SCALE, h: 55 * SCALE },
    wind: { w: 100 * SCALE, h: 50 * SCALE },
    rain: { w: 150 * SCALE, h: 60 * SCALE },
    fox: { w: 50 * SCALE, h: 45 * SCALE },
    dragon: { w: 80 * SCALE, h: 55 * SCALE },
  };
  const s = sizes[cfg.type] || sizes.rock;
  const angle = (cfg.angle || 0) * Math.PI / 180;
  
  return {
    ...cfg, x, y, width: s.w, height: s.h,
    angle, animTimer: Math.random() * 1000,
  };
}

// ============================================================
// INIT LEVEL
// ============================================================
function initLevel(level) {
  const config = LEVELS[level - 1];
  game.hens = [];
  game.eggs = [];
  game.obstacles = [];
  game.particles = [];
  game.basket = createBasket();
  game.spawnTimer = 0;
  game.combo = 0;
  game.comboTimer = 0;
  game.timeLeft = game.levelTime;
  game.levelStartTime = performance.now();
  game.shakeAmount = 0;
  
  const henSpacing = W / (config.hens + 1);
  for (let i = 0; i < config.hens; i++) {
    game.hens.push(createHen(henSpacing * (i + 1)));
  }
  
  config.obstacles.forEach((obs, i) => {
    game.obstacles.push(createObstacle(obs, i));
  });
}

// ============================================================
// UPDATE
// ============================================================
function update(dt) {
  if (game.state !== 'playing') return;
  
  const config = LEVELS[game.level - 1];
  const slowFactor = game.basket.slowmo ? 0.6 : 1;
  const effectiveDt = dt * slowFactor;
  
  // Time
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
  const halfW = basket.width / 2;
  basket.x = Math.max(halfW, Math.min(W - halfW, basket.x));
  
  // Powerup timers
  if (basket.speedBoostTimer > 0) { basket.speedBoostTimer -= dt; if (basket.speedBoostTimer <= 0) basket.speed = 8 * SCALE; }
  if (basket.shieldTimer > 0) { basket.shieldTimer -= dt; if (basket.shieldTimer <= 0) basket.shield = false; }
  if (basket.magnetTimer > 0) { basket.magnetTimer -= dt; if (basket.magnetTimer <= 0) basket.magnet = false; }
  if (basket.slowmoTimer > 0) { basket.slowmoTimer -= dt; if (basket.slowmoTimer <= 0) basket.slowmo = false; }
  if (basket.doubleTimer > 0) { basket.doubleTimer -= dt; if (basket.doubleTimer <= 0) basket.doublePoints = false; }
  if (basket.bigTimer > 0) { basket.bigTimer -= dt; if (basket.bigTimer <= 0) basket.big = false; }
  if (basket.rainbowTimer > 0) { basket.rainbowTimer -= dt; if (basket.rainbowTimer <= 0) { basket.shield=false; basket.magnet=false; basket.doublePoints=false; basket.big=false; } }
  
  basket.width = (basket.big ? 105 : 70) * SCALE;
  basket.height = (basket.big ? 56 : 40) * SCALE;
  
  // Spawn eggs
  game.spawnTimer -= dt;
  if (game.spawnTimer <= 0) {
    game.spawnTimer = config.spawnRate;
    const hen = game.hens[Math.floor(Math.random() * game.hens.length)];
    let type = 'normal';
    const r = Math.random();
    if (r < config.blackChance) type = 'black';
    else if (r < config.blackChance + config.powerupChance) type = config.powerupTypes[Math.floor(Math.random() * config.powerupTypes.length)];
    game.eggs.push(createEgg(hen.x, hen.y + hen.height * 0.3, type));
  }
  
  // Update hens
  game.hens.forEach(hen => {
    hen.animTimer += dt;
    hen.baseY = 55 * SCALE;
  });
  
  // Update eggs with proper physics
  const gravity = config.eggGravity * SCALE;
  const friction = 0.98;
  const bounciness = 0.65;
  
  game.eggs.forEach(egg => {
    if (!egg.active) return;
    
    // Apply gravity
    egg.vy += gravity * effectiveDt * 60;
    egg.vy = Math.min(egg.vy, 12 * SCALE);
    
    // Apply velocity
    egg.x += egg.vx * effectiveDt * 60;
    egg.y += egg.vy * effectiveDt * 60;
    egg.rotation += egg.vx * 0.05 * effectiveDt * 60;
    
    // Wind effect
    game.obstacles.forEach(obs => {
      if (obs.type === 'wind') {
        const dx = egg.x - obs.x;
        const dy = egg.y - obs.y;
        if (Math.abs(dx) < obs.width / 2 && Math.abs(dy) < obs.height / 2) {
          egg.vx += 2.5 * SCALE * Math.sign(dx) * effectiveDt * 60;
        }
      }
    });
    
    // Magnet attraction
    if (basket.magnet) {
      const dx = basket.x - egg.x;
      const dy = (basket.y - basket.height/2) - egg.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist > 5 && dist < 180 * SCALE) {
        egg.vx += (dx / dist) * 3 * SCALE * effectiveDt * 60;
        egg.vy += (dy / dist) * 2 * SCALE * effectiveDt * 60;
      }
    }
    
    // Wall bounce
    if (egg.x < egg.width/2) { egg.x = egg.width/2; egg.vx = Math.abs(egg.vx) * bounciness; }
    if (egg.x > W - egg.width/2) { egg.x = W - egg.width/2; egg.vx = -Math.abs(egg.vx) * bounciness; }
    
    // Collision with angled wooden planks and obstacles
    game.obstacles.forEach(obs => {
      if (obs.type === 'wind' || obs.type === 'rain') return;
      
      const dx = egg.x - obs.x;
      const dy = egg.y - obs.y;
      
      if (obs.type === 'wood' && obs.angle) {
        // Rotated collision for angled wooden planks
        const cos = Math.cos(-obs.angle);
        const sin = Math.sin(-obs.angle);
        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;
        
        const halfW = obs.width / 2 + egg.width * 0.3;
        const halfH = obs.height / 2 + egg.height * 0.3;
        
        if (Math.abs(localX) < halfW && Math.abs(localY) < halfH) {
          // Bounce off the plank - reflect velocity along the plank's normal
          const normalX = Math.sin(obs.angle);
          const normalY = -Math.cos(obs.angle);
          
          // Determine which side we hit
          const dotProduct = egg.vx * normalX + egg.vy * normalY;
          
          // Reflect velocity
          egg.vx -= 2 * dotProduct * normalX * bounciness;
          egg.vy -= 2 * dotProduct * normalY * bounciness;
          
          // Add some randomness based on where on the plank we hit
          const hitPos = localX / halfW; // -1 to 1
          egg.vx += hitPos * 2.5 * SCALE;
          
          // Push egg out of collision
          egg.y = obs.y - halfH - 2;
          
          egg.bounces++;
          spawnParticles(egg.x, egg.y, '#8B4513', 4);
        }
      } else {
        // Simple AABB collision for non-angled obstacles
        const obsLeft = obs.x - obs.width/2;
        const obsRight = obs.x + obs.width/2;
        const obsTop = obs.y - obs.height/2;
        const obsBottom = obs.y + obs.height/2;
        const eLeft = egg.x - egg.width/2;
        const eRight = egg.x + egg.width/2;
        const eTop = egg.y - egg.height/2;
        const eBottom = egg.y + egg.height/2;
        
        if (eRight > obsLeft && eLeft < obsRight && eBottom > obsTop && eTop < obsBottom) {
          // Determine smallest penetration
          const overlapLeft = eRight - obsLeft;
          const overlapRight = obsRight - eLeft;
          const overlapTop = eBottom - obsTop;
          const overlapBottom = obsBottom - eTop;
          const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
          
          if (minOverlap === overlapTop) {
            egg.vy = -Math.abs(egg.vy) * bounciness;
            egg.y = obsTop - egg.height/2;
            egg.vx += (Math.random() - 0.5) * 2 * SCALE;
          } else if (minOverlap === overlapBottom) {
            egg.vy = Math.abs(egg.vy) * 0.5;
            egg.y = obsBottom + egg.height/2;
          } else if (minOverlap === overlapLeft) {
            egg.vx = -Math.abs(egg.vx) * bounciness;
            egg.x = obsLeft - egg.width/2;
          } else {
            egg.vx = Math.abs(egg.vx) * bounciness;
            egg.x = obsRight + egg.width/2;
          }
          
          egg.bounces++;
          spawnParticles(egg.x, egg.y, '#8B4513', 3);
        }
      }
    });
    
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
    if (egg.y > H + 30 * SCALE) {
      egg.active = false;
      if (egg.type !== 'black') game.combo = 0;
    }
  });
  
  // Clean up
  game.eggs = game.eggs.filter(e => e.active);
  
  // Update particles
  game.particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.1 * SCALE;
    p.life -= 0.025;
  });
  game.particles = game.particles.filter(p => p.life > 0);
  
  if (game.comboTimer > 0) { game.comboTimer -= dt; if (game.comboTimer <= 0) game.combo = 0; }
}

// ============================================================
// HANDLERS
// ============================================================
function handleEggCatch(egg) {
  const basket = game.basket;
  let points = 10;
  let pColor = '#FFD700';
  
  switch (egg.type) {
    case 'black':
      if (basket.shield) {
        basket.shield = false; basket.shieldTimer = 0;
        pColor = '#4FC3F7'; spawnParticles(egg.x, egg.y, pColor, 12);
        showText(egg.x, egg.y, 'SHIELD!', '#4FC3F7'); playSound('hit');
      } else {
        game.lives--; game.combo = 0;
        spawnParticles(egg.x, egg.y, '#FF0000', 15);
        showText(egg.x, egg.y, '-1 LIFE', '#FF0000');
        game.shakeAmount = 8; game.flashTimer = 0.3; game.flashColor = 'rgba(255,0,0,0.3)';
        playSound('bad');
        if (game.lives <= 0) { game.state = 'gameOver'; showGameOver(); return; }
      }
      break;
    case 'golden': points = 50; pColor = '#FFD700'; spawnParticles(egg.x, egg.y, pColor, 20); showText(egg.x, egg.y, '+50!', '#FFD700'); playSound('golden'); break;
    case 'speed': points = 15; basket.speed = 12 * SCALE; basket.speedBoostTimer = 5; pColor = '#00E676'; spawnParticles(egg.x, egg.y, pColor, 15); showText(egg.x, egg.y, 'SPEED!', '#00E676'); playSound('powerup'); break;
    case 'shield': points = 15; basket.shield = true; basket.shieldTimer = 15; pColor = '#4FC3F7'; spawnParticles(egg.x, egg.y, pColor, 15); showText(egg.x, egg.y, 'SHIELD!', '#4FC3F7'); playSound('powerup'); break;
    case 'magnet': points = 15; basket.magnet = true; basket.magnetTimer = 10; pColor = '#E91E63'; spawnParticles(egg.x, egg.y, pColor, 15); showText(egg.x, egg.y, 'MAGNET!', '#E91E63'); playSound('powerup'); break;
    case 'shrink': points = 15; basket.big = true; basket.bigTimer = 12; pColor = '#9C27B0'; spawnParticles(egg.x, egg.y, pColor, 15); showText(egg.x, egg.y, 'BIG!', '#9C27B0'); playSound('powerup'); break;
    case 'slowmo': points = 15; basket.slowmo = true; basket.slowmoTimer = 8; pColor = '#00BCD4'; spawnParticles(egg.x, egg.y, pColor, 15); showText(egg.x, egg.y, 'SLOW!', '#00BCD4'); playSound('powerup'); break;
    case 'double': points = 15; basket.doublePoints = true; basket.doubleTimer = 10; pColor = '#FF9800'; spawnParticles(egg.x, egg.y, pColor, 15); showText(egg.x, egg.y, '2X', '#FF9800'); playSound('powerup'); break;
    case 'giant': points = 100; pColor = '#FF5722'; spawnParticles(egg.x, egg.y, pColor, 20); showText(egg.x, egg.y, '+100', '#FF5722'); game.shakeAmount = 5; playSound('golden'); break;
    case 'multi': points = 5;
      for (let i = 0; i < 3; i++) {
        const mini = createEgg(egg.x, egg.y, 'normal');
        mini.vx = (i - 1) * 4 * SCALE; mini.vy = -3 * SCALE;
        game.eggs.push(mini);
      }
      pColor = '#E040FB'; spawnParticles(egg.x, egg.y, pColor, 20); showText(egg.x, egg.y, 'MULTI!', '#E040FB'); playSound('powerup'); break;
    case 'rainbow': points = 30;
      basket.shield=true; basket.shieldTimer=10; basket.magnet=true; basket.magnetTimer=10;
      basket.doublePoints=true; basket.doubleTimer=10; basket.big=true; basket.bigTimer=10;
      pColor = '#FF69B4'; spawnParticles(egg.x, egg.y, '#FF0000', 8); spawnParticles(egg.x, egg.y, '#00FF00', 8); spawnParticles(egg.x, egg.y, '#0000FF', 8);
      showText(egg.x, egg.y, 'RAINBOW!', '#FF69B4'); playSound('golden'); game.shakeAmount = 6; break;
    default: spawnParticles(egg.x, egg.y, '#90EE90', 8); playSound('catch'); break;
  }
  
  game.combo++; game.comboTimer = 2;
  if (game.combo > 1) points += game.combo * 2;
  if (basket.doublePoints) points *= 2;
  game.score += points;
  updateUI();
}

// ============================================================
// PARTICLES & TEXT
// ============================================================
function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    game.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 6 * SCALE,
      vy: (Math.random() - 0.3) * 5 * SCALE - 2 * SCALE,
      life: 1, color, size: (2 + Math.random() * 3) * SCALE,
    });
  }
}

let floatingTexts = [];
function showText(x, y, text, color) {
  floatingTexts.push({ x, y, text, color, life: 1 });
}

// ============================================================
// DRAW
// ============================================================
function draw() {
  if (!ctx) return;
  const config = LEVELS[game.level - 1] || LEVELS[0];
  
  ctx.save();
  if (game.shakeAmount > 0) {
    ctx.translate((Math.random()-0.5)*game.shakeAmount, (Math.random()-0.5)*game.shakeAmount);
  }
  
  // Background
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, config.bgColor1);
  grad.addColorStop(1, config.bgColor2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  
  // Clouds
  drawClouds();
  
  if (game.state === 'playing' || game.state === 'levelComplete' || game.state === 'gameOver') {
    // Draw obstacles
    game.obstacles.forEach(obs => drawObstacle(obs));
    
    // Draw hens
    game.hens.forEach(hen => drawHen(hen));
    
    // Draw eggs
    game.eggs.forEach(egg => drawEgg(egg));
    
    // Draw basket
    if (game.basket) drawBasket(game.basket);
  }
  
  // Particles
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
    ctx.globalAlpha = Math.max(0, ft.life);
    ctx.fillStyle = ft.color;
    ctx.font = `bold ${16 * SCALE}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(ft.text, ft.x, ft.y);
  });
  ctx.globalAlpha = 1;
  floatingTexts = floatingTexts.filter(ft => ft.life > 0);
  
  // Combo
  if (game.combo > 1) {
    ctx.fillStyle = '#FFD700';
    ctx.font = `bold ${20 * SCALE}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.globalAlpha = Math.min(1, game.comboTimer / 0.5);
    ctx.fillText(`COMBO x${game.combo}!`, W / 2, H / 2);
    ctx.globalAlpha = 1;
  }
  
  // Flash
  if (game.flashTimer > 0) {
    ctx.fillStyle = game.flashColor;
    ctx.globalAlpha = game.flashTimer * 2;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
  
  ctx.restore();
}

function drawClouds() {
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  const time = performance.now() / 8000;
  for (let i = 0; i < 4; i++) {
    const cx = ((i * 150 + time * 25 * (i % 2 + 1)) % (W + 100)) - 50;
    const cy = 30 + i * 18;
    const sz = 25 + i * 4;
    ctx.beginPath();
    ctx.arc(cx, cy, sz * 0.5, 0, Math.PI * 2);
    ctx.arc(cx + sz * 0.35, cy - sz * 0.1, sz * 0.4, 0, Math.PI * 2);
    ctx.arc(cx + sz * 0.7, cy, sz * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHen(hen) {
  const bob = Math.sin(hen.animTimer * 3) * 2 * SCALE;
  ctx.save();
  ctx.translate(hen.x, hen.baseY + bob);
  
  // Draw hen using Canvas API (no image dependency)
  // Body
  ctx.fillStyle = '#FFF8E1';
  ctx.strokeStyle = '#FFB74D';
  ctx.lineWidth = 2 * SCALE;
  ctx.beginPath();
  ctx.ellipse(0, 5 * SCALE, 20 * SCALE, 18 * SCALE, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  
  // Wing
  ctx.fillStyle = '#FFE0B2';
  ctx.beginPath();
  ctx.ellipse(-12 * SCALE, 8 * SCALE, 10 * SCALE, 8 * SCALE, -0.3, 0, Math.PI * 2);
  ctx.fill();
  
  // Head
  ctx.fillStyle = '#FFF8E1';
  ctx.strokeStyle = '#FFB74D';
  ctx.beginPath();
  ctx.arc(14 * SCALE, -12 * SCALE, 12 * SCALE, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  
  // Comb
  ctx.fillStyle = '#F44336';
  ctx.beginPath();
  ctx.moveTo(9 * SCALE, -22 * SCALE);
  ctx.lineTo(12 * SCALE, -28 * SCALE);
  ctx.lineTo(15 * SCALE, -22 * SCALE);
  ctx.lineTo(18 * SCALE, -28 * SCALE);
  ctx.lineTo(21 * SCALE, -22 * SCALE);
  ctx.closePath();
  ctx.fill();
  
  // Eye
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.arc(18 * SCALE, -13 * SCALE, 2.5 * SCALE, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(18.5 * SCALE, -14 * SCALE, 1 * SCALE, 0, Math.PI * 2);
  ctx.fill();
  
  // Beak
  ctx.fillStyle = '#FF8F00';
  ctx.beginPath();
  ctx.moveTo(24 * SCALE, -11 * SCALE);
  ctx.lineTo(30 * SCALE, -9 * SCALE);
  ctx.lineTo(24 * SCALE, -7 * SCALE);
  ctx.closePath();
  ctx.fill();
  
  // Blush
  ctx.fillStyle = 'rgba(255,150,150,0.5)';
  ctx.beginPath();
  ctx.ellipse(20 * SCALE, -7 * SCALE, 4 * SCALE, 2.5 * SCALE, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Feet
  ctx.fillStyle = '#FF8F00';
  ctx.fillRect(-6 * SCALE, 20 * SCALE, 5 * SCALE, 6 * SCALE);
  ctx.fillRect(4 * SCALE, 20 * SCALE, 5 * SCALE, 6 * SCALE);
  
  // Egg indicator (small egg being laid)
  if (Math.sin(hen.animTimer * 5) > 0.8) {
    ctx.fillStyle = '#FFFDE7';
    ctx.strokeStyle = '#FFE082';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 25 * SCALE, 4 * SCALE, 5 * SCALE, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  }
  
  ctx.restore();
}

function drawEgg(egg) {
  ctx.save();
  ctx.translate(egg.x, egg.y);
  ctx.rotate(egg.rotation);
  
  const w = egg.width;
  const h = egg.height;
  
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  ctx.beginPath();
  ctx.ellipse(2 * SCALE, h / 2 + 3 * SCALE, w / 2, h / 6, 0, 0, Math.PI * 2);
  ctx.fill();
  
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
  
  ctx.fillStyle = c.body;
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  
  ctx.fillStyle = c.spot;
  ctx.beginPath();
  ctx.arc(-w * 0.15, -h * 0.1, w * 0.1, 0, Math.PI * 2);
  ctx.fill();
  
  // Glow for special eggs
  if (egg.type !== 'normal' && egg.type !== 'black') {
    ctx.shadowColor = c.body;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.strokeStyle = c.body; ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  
  if (egg.type === 'rainbow') {
    const hue = (performance.now() / 8) % 360;
    ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2 + 2, h / 2 + 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  
  ctx.restore();
}

function drawObstacle(obs) {
  ctx.save();
  ctx.translate(obs.x, obs.y);
  ctx.rotate(obs.angle || 0);
  
  const w = obs.width;
  const h = obs.height;
  
  switch (obs.type) {
    case 'wood':
      // Wooden plank
      ctx.fillStyle = '#8D6E63';
      ctx.strokeStyle = '#5D4037';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-w/2, -h/2, w, h, 4 * SCALE);
      ctx.fill(); ctx.stroke();
      
      // Wood grain lines
      ctx.strokeStyle = '#6D4C41';
      ctx.lineWidth = 1;
      for (let i = -w/2 + 8; i < w/2 - 8; i += 12 * SCALE) {
        ctx.beginPath();
        ctx.moveTo(i, -h/2 + 2);
        ctx.lineTo(i, h/2 - 2);
        ctx.stroke();
      }
      
      // Nails
      ctx.fillStyle = '#5D4037';
      ctx.beginPath();
      ctx.arc(-w/2 + 6 * SCALE, -h/2 + 3 * SCALE, 2 * SCALE, 0, Math.PI * 2);
      ctx.arc(w/2 - 6 * SCALE, -h/2 + 3 * SCALE, 2 * SCALE, 0, Math.PI * 2);
      ctx.fill();
      break;
      
    case 'rock':
      ctx.fillStyle = '#78909C';
      ctx.beginPath();
      ctx.ellipse(0, 0, w/2, h/2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#90A4AE';
      ctx.beginPath();
      ctx.ellipse(-w * 0.1, -h * 0.1, w * 0.3, h * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#546E7A';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, w/2, h/2, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
      
    case 'bush':
      ctx.fillStyle = '#388E3C';
      ctx.beginPath();
      ctx.arc(-w * 0.2, 0, w * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(w * 0.2, 0, w * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -h * 0.2, w * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4CAF50';
      ctx.beginPath();
      ctx.arc(-w * 0.1, -h * 0.1, w * 0.12, 0, Math.PI * 2);
      ctx.fill();
      break;
      
    case 'corn':
      ctx.fillStyle = '#7CB342';
      ctx.fillRect(-4 * SCALE, -h/2, 8 * SCALE, h);
      ctx.fillStyle = '#FDD835';
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.1, 10 * SCALE, 15 * SCALE, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#F9A825';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc((i - 1.5) * 4 * SCALE, -h * 0.1 + (i % 2) * 6 * SCALE, 2.5 * SCALE, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
      
    case 'wind':
      const wAlpha = 0.15 + Math.sin(performance.now() / 400) * 0.1;
      ctx.fillStyle = `rgba(200,230,255,${wAlpha})`;
      ctx.fillRect(-w/2, -h/2, w, h);
      ctx.strokeStyle = `rgba(100,180,255,0.6)`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const wy = (i - 1) * h * 0.3;
        const wx = Math.sin(performance.now() / 300 + i) * 8;
        ctx.beginPath();
        ctx.moveTo(-w/2 + wx, wy);
        ctx.lineTo(w/2 + wx, wy);
        ctx.stroke();
      }
      break;
      
    case 'rain':
      const rAlpha = 0.15 + Math.sin(performance.now() / 400) * 0.1;
      ctx.fillStyle = `rgba(100,150,255,${rAlpha})`;
      ctx.fillRect(-w/2, -h/2, w, h);
      ctx.strokeStyle = `rgba(150,200,255,0.7)`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const rx = (i / 5) * w - w/2;
        const ry = ((performance.now() / 10 + i * 20) % h) - h/2;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 2, ry + 8);
        ctx.stroke();
      }
      break;
      
    case 'fox':
      ctx.fillStyle = '#FF5722';
      ctx.beginPath();
      ctx.ellipse(0, 4 * SCALE, 16 * SCALE, 12 * SCALE, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(14 * SCALE, -4 * SCALE, 10 * SCALE, 0, Math.PI * 2);
      ctx.fill();
      // Ears
      ctx.beginPath();
      ctx.moveTo(7 * SCALE, -12 * SCALE);
      ctx.lineTo(10 * SCALE, -20 * SCALE);
      ctx.lineTo(15 * SCALE, -12 * SCALE);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(17 * SCALE, -12 * SCALE);
      ctx.lineTo(20 * SCALE, -20 * SCALE);
      ctx.lineTo(25 * SCALE, -12 * SCALE);
      ctx.fill();
      // Eye
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(17 * SCALE, -5 * SCALE, 2 * SCALE, 0, Math.PI * 2);
      ctx.fill();
      // Tail
      ctx.fillStyle = '#FFAB91';
      ctx.beginPath();
      ctx.ellipse(-15 * SCALE, 0, 8 * SCALE, 5 * SCALE, 0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
      
    case 'dragon':
      ctx.fillStyle = '#E53935';
      ctx.beginPath();
      ctx.ellipse(0, 4 * SCALE, 22 * SCALE, 16 * SCALE, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(18 * SCALE, -4 * SCALE, 12 * SCALE, 0, Math.PI * 2);
      ctx.fill();
      // Wings
      ctx.fillStyle = '#EF5350';
      ctx.beginPath();
      ctx.moveTo(-4 * SCALE, -4 * SCALE);
      ctx.lineTo(-18 * SCALE, -22 * SCALE);
      ctx.lineTo(4 * SCALE, -8 * SCALE);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(4 * SCALE, -4 * SCALE);
      ctx.lineTo(18 * SCALE, -22 * SCALE);
      ctx.lineTo(-4 * SCALE, -8 * SCALE);
      ctx.fill();
      // Eye
      ctx.fillStyle = '#FFEB3B';
      ctx.beginPath();
      ctx.arc(22 * SCALE, -6 * SCALE, 2.5 * SCALE, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
  
  ctx.restore();
}

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
    ctx.ellipse(0, 0, w/2 + 6 * SCALE, h/2 + 6 * SCALE, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  
  // Magnet field
  if (basket.magnet) {
    ctx.strokeStyle = '#E91E63'; ctx.lineWidth = 2 * SCALE;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.ellipse(0, 0, w/2 + 12 * SCALE, h/2 + 12 * SCALE, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  
  // Basket body
  ctx.fillStyle = '#8D6E63';
  ctx.beginPath();
  ctx.moveTo(-w/2, -h/4);
  ctx.lineTo(-w/2 - 3 * SCALE, h/2);
  ctx.lineTo(w/2 + 3 * SCALE, h/2);
  ctx.lineTo(w/2, -h/4);
  ctx.closePath();
  ctx.fill();
  
  // Weave
  ctx.strokeStyle = '#6D4C41';
  ctx.lineWidth = 1.5 * SCALE;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-w/2 + i * w/7, -h/4);
    ctx.lineTo(-w/2 - 3 * SCALE + i * w/7, h/2);
    ctx.stroke();
  }
  for (let i = 0; i < 3; i++) {
    const yy = -h/4 + i * h/3;
    ctx.beginPath();
    ctx.moveTo(-w/2, yy);
    ctx.lineTo(w/2, yy);
    ctx.stroke();
  }
  
  // Rim
  ctx.fillStyle = '#A1887F';
  ctx.beginPath();
  ctx.ellipse(0, -h/4, w/2 + 3 * SCALE, 4 * SCALE, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Double points
  if (basket.doublePoints) {
    ctx.fillStyle = '#FF9800';
    ctx.font = `bold ${10 * SCALE}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText('2X', 0, h/2 + 12 * SCALE);
  }
  
  // Rainbow aura
  if (basket.rainbow) {
    const hue = (performance.now() / 5) % 360;
    ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
    ctx.lineWidth = 3 * SCALE;
    ctx.beginPath();
    ctx.ellipse(0, 0, w/2 + 4 * SCALE, h/2 + 4 * SCALE, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  
  ctx.restore();
}

// ============================================================
// UI
// ============================================================
function updateUI() {
  const livesStr = '❤️'.repeat(game.lives) + '🖤'.repeat(Math.max(0, 7 - game.lives));
  const pct = Math.max(0, (game.timeLeft / game.levelTime) * 100);
  const config = LEVELS[game.level - 1];
  ui.innerHTML = `
    <div style="position:relative;">
      <div class="lives">${livesStr}</div>
      <div class="level">L${game.level}: ${config.name}</div>
      <div class="timer-bar"><div class="timer-fill" style="width:${pct}%"></div></div>
    </div>
    <div style="display:flex;align-items:center;gap:8px;">
      <div class="score">⭐${game.score}</div>
      <button onclick="toggleMute()" style="background:none;border:none;font-size:18px;cursor:pointer;">${game.muted ? '🔇' : '🔊'}</button>
    </div>
  `;
}

function toggleMute() {
  game.muted = !game.muted;
  updateUI();
}

// ============================================================
// SCREENS
// ============================================================
function showStartScreen() {
  game.state = 'start';
  startScreen.classList.remove('hidden');
  startScreen.innerHTML = `
    <h1>🐔 Hen Lay Egg 🥚</h1>
    <p>Eggs fall from hens, bounce off wooden planks!</p>
    <p>🟡 Golden = Bonus | 💀 Black = Danger</p>
    <p>🌈 Special eggs give superpowers!</p>
    <button class="btn" onclick="showLevelSelect()">🎮 PLAY</button>
    <p style="font-size:13px;margin-top:12px;opacity:0.6;">
      Desktop: ← → keys | Mobile: touch buttons
    </p>
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
    const stars = game.highScores[num] ? '⭐'.repeat(Math.min(3, Math.floor(game.highScores[num] / 200) + 1)) : '';
    gridHTML += `
      <div class="level-card ${unlocked ? 'unlocked' : 'locked'}" 
           onclick="${unlocked ? `selectLevel(${num})` : ''}">
        <div class="level-num">${unlocked ? num : '🔒'}</div>
        <div class="level-name">${lvl.name}</div>
        <div class="level-stars">${stars}</div>
      </div>
    `;
  });
  
  levelScreen.innerHTML = `
    <h2>Select Level</h2>
    <div class="level-grid">${gridHTML}</div>
    <button class="btn" onclick="showStartScreen()" style="margin-top:15px;padding:10px 30px;font-size:18px;">← Back</button>
  `;
}

function selectLevel(num) {
  game.level = num;
  levelScreen.classList.add('hidden');
  initLevel(num);
  game.state = 'playing';
  updateUI();
}

function showLevelComplete() {
  game.state = 'levelComplete';
  levelScreen.classList.remove('hidden');
  
  // Save high score
  if (!game.highScores[game.level] || game.score > game.highScores[game.level]) {
    game.highScores[game.level] = game.score;
  }
  
  // Unlock next level
  if (game.level >= game.unlockedLevels && game.level < 10) {
    game.unlockedLevels = game.level + 1;
  }
  
  const nextConfig = LEVELS[game.level] || null;
  const hasNext = game.level < 10;
  
  levelScreen.innerHTML = `
    <h2>🎉 Level ${game.level} Complete!</h2>
    <p style="font-size:22px;margin:8px 0;">Score: ⭐${game.score}</p>
    <p style="color:#90EE90;">Lives: ${'❤️'.repeat(game.lives)}</p>
    ${hasNext ? `<p style="font-size:13px;color:#FFD700;margin-top:8px;">Next: ${nextConfig.name}<br>${nextConfig.desc}</p>` : '<p style="font-size:18px;color:#FFD700;margin-top:8px;">🏆 ALL LEVELS COMPLETE! 🏆</p>'}
    <button class="btn" onclick="nextLevel()" style="margin-top:12px;">
      ${hasNext ? '➡️ NEXT LEVEL' : '🏆 FINISH'}
    </button>
    <button class="btn" onclick="showLevelSelect()" style="margin-top:8px;padding:10px 30px;font-size:18px;">📋 Level Select</button>
  `;
}

function nextLevel() {
  levelScreen.classList.add('hidden');
  if (game.level >= 10) {
    gameOverScreen.classList.remove('hidden');
    gameOverScreen.innerHTML = `
      <h2 style="color:#FFD700;">🏆 YOU WIN! 🏆</h2>
      <p style="font-size:22px;">Final Score: ⭐${game.score}</p>
      <p style="color:#90EE90;">Lives: ${'❤️'.repeat(game.lives)}</p>
      <button class="btn" onclick="showStartScreen()">🔄 PLAY AGAIN</button>
    `;
    game.state = 'gameOver';
    return;
  }
  game.level++;
  if (game.lives < 7 && game.level % 2 === 0) game.lives++;
  initLevel(game.level);
  game.state = 'playing';
  updateUI();
}

function showGameOver() {
  gameOverScreen.classList.remove('hidden');
  gameOverScreen.innerHTML = `
    <h2>💔 Game Over!</h2>
    <p style="font-size:22px;">Score: ⭐${game.score}</p>
    <p>Level: ${game.level}</p>
    <button class="btn" onclick="retryLevel()">🔄 RETRY</button>
    <button class="btn" onclick="showLevelSelect()" style="margin-top:8px;padding:10px 30px;font-size:18px;">📋 Levels</button>
  `;
}

function retryLevel() {
  gameOverScreen.classList.add('hidden');
  game.lives = 7;
  game.score = 0;
  initLevel(game.level);
  game.state = 'playing';
  updateUI();
}

// ============================================================
// AUDIO
// ============================================================
let audioCtx = null;
function initAudio() {
  if (audioCtx) return;
  try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
}

function playSound(type) {
  if (game.muted || !audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain); gain.connect(audioCtx.destination);
  const now = audioCtx.currentTime;
  
  switch(type) {
    case 'catch':
      osc.frequency.setValueAtTime(523, now);
      osc.frequency.setValueAtTime(659, now + 0.08);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now); osc.stop(now + 0.15); break;
    case 'golden':
      [523, 659, 784, 1047].forEach((f, i) => {
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.connect(g); g.connect(audioCtx.destination);
        o.frequency.setValueAtTime(f, now + i * 0.07);
        g.gain.setValueAtTime(0.2, now + i * 0.07);
        g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.07 + 0.2);
        o.start(now + i * 0.07); o.stop(now + i * 0.07 + 0.2);
      }); break;
    case 'bad':
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.25);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now); osc.stop(now + 0.25); break;
    case 'powerup':
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(554, now + 0.05);
      osc.frequency.setValueAtTime(659, now + 0.1);
      osc.frequency.setValueAtTime(880, now + 0.15);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now); osc.stop(now + 0.25); break;
    case 'hit':
      osc.type = 'square';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.08);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.start(now); osc.stop(now + 0.08); break;
  }
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
