// ====
// GAME CONFIG
// ====
const COLS = 18, ROWS = 13;
const CELL = 32;
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width  = COLS * CELL;
canvas.height = ROWS * CELL;

// ====
// SISTEMA DE MAPAS POR LEVEL
// ====
const LEVEL_MAPS = [
  {
    name: "Rede Local",
    path: [
      [0,1],[1,1],[2,1],[3,1],[3,2],[3,3],[3,4],
      [4,4],[5,4],[6,4],[7,4],[7,3],[7,2],[7,1],
      [8,1],[9,1],[10,1],[11,1],[12,1],[13,1],[14,1],
      [14,2],[14,3],[14,4],[14,5],[14,6],[14,7],
      [13,7],[12,7],[11,7],[10,7],[9,7],[8,7],[7,7],[6,7],[5,7],[4,7],
      [4,8],[4,9],[4,10],[4,11],[5,11],[6,11],[7,11],[8,11],[9,11],[9,12]
    ]
  },
  {
    name: "Servidor Central",
    path: [
      [0,2],[1,2],[2,2],[3,2],[4,2],[5,2],[6,2],[7,2],[8,2],
      [8,3],[8,4],[8,5],
      [7,5],[6,5],[5,5],[4,5],[3,5],[2,5],[1,5],
      [1,6],[1,7],[1,8],
      [2,8],[3,8],[4,8],[5,8],[6,8],[7,8],[8,8],[9,8],[10,8],
      [10,9],[10,10],[10,11],
      [11,11],[12,11],[13,11],[14,11],[15,11],[16,11],[17,11],[17,12]
    ]
  },
  {
    name: "Firewall Principal",
    path: [
      [0,6],[1,6],[2,6],[3,6],[4,6],[5,6],[6,6],
      [6,5],[6,4],[6,3],[6,2],[6,1],
      [7,1],[8,1],[9,1],[10,1],[11,1],[12,1],
      [12,2],[12,3],[12,4],[12,5],[12,6],[12,7],[12,8],[12,9],[12,10],
      [11,10],[10,10],[9,10],[8,10],[7,10],[6,10],[5,10],[4,10],[3,10],
      [3,9],[3,8],[3,7],
      [4,7],[5,7],[6,7],[7,7],[8,7],[9,7],[9,8],[9,9],[9,10],[9,11],[9,12]
    ]
  },
  {
    name: "Banco de Dados",
    path: [
      [0,0],[1,0],[2,0],[2,1],[2,2],[3,2],[4,2],[5,2],[5,3],[5,4],[5,5],
      [6,5],[7,5],[8,5],[9,5],[10,5],[10,4],[10,3],[10,2],
      [11,2],[12,2],[13,2],[14,2],[15,2],
      [15,3],[15,4],[15,5],[15,6],[15,7],[15,8],
      [14,8],[13,8],[12,8],[11,8],[10,8],
      [10,9],[10,10],[10,11],[11,11],[12,11],[13,11],[14,11],[15,11],[16,11],[17,12]
    ]
  },
];

let PATH_NODES, PATH_PX, PATH_SET;

function loadMap(levelIndex) {
  const map = LEVEL_MAPS[levelIndex % LEVEL_MAPS.length];
  PATH_NODES = map.path;
  PATH_PX = PATH_NODES.map(([c,r]) => ({x: c*CELL+CELL/2, y: r*CELL+CELL/2}));
  PATH_SET = new Set(PATH_NODES.map(([c,r]) => `${c},${r}`));
  log(`📍 Mapa: ${map.name}`, 'log-gold');
}

// ====
// TOWER DEFINITIONS
// ====
const TOWER_DEFS = {
  archer: { name:'Sandbox',      icon:'🏹', cost:50, damage:20, range:3, rate:1.5, color:'#c9a84c', splash:0, slow:0, desc:'Atira rápido em inimigos próximos.', targetTier: 1 },
  cannon: { name:'Backup',       icon:'💣', cost:50, damage:20, range:3, rate:1.5, color:'#e05050', splash:0, slow:0, desc:'Explosão em área. Lento mas potente.', targetTier: 2 },
  ice:    { name:'Firewall',     icon:'❄️', cost:50, damage:20, range:3, rate:1.5, color:'#80c8f0', splash:0, slow:0, desc:'Congela inimigos por 1.5s.', targetTier: 3 },
  laser:  { name:'Anti-Spyware', icon:'🔴', cost:50, damage:20, range:3, rate:1.5, color:'#ff4040', splash:0, slow:0, desc:'Dano contínuo, sem cooldown.', targetTier: 4 },
};

