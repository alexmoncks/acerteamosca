const { createServer } = require("http");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 3003;

const TILE = 40;
const COLS = 12;
const ROWS = 16;
const SHIP_R = 10;
const SHIP_SIZE = 24;
const SHIP_SPD = 2.2;
const SHIP_BACK = 1.2;
const ROT_SPD = 4 * (Math.PI / 180);
const BULLET_SPD = 5;
const BULLET_MAX_BOUNCE = 2;
const BULLET_MAX_DIST = SHIP_SIZE * 10;
const WIN_SCORE = 10;
const RESPAWN_FRAMES = 90;

const SPAWN = [
  { x: 2.5 * TILE, y: (ROWS - 3) * TILE + TILE / 2, a: -Math.PI / 4 },
  { x: (COLS - 2.5) * TILE, y: 2 * TILE + TILE / 2, a: (Math.PI * 3) / 4 },
];

const sessions = new Map();

function genId() {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 6; i++) id += c[Math.floor(Math.random() * c.length)];
  return id;
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function isWallTile(grid, x, y) {
  const c = Math.floor(x / TILE), r = Math.floor(y / TILE);
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true;
  return grid[r][c] === 1;
}

function collidesWall(grid, x, y, rad) {
  const minC = Math.floor((x - rad) / TILE), maxC = Math.floor((x + rad) / TILE);
  const minR = Math.floor((y - rad) / TILE), maxR = Math.floor((y + rad) / TILE);
  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true;
      if (grid[r][c] === 1) {
        const cx = clamp(x, c * TILE, (c + 1) * TILE);
        const cy = clamp(y, r * TILE, (r + 1) * TILE);
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy < rad * rad) return true;
      }
    }
  }
  return false;
}

function bfs(grid, sr, sc, er, ec) {
  if (grid[sr]?.[sc] === 1 || grid[er]?.[ec] === 1) return false;
  const vis = new Set([`${sr},${sc}`]);
  const q = [[sr, sc]];
  while (q.length) {
    const [r, c] = q.shift();
    if (r === er && c === ec) return true;
    for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
      const nr = r + dr, nc = c + dc, k = `${nr},${nc}`;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !vis.has(k) && grid[nr][nc] === 0) {
        vis.add(k);
        q.push([nr, nc]);
      }
    }
  }
  return false;
}

function generateMaze() {
  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  for (let c = 0; c < COLS; c++) { grid[0][c] = 1; grid[ROWS - 1][c] = 1; }
  for (let r = 0; r < ROWS; r++) { grid[r][0] = 1; grid[r][COLS - 1] = 1; }

  // Place scattered wall segments (shorter, fewer = more open)
  for (let attempt = 0, placed = 0; attempt < 40 && placed < 10; attempt++) {
    const horiz = Math.random() > 0.5;
    const len = 2 + Math.floor(Math.random() * 2); // 2-3 tiles max
    const r = 2 + Math.floor(Math.random() * (ROWS - 5));
    const c = 2 + Math.floor(Math.random() * (COLS - 5));
    if ((r > ROWS - 6 && c < 5) || (r < 5 && c > COLS - 6)) continue;

    const tiles = [];
    for (let j = 0; j < len; j++) {
      const tr = horiz ? r : r + j, tc = horiz ? c + j : c;
      if (tr >= 1 && tr < ROWS - 1 && tc >= 1 && tc < COLS - 1 && grid[tr][tc] === 0) tiles.push([tr, tc]);
    }
    if (tiles.length < 2) continue;
    tiles.forEach(([tr, tc]) => (grid[tr][tc] = 1));
    // Check multiple paths exist (not just one bottleneck)
    if (!bfs(grid, ROWS - 3, 2, 2, COLS - 3) || !bfs(grid, ROWS - 3, COLS - 3, 2, 2)) {
      tiles.forEach(([tr, tc]) => (grid[tr][tc] = 0));
    } else {
      placed++;
    }
  }

  // Add a few single-block obstacles for cover variety
  for (let i = 0; i < 6; i++) {
    const r = 3 + Math.floor(Math.random() * (ROWS - 7));
    const c = 3 + Math.floor(Math.random() * (COLS - 7));
    if (grid[r][c] === 0) {
      grid[r][c] = 1;
      if (!bfs(grid, ROWS - 3, 2, 2, COLS - 3)) grid[r][c] = 0;
    }
  }

  // Clear spawn areas (larger zone)
  for (let dr = -2; dr <= 2; dr++)
    for (let dc = -2; dc <= 2; dc++) {
      const r1 = ROWS - 3 + dr, c1 = 2 + dc, r2 = 2 + dr, c2 = COLS - 3 + dc;
      if (r1 > 0 && r1 < ROWS - 1 && c1 > 0 && c1 < COLS - 1) grid[r1][c1] = 0;
      if (r2 > 0 && r2 < ROWS - 1 && c2 > 0 && c2 < COLS - 1) grid[r2][c2] = 0;
    }
  return grid;
}