// ====
// TODOS OS INIMIGOS IGUAIS
// ====
const ENEMY_TYPES = [
  { name:'Trojan',     tier:1, hp:100, speed:1.5, reward:20, color:'#4ade80', size:12, icon:'👾',
    desc:'Disfarçado de programa legítimo, o Trojan se infiltra no sistema abrindo portas para outros ataques. Use o Sandbox para isolá-lo!' },
  { name:'Ransomware', tier:2, hp:100, speed:1.5, reward:20, color:'#3b82f6', size:12, icon:'👾',
    desc:'Criptografa seus arquivos e exige resgate. O Backup é sua melhor defesa — restaure tudo sem pagar!' },
  { name:'Worm',       tier:3, hp:100, speed:1.5, reward:20, color:'#a855f7', size:12, icon:'👾',
    desc:'Se replica sozinho pela rede, infectando máquina após máquina. O Firewall bloqueia sua propagação!' },
  { name:'Spyware',    tier:4, hp:100, speed:1.5, reward:20, color:'#ef4444', size:12, icon:'👾',
    desc:'Espiona silenciosamente suas atividades, roubando senhas e dados. O Anti-Spyware detecta e elimina!' },
];

const WAVE_QUESTIONS = {
  1: "O Trojan se disfarça de software legítimo. Qual é a melhor forma de evitar esse tipo de ameaça?",
  2: "O Ransomware criptografa seus arquivos e pede resgate. Qual prática ajuda a se proteger?",
  3: "O Worm se espalha automaticamente pela rede. Como limitar sua propagação?",
  4: "O Spyware monitora suas atividades sem permissão. Como detectá-lo?",
};

// Mix de inimigos por onda — progressivo
function getWaveComposition(wave) {
  if (wave === 1) return [ENEMY_TYPES[0]];
  if (wave === 2) return [ENEMY_TYPES[1]];
  if (wave === 3) return [ENEMY_TYPES[2]];
  if (wave === 4) return [ENEMY_TYPES[3]];
  if (wave === 5) return [ENEMY_TYPES[0], ENEMY_TYPES[1], ENEMY_TYPES[2], ENEMY_TYPES[3]];
  return [ENEMY_TYPES[2], ENEMY_TYPES[3]];
}

// ====
// GAME STATE
// ====
let state = {
  gold: 1000, lives: 20, kills: 0, wave: 0,
  towers: [], enemies: [], projectiles: [], particles: [],
  selectedType: null, selectedTower: null,
  waveRunning: false, waveSpawnCount: 0, waveSpawnMax: 0, waveSpawnTimer: 0,
  gameOver: false, won: false, started: false,
  currentLevel: 0,
};

function log(msg, cls='') {
  const box = document.getElementById('logBox');
  const d = document.createElement('div');
  d.className = cls;
  d.textContent = '› ' + msg;
  box.appendChild(d);
  if (box.children.length > 30) box.removeChild(box.firstChild);
  box.scrollTop = box.scrollHeight;
}

function updateHUD() {
  document.getElementById('livesVal').textContent = state.lives;
  document.getElementById('goldVal').textContent  = state.gold;
  document.getElementById('killsVal').textContent = state.kills;
  document.getElementById('waveVal').textContent  = state.wave;
  for (const [k,v] of Object.entries(TOWER_DEFS)) {
    document.getElementById('btn-'+k).disabled = state.gold < v.cost;
  }
}

function selectTower(type) {
  state.selectedType = (state.selectedType === type) ? null : type;
  state.selectedTower = null;
  document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
  if (state.selectedType) document.getElementById('btn-'+type).classList.add('selected');
  showInfo(null);
}

canvas.addEventListener('click', (e) => {
  if (!state.started || state.gameOver) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleY;
  const col = Math.floor(mx / CELL);
  const row = Math.floor(my / CELL);

  const hit = state.towers.find(t => t.col===col && t.row===row);
  if (hit) {
    state.selectedTower = hit;
    state.selectedType  = null;
    document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
    showInfo(hit);
    return;
  }

  if (state.selectedType) {
    const def = TOWER_DEFS[state.selectedType];
    if (state.gold < def.cost) { log('Ouro insuficiente!','log-bad'); return; }
    if (PATH_SET.has(`${col},${row}`)) { log('Não pode colocar no caminho!','log-bad'); return; }
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;

    state.gold -= def.cost;
    state.towers.push({
      col, row,
      cx: col*CELL+CELL/2, cy: row*CELL+CELL/2,
      type: state.selectedType,
      cooldown: 0, kills: 0, totalDmg: 0,
    });
    log(`${def.name} construída em (${col},${row})`, 'log-gold');
    updateHUD();
  } else {
    state.selectedTower = null;
    showInfo(null);
  }
});

function showInfo(tower) {
  const box = document.getElementById('infoContent');
  if (!tower) {
    box.innerHTML = `<span style="color:var(--muted)">Clique numa torre para detalhes.</span>`;
    return;
  }
  const def = TOWER_DEFS[tower.type];
  box.innerHTML = `
    <div class="info-row"><span class="info-key">Tipo</span><span class="info-val">${def.icon} ${def.name}</span></div>
    <div class="info-row"><span class="info-key">Dano</span><span class="info-val">${def.damage}</span></div>
    <div class="info-row"><span class="info-key">Alcance</span><span class="info-val">${def.range} cel</span></div>
    <div class="info-row"><span class="info-key">Vel. ataque</span><span class="info-val">${def.rate}/s</span></div>
    <div class="info-row"><span class="info-key">Abates</span><span class="info-val">${tower.kills}</span></div>
    <div class="info-row"><span class="info-key">Dano total</span><span class="info-val">${tower.totalDmg}</span></div>
    <div style="margin-top:6px;font-size:10px;color:var(--muted)">${def.desc}</div>
  `;
}

function sellTower() {
  if (!state.selectedTower) { log('Selecione uma torre primeiro.','log-bad'); return; }
  const def = TOWER_DEFS[state.selectedTower.type];
  const refund = Math.floor(def.cost * 0.6);
  state.gold += refund;
  state.towers = state.towers.filter(t => t !== state.selectedTower);
  log(`Torre vendida por ${refund} ouro.`, 'log-gold');
  state.selectedTower = null;
  showInfo(null);
  updateHUD();
}

// ====
// POPUP DE AMEAÇAS
// ====
function showThreats() {
  const nextWave = state.waveRunning ? state.wave : state.wave + 1;
  const pool = getWaveComposition(nextWave);
  // Pega inimigos únicos por tier
  const unique = [];
  const seen = new Set();
  for (const e of pool) {
    if (!seen.has(e.tier)) {
      seen.add(e.tier);
      unique.push(e);
    }
  }

  const popup = document.getElementById('enemyPopup');
  document.getElementById('popupEnemyName').textContent = `Onda ${nextWave}`;
  document.getElementById('popupEnemyName').style.color = 'var(--gold-light)';
  document.getElementById('popupEnemyDesc').textContent = `${unique.length} tipo(s) de vírus nesta onda:`;

  let statsHTML = '';
  for (const e of unique) {
    statsHTML += `
      <div style="margin-bottom:14px;padding:10px;border:1px solid ${e.color}33;border-radius:6px;background:${e.color}0a;">
        <div style="font-size:14px;color:${e.color};margin-bottom:6px;">${e.icon} ${e.name} <span style="font-size:10px;color:var(--muted);">(Tier ${e.tier})</span></div>
        <div style="font-size:11px;color:var(--text);line-height:1.6;margin-bottom:8px;">${e.desc}</div>
        <div class="popUp-stat"><span>HP</span><span>${e.hp}</span></div>
        <div class="popUp-stat"><span>Velocidade</span><span>${e.speed}</span></div>
        <div class="popUp-stat"><span>Recompensa</span><span>💰 ${e.reward}</span></div>
      </div>
    `;
  }
  document.getElementById('popupEnemyStats').innerHTML = statsHTML;
  popup.style.display = 'flex';
}

function closeEnemyPopup() {
  document.getElementById('enemyPopup').style.display = 'none';
}