function newShips() {
  return SPAWN.map((s) => ({ x: s.x, y: s.y, a: s.a, alive: true }));
}

function send(ws, m) { if (ws?.readyState === 1) ws.send(JSON.stringify(m)); }
function broadcast(ses, m) { ses.players.forEach((ws) => send(ws, m)); }

function stopGame(ses) {
  ses.active = false;
  if (ses.interval) { clearInterval(ses.interval); ses.interval = null; }
}

function startGame(ses) {
  stopGame(ses);
  ses.maze = generateMaze();
  ses.ships = newShips();
  ses.bullets = [null, null];
  ses.scores = [0, 0];
  ses.state = "playing";
  ses.timer = 0;
  ses.inputs = [{}, {}];
  ses.active = true;
  broadcast(ses, { t: "start", maze: ses.maze });
  ses.interval = setInterval(() => gameLoop(ses), 1000 / 60);
}

function moveShip(ship, keys, maze) {
  if (!ship.alive) return;
  if (keys.l) ship.a -= ROT_SPD;
  if (keys.r) ship.a += ROT_SPD;
  let spd = 0;
  if (keys.u) spd = SHIP_SPD;
  else if (keys.d) spd = -SHIP_BACK;
  if (spd !== 0) {
    const nx = ship.x + Math.cos(ship.a) * spd;
    const ny = ship.y + Math.sin(ship.a) * spd;
    if (!collidesWall(maze, nx, ship.y, SHIP_R)) ship.x = nx;
    if (!collidesWall(maze, ship.x, ny, SHIP_R)) ship.y = ny;
  }
}

function moveBullet(b, maze) {
  if (!b) return null;
  const nx = b.x + b.vx, ny = b.y + b.vy;
  const hitX = isWallTile(maze, nx, b.y);
  const hitY = isWallTile(maze, b.x, ny);
  let bounced = false;
  if (hitX && hitY) { b.vx *= -1; b.vy *= -1; bounced = true; }
  else if (hitX) { b.vx *= -1; b.y = ny; bounced = true; }
  else if (hitY) { b.vy *= -1; b.x = nx; bounced = true; }
  else { b.x = nx; b.y = ny; }
  if (bounced) { b.bounces++; }
  b.dist += BULLET_SPD;
  if (b.bounces > BULLET_MAX_BOUNCE || b.dist > BULLET_MAX_DIST) return null;
  return b;
}