// ====
// WAVE SPAWNING
// ====
function startWave() {
  if (state.waveRunning || state.gameOver) return;
  state.wave++;
  state.waveRunning   = true;
  state.waveSpawnTimer = 0;
  state.waveSpawnCount = 0;

  const count = 8 + state.wave * 3;
  state.waveSpawnMax = count;
  const pool = getWaveComposition(state.wave);
  state._waveQueue = [];
  for (let i = 0; i < count; i++) {
    state._waveQueue.push(pool[Math.floor(Math.random()*pool.length)]);
  }

  document.getElementById('startBtn').disabled = true;
  log(`⚔ Onda ${state.wave} iniciada! ${count} inimigos.`, 'log-bad');
  updateHUD();
}

function spawnEnemy(type) {
  const hpMult = 1 + (state.wave - 1) * 0.22;
  state.enemies.push({
    x: PATH_PX[0].x, y: PATH_PX[0].y,
    pathIdx: 0, progress: 0,
    hp:    Math.floor(type.hp * hpMult),
    maxHp: Math.floor(type.hp * hpMult),
    speed: type.speed,
    slow: 0, slowTimer: 0,
    reward: type.reward,
    color: type.color,
    size:  type.size,
    name:  type.name,
    tier:  type.tier,
  });
}

// ====
// MAIN GAME LOOP
// ====
let lastTime = 0;
function gameLoop(ts) {
  if (!state.started) { requestAnimationFrame(gameLoop); return; }
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;

  if (!state.gameOver) {
    updateSpawn(dt);
    updateEnemies(dt);
    updateTowers(dt);
    updateProjectiles(dt);
    updateParticles(dt);
    checkWaveEnd();
  }

  draw();
  requestAnimationFrame(gameLoop);
}

function updateSpawn(dt) {
  if (!state.waveRunning || state.waveSpawnCount >= state.waveSpawnMax) return;
  state.waveSpawnTimer -= dt;
  if (state.waveSpawnTimer <= 0) {
    spawnEnemy(state._waveQueue[state.waveSpawnCount]);
    state.waveSpawnCount++;
    state.waveSpawnTimer = 1.2;
  }
}

function updateEnemies(dt) {
  const toRemove = [];
  for (const e of state.enemies) {
    if (e.slowTimer > 0) { e.slowTimer -= dt; if (e.slowTimer <= 0) e.slow = 0; }
    const spd = e.speed * CELL * (1 - e.slow);

    let dist = spd * dt;
    while (dist > 0 && e.pathIdx < PATH_PX.length - 1) {
      const next = PATH_PX[e.pathIdx + 1];
      const dx = next.x - e.x, dy = next.y - e.y;
      const d  = Math.sqrt(dx*dx + dy*dy);
      if (dist >= d) {
        e.x = next.x; e.y = next.y;
        e.pathIdx++;
        dist -= d;
      } else {
        e.x += dx/d*dist; e.y += dy/d*dist;
        dist = 0;
      }
    }
    e.progress = e.pathIdx / (PATH_PX.length - 1);

    if (e.pathIdx >= PATH_PX.length - 1) {
      toRemove.push(e);
      const dmg = e.tier;
      state.lives = Math.max(0, state.lives - dmg);
      log(`${e.name} passou! -${dmg} vida`, 'log-bad');
      spawnParticles(e.x, e.y, '#e05050', 10);
      if (state.lives <= 0) { triggerGameOver(); }
    }
  }
  state.enemies = state.enemies.filter(e => !toRemove.includes(e));
  updateHUD();
}

function updateTowers(dt) {
  for (const t of state.towers) {
    const def = TOWER_DEFS[t.type];
    t.cooldown = Math.max(0, t.cooldown - dt);
    if (t.cooldown > 0) continue;

    const rangePx = def.range * CELL;
    let target = null, bestProg = -1;
    for (const e of state.enemies) {
      if (def.targetTier && e.tier !== def.targetTier) continue;
      const dx = e.x - t.cx, dy = e.y - t.cy;
      if (Math.sqrt(dx*dx+dy*dy) <= rangePx && e.progress > bestProg) {
        bestProg = e.progress; target = e;
      }
    }
    if (!target) continue;

    t.cooldown = 1 / def.rate;
    fireProjectile(t, target, def);
  }
}

function fireProjectile(tower, target, def) {
  state.projectiles.push({
    x: tower.cx, y: tower.cy,
    target, type: tower.type,
    damage: def.damage, splash: def.splash, slow: def.slow,
    towerRef: tower, speed: CELL * 10, color: def.color,
  });
}

function updateProjectiles(dt) {
  const toRemove = [];
  for (const p of state.projectiles) {
    if (!state.enemies.includes(p.target)) { toRemove.push(p); continue; }
    const dx = p.target.x - p.x, dy = p.target.y - p.y;
    const d  = Math.sqrt(dx*dx + dy*dy);
    if (d < 6) { hitEnemy(p); toRemove.push(p); }
    else {
      p.x += dx/d * p.speed * dt;
      p.y += dy/d * p.speed * dt;
    }
  }
  state.projectiles = state.projectiles.filter(p => !toRemove.includes(p));
}

function hitEnemy(p) {
  if (p.splash > 0) {
    const splashPx = p.splash * CELL;
    for (const e of [...state.enemies]) {
      const dx = e.x - p.target.x, dy = e.y - p.target.y;
      if (Math.sqrt(dx*dx+dy*dy) <= splashPx) {
        damageEnemy(e, p.damage, p.towerRef);
      }
    }
    spawnParticles(p.target.x, p.target.y, '#ff8040', 16);
  } else {
    damageEnemy(p.target, p.damage, p.towerRef);
  }

  if (p.slow > 0 && state.enemies.includes(p.target)) {
    p.target.slow = p.slow;
    p.target.slowTimer = 1.5;
  }
}

function damageEnemy(e, dmg, tower) {
  e.hp -= dmg;
  tower.totalDmg += dmg;
  if (e.hp <= 0) killEnemy(e, tower);
}

function killEnemy(e, tower) {
  state.enemies = state.enemies.filter(x => x !== e);
  state.gold  += e.reward;
  state.kills += 1;
  tower.kills += 1;
  spawnParticles(e.x, e.y, e.color, 12);
  if (Math.random() < 0.2) log(`${TOWER_DEFS[tower.type].name} abateu ${e.name} (+${e.reward}💰)`, 'log-good');
  updateHUD();
  if (state.selectedTower === tower) showInfo(tower);
}

function checkWaveEnd() {
  if (!state.waveRunning) return;
  const spawnDone = state.waveSpawnCount >= state.waveSpawnMax;
  if (spawnDone && state.enemies.length === 0) {
    state.waveRunning = false;
    document.getElementById('startBtn').disabled = false;
    const bonus = 20 + state.wave * 5;
    state.gold += bonus;
    log(`Onda ${state.wave} concluída! +${bonus} ouro bônus.`, 'log-gold');
    if (state.wave === 5 && !state._freeMode) {
      document.getElementById('thanksPopup').style.display = 'flex';
    } else if (state.wave <= 4 && !state._freeMode) {
      showQuiz(state.wave);
    }
    updateHUD();

    // === TROCA DE MAPA A CADA 1 ONDA ===
    const newLevel = Math.floor(state.wave / 1);
    if (newLevel !== state.currentLevel && state.wave < 12) {
      state.currentLevel = newLevel;
      loadMap(state.currentLevel);

      // Reembolsa 60% de TODAS as torres e remove
      for (const t of state.towers) {
        const refund = Math.floor(TOWER_DEFS[t.type].cost * 0.6);
        state.gold += refund;
      }
      log(`⚠ Mapa mudou! ${state.towers.length} torre(s) removida(s) (reembolso 60%).`, 'log-bad');
      state.towers = [];
      state.selectedTower = null;
      showInfo(null);
      updateHUD();
    }

    if (state.wave >= 12) {
      state.gameOver = true; state.won = true;
      showOverlay('VITÓRIA!', `Você defendeu ${state.kills} inimigos em ${state.wave} ondas!`, '🏆 Jogar Novamente');
    }
  }

  const total = state.waveSpawnMax;
  const pct = total > 0 ? Math.min(100, (state.waveSpawnCount / total) * 100) : 0;
  document.getElementById('waveFill').style.width = pct + '%';
  document.getElementById('waveStatus').textContent =
    state.waveRunning ? `Onda ${state.wave}: ${state.enemies.length} restantes` : `Onda ${state.wave} completa`;
}

function triggerGameOver() {
  state.gameOver = true;
  showOverlay('GAME OVER', `Você chegou à onda ${state.wave} com ${state.kills} abates.`, '↺ Tentar Novamente');
}

function spawnParticles(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 1 + Math.random() * 3;
    state.particles.push({
      x, y,
      vx: Math.cos(a)*s, vy: Math.sin(a)*s,
      life: 0.4 + Math.random()*0.4,
      maxLife: 0.8,
      color, r: 2 + Math.random()*3,
    });
  }
}