function gameLoop(ses) {
  if (!ses.active) return;

  if (ses.state === "respawning") {
    ses.timer--;
    if (ses.timer <= 0) {
      ses.maze = generateMaze();
      ses.ships = newShips();
      ses.bullets = [null, null];
      ses.state = "playing";
      broadcast(ses, { t: "maze", maze: ses.maze });
    }
    broadcast(ses, {
      t: "g",
      s: ses.ships.map((s) => [Math.round(s.x), Math.round(s.y), Math.round(s.a * 100) / 100, s.alive ? 1 : 0]),
      b: ses.bullets.map((b) => (b ? [Math.round(b.x), Math.round(b.y)] : null)),
      c: ses.scores,
      st: ses.state,
    });
    return;
  }

  // Move ships
  for (let i = 0; i < 2; i++) moveShip(ses.ships[i], ses.inputs[i], ses.maze);

  // Shoot
  for (let i = 0; i < 2; i++) {
    if (ses.inputs[i].s && !ses.bullets[i] && ses.ships[i].alive) {
      ses.bullets[i] = {
        x: ses.ships[i].x + Math.cos(ses.ships[i].a) * (SHIP_R + 4),
        y: ses.ships[i].y + Math.sin(ses.ships[i].a) * (SHIP_R + 4),
        vx: Math.cos(ses.ships[i].a) * BULLET_SPD,
        vy: Math.sin(ses.ships[i].a) * BULLET_SPD,
        bounces: 0, dist: 0,
      };
      ses.inputs[i].s = false; // consume
      broadcast(ses, { t: "sfx", s: "laser" });
    }
  }

  // Move bullets
  for (let i = 0; i < 2; i++) {
    ses.bullets[i] = moveBullet(ses.bullets[i], ses.maze);
  }

  // Check ricochet sound (sent from moveBullet via bounce count)
  // Already handled inline

  // Hit detection
  for (let i = 0; i < 2; i++) {
    const b = ses.bullets[i];
    const target = ses.ships[1 - i];
    if (!b || !target.alive) continue;
    const dx = b.x - target.x, dy = b.y - target.y;
    if (dx * dx + dy * dy < (SHIP_R + 3) * (SHIP_R + 3)) {
      target.alive = false;
      ses.bullets[i] = null;
      ses.scores[i]++;
      broadcast(ses, { t: "sfx", s: "explosion" });

      if (ses.scores[i] >= WIN_SCORE) {
        broadcast(ses, { t: "end", winner: i + 1, c: ses.scores });
        stopGame(ses);
        return;
      }
      ses.state = "respawning";
      ses.timer = RESPAWN_FRAMES;
    }
  }

  broadcast(ses, {
    t: "g",
    s: ses.ships.map((s) => [Math.round(s.x), Math.round(s.y), Math.round(s.a * 100) / 100, s.alive ? 1 : 0]),
    b: ses.bullets.map((b) => (b ? [Math.round(b.x), Math.round(b.y)] : null)),
    c: ses.scores,
    st: ses.state,
  });
}

// HTTP + WebSocket Server
const server = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Ships WS OK");
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.t) {
      case "create": {
        let id;
        do { id = genId(); } while (sessions.has(id));
        const ses = { id, players: [ws, null], active: false, interval: null, _restartVotes: null };
        sessions.set(id, ses);
        ws._sid = id;
        ws._pi = 0;
        send(ws, { t: "created", id });
        break;
      }
      case "join": {
        const ses = sessions.get(msg.id?.toUpperCase());
        if (!ses || ses.players[1]) { send(ws, { t: "error", msg: "Sala nao encontrada" }); break; }
        ses.players[1] = ws;
        ws._sid = ses.id;
        ws._pi = 1;
        send(ws, { t: "joined", player: 2 });
        send(ses.players[0], { t: "opponent_joined" });
        startGame(ses);
        break;
      }
      case "k": {
        const ses = sessions.get(ws._sid);
        if (!ses) break;
        ses.inputs[ws._pi] = { u: msg.u, d: msg.d, l: msg.l, r: msg.r, s: msg.s };
        break;
      }
      case "restart": {
        const ses = sessions.get(ws._sid);
        if (!ses || ses.active) break;
        if (!ses._restartVotes) ses._restartVotes = new Set();
        ses._restartVotes.add(ws._pi);
        if (ses._restartVotes.size >= 2) { ses._restartVotes = null; startGame(ses); }
        else { const oi = ws._pi === 0 ? 1 : 0; send(ses.players[oi], { t: "restart_req" }); }
        break;
      }
    }
  });

  ws.on("close", () => {
    const sid = ws._sid;
    if (!sid) return;
    const ses = sessions.get(sid);
    if (!ses) return;
    const oi = ws._pi === 0 ? 1 : 0;
    send(ses.players[oi], { t: "left" });
    stopGame(ses);
    sessions.delete(sid);
  });
});

server.listen(PORT, () => {
  console.log(`\u{1F680} Ships WebSocket server running on port ${PORT}`);
});