function updateParticles(dt) {
  state.particles = state.particles.filter(p => {
    p.x += p.vx; p.y += p.vy;
    p.vx *= 0.92; p.vy *= 0.92;
    p.life -= dt;
    return p.life > 0;
  });
}

// ====
// DRAWING
// ====
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  drawPath();
  drawTowerRanges();
  drawTowers();
  drawEnemies();
  drawProjectiles();
  drawParticles();
  drawHoverCell();
}

function drawGrid() {
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath(); ctx.moveTo(c*CELL,0); ctx.lineTo(c*CELL, canvas.height); ctx.stroke();
  }
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath(); ctx.moveTo(0, r*CELL); ctx.lineTo(canvas.width, r*CELL); ctx.stroke();
  }
}

function drawPath() {
  for (const [c,r] of PATH_NODES) {
    ctx.fillStyle = 'rgba(120,90,50,0.25)';
    ctx.fillRect(c*CELL+1, r*CELL+1, CELL-2, CELL-2);
  }
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(180,140,80,0.35)';
  ctx.lineWidth   = 3;
  ctx.lineJoin    = 'round';
  ctx.lineCap     = 'round';
  ctx.moveTo(PATH_PX[0].x, PATH_PX[0].y);
  for (let i = 1; i < PATH_PX.length; i++) ctx.lineTo(PATH_PX[i].x, PATH_PX[i].y);
  ctx.stroke();

  ctx.fillStyle = '#4caf7d';
  ctx.beginPath(); ctx.arc(PATH_PX[0].x, PATH_PX[0].y, 7, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#e05050';
  const last = PATH_PX[PATH_PX.length-1];
  ctx.beginPath(); ctx.arc(last.x, last.y, 7, 0, Math.PI*2); ctx.fill();

  ctx.font = '10px Share Tech Mono';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText('IN',  PATH_PX[0].x, PATH_PX[0].y+4);
  ctx.fillText('OUT', last.x, last.y+4);
}

function drawTowerRanges() {
  if (state.selectedTower) {
    const def = TOWER_DEFS[state.selectedTower.type];
    ctx.beginPath();
    ctx.arc(state.selectedTower.cx, state.selectedTower.cy, def.range*CELL, 0, Math.PI*2);
    ctx.strokeStyle = 'rgba(201,168,76,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(201,168,76,0.06)';
    ctx.fill();
  }
  if (state.selectedType && hoverCell) {
    const def = TOWER_DEFS[state.selectedType];
    const cx = hoverCell.col*CELL+CELL/2, cy = hoverCell.row*CELL+CELL/2;
    ctx.beginPath();
    ctx.arc(cx, cy, def.range*CELL, 0, Math.PI*2);
    ctx.strokeStyle = 'rgba(120,200,120,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = 'rgba(100,200,100,0.04)';
    ctx.fill();
  }
}

function drawTowers() {
  for (const t of state.towers) {
    const def = TOWER_DEFS[t.type];
    const cx = t.cx, cy = t.cy;
    const sel = (state.selectedTower === t);

    ctx.fillStyle = sel ? 'rgba(201,168,76,0.2)' : 'rgba(30,40,55,0.9)';
    ctx.strokeStyle = sel ? '#c9a84c' : '#2a3545';
    ctx.lineWidth = sel ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(t.col*CELL+4, t.row*CELL+4, CELL-8, CELL-8, 4);
    ctx.fill(); ctx.stroke();

    ctx.font = `${CELL*0.48}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.icon, cx, cy);

    const cd = TOWER_DEFS[t.type].rate;
    const frac = 1 - (t.cooldown * cd);
    ctx.beginPath();
    ctx.arc(cx, cy, CELL/2-3, -Math.PI/2, -Math.PI/2 + frac*Math.PI*2);
    ctx.strokeStyle = def.color + '88';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawEnemies() {
  for (const e of state.enemies) {
    const r = e.size;

    ctx.beginPath(); ctx.ellipse(e.x, e.y+r, r*0.8, r*0.3, 0, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill();

    if (e.tier >= 3) {
      ctx.beginPath(); ctx.arc(e.x, e.y, r+3, 0, Math.PI*2);
      ctx.strokeStyle = e.color + '55';
      ctx.lineWidth = e.tier === 4 ? 4 : 2;
      ctx.stroke();
    }

    ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, Math.PI*2);
    ctx.fillStyle = e.slow > 0 ? '#80c8f0' : e.color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.5; ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `bold ${Math.floor(r*0.9)}px Share Tech Mono`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(e.tier, e.x, e.y+1);

    const bw = r*2.4, bh = 3;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(e.x - bw/2, e.y - r - 7, bw, bh);
    ctx.fillStyle = e.hp/e.maxHp > 0.5 ? '#4caf7d' : e.hp/e.maxHp > 0.25 ? '#f0d080' : '#e05050';
    ctx.fillRect(e.x - bw/2, e.y - r - 7, bw * (e.hp/e.maxHp), bh);
  }
}

function drawProjectiles() {
  for (const p of state.projectiles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.type === 'cannon' ? 5 : 3, 0, Math.PI*2);
    ctx.fillStyle = p.color;
    ctx.shadowBlur = 8; ctx.shadowColor = p.color;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function drawParticles() {
  for (const p of state.particles) {
    const alpha = p.life / p.maxLife;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * alpha, 0, Math.PI*2);
    ctx.fillStyle = p.color + Math.floor(alpha*255).toString(16).padStart(2,'0');
    ctx.fill();
  }
}

let hoverCell = null;
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width  / rect.width;
  const scaleY = canvas.height / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top)  * scaleY;
  const col = Math.floor(mx/CELL), row = Math.floor(my/CELL);
  if (col >= 0 && col < COLS && row >= 0 && row < ROWS) hoverCell = {col, row};
  else hoverCell = null;
});
canvas.addEventListener('mouseleave', () => { hoverCell = null; });

function drawHoverCell() {
  if (!hoverCell || !state.selectedType) return;
  const {col, row} = hoverCell;
  const onPath = PATH_SET.has(`${col},${row}`);
  const occupied = state.towers.some(t => t.col===col && t.row===row);
  ctx.fillStyle = (onPath || occupied) ? 'rgba(224,80,80,0.25)' : 'rgba(100,200,100,0.12)';
  ctx.strokeStyle = (onPath || occupied) ? '#e05050' : '#4caf7d';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(col*CELL+2, row*CELL+2, CELL-4, CELL-4, 3);
  ctx.fill(); ctx.stroke();
}

// ====
// OVERLAY / GAME INIT
// ====
function showQuiz(wave) {
  const q = WAVE_QUESTIONS[wave] || `Qual é a principal vulnerabilidade explorada pelos vírus da onda ${wave}?`;
  document.getElementById('quizQuestion').textContent = q;
  document.getElementById('quizPopup').style.display = 'flex';
}

function closeQuiz() {
  document.getElementById('quizPopup').style.display = 'none';
}

function continuePlaying() {
  document.getElementById('thanksPopup').style.display = 'none';
  state._freeMode = true;
  log('Modo livre ativado! Sem popups de perguntas.', 'log-gold');
}

function stopPlaying() {
  document.getElementById('thanksPopup').style.display = 'none';
  startGame();
}

function showOverlay(title, msg, btnLabel) {
  document.getElementById('overlayTitle').textContent = title;
  document.getElementById('overlayMsg').textContent   = msg;
  document.querySelector('#overlay .btn').textContent = btnLabel;
  document.getElementById('overlay').style.display    = 'flex';
}

function startGame() {
  document.getElementById('overlay').style.display = 'none';
  resetGame();
  state.started = true;
  log('Jogo iniciado! Coloque torres e comece a primeira onda.', 'log-gold');
  updateHUD();
}

function resetGame() {
  state = {
    gold:150, lives:20, kills:0, wave:0,
    towers:[], enemies:[], projectiles:[], particles:[],
    selectedType:null, selectedTower:null,
    waveRunning:false, waveSpawnCount:0, waveSpawnMax:0, waveSpawnTimer:0,
    gameOver:false, won:false, started:true,
    currentLevel: 0,
    _waveQueue:[], _freeMode: false,
  };
  loadMap(0);
  document.getElementById('startBtn').disabled = false;
  document.getElementById('waveFill').style.width = '0%';
  document.getElementById('waveStatus').textContent = 'Aguardando início...';
  document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
  showInfo(null);
  document.getElementById('logBox').innerHTML = '';
  updateHUD();
}

requestAnimationFrame(gameLoop);