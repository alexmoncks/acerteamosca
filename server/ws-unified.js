const { createServer } = require("http");
const { WebSocketServer } = require("ws");
const url = require("url");

const PORT = process.env.PORT || 3002;

// ===== SHARED HELPERS =====

function genId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function send(ws, msg) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
}

function broadcast(session, msg) {
  const data = JSON.stringify(msg);
  session.players.forEach((ws) => {
    if (ws && ws.readyState === 1) ws.send(data);
  });
}

// ===== CREATE HTTP SERVER =====

const server = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Acerte a Mosca unified WS server");
});

// ===== CREATE 5 WSS INSTANCES (noServer) =====

const wssPong = new WebSocketServer({ noServer: true });
const wssShips = new WebSocketServer({ noServer: true });
const wssMemory = new WebSocketServer({ noServer: true });
const wss2048 = new WebSocketServer({ noServer: true });
const wssBatalha = new WebSocketServer({ noServer: true });

// ===== ROUTE UPGRADE REQUESTS BY PATH =====

server.on("upgrade", (request, socket, head) => {
  const { pathname } = url.parse(request.url);

  if (pathname === "/pong") {
    wssPong.handleUpgrade(request, socket, head, (ws) => {
      wssPong.emit("connection", ws, request);
    });
  } else if (pathname === "/ships") {
    wssShips.handleUpgrade(request, socket, head, (ws) => {
      wssShips.emit("connection", ws, request);
    });
  } else if (pathname === "/memory") {
    wssMemory.handleUpgrade(request, socket, head, (ws) => {
      wssMemory.emit("connection", ws, request);
    });
  } else if (pathname === "/2048") {
    wss2048.handleUpgrade(request, socket, head, (ws) => {
      wss2048.emit("connection", ws, request);
    });
  } else if (pathname === "/batalha-naval") {
    wssBatalha.handleUpgrade(request, socket, head, (ws) => {
      wssBatalha.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

// =============================================================================
// ===== PONG GAME LOGIC =====
// =============================================================================

const PONG_CANVAS_W = 480;
const PONG_CANVAS_H = 640;
const PONG_PADDLE_W = 80;
const PONG_PADDLE_H = 12;
const PONG_BALL_R = 6;
const PONG_P1_Y = PONG_CANVAS_H - 40;
const PONG_P2_Y = 28;
const PONG_WIN_SCORE = 10;
const PONG_BASE_SPEED = 5;
const PONG_MAX_ANGLE = 0.75;

const pongSessions = new Map();

function pongNewBall(servingIdx) {
  return {
    x: PONG_CANVAS_W / 2,
    y: servingIdx === 0
      ? PONG_P1_Y - PONG_PADDLE_H / 2 - PONG_BALL_R - 2
      : PONG_P2_Y + PONG_PADDLE_H / 2 + PONG_BALL_R + 2,
    vx: 0,
    vy: 0,
  };
}

function pongStopGame(session) {
  session.active = false;
  if (session.interval) {
    clearInterval(session.interval);
    session.interval = null;
  }
}

function pongCleanupSession(sessionId) {
  const session = pongSessions.get(sessionId);
  if (!session) return;
  pongStopGame(session);
  pongSessions.delete(sessionId);
}

function pongResetSession(session) {
  session.scores = [0, 0];
  session.serving = 0;
  session.launched = false;
  session.speed = PONG_BASE_SPEED;
  session.rallyCount = 0;
  session.paddles = [PONG_CANVAS_W / 2, PONG_CANVAS_W / 2];
  session.ball = pongNewBall(0);
}

function pongStartGame(session) {
  pongStopGame(session);
  pongResetSession(session);
  session.active = true;
  broadcast(session, { t: "start" });
  session.interval = setInterval(() => pongGameLoop(session), 1000 / 60);
}

function pongGameLoop(session) {
  if (!session.active) return;

  const { ball, paddles, scores } = session;

  if (!session.launched) {
    if (session.serving === 0) {
      ball.x = paddles[0];
      ball.y = PONG_P1_Y - PONG_PADDLE_H / 2 - PONG_BALL_R - 2;
    } else {
      ball.x = paddles[1];
      ball.y = PONG_P2_Y + PONG_PADDLE_H / 2 + PONG_BALL_R + 2;
    }
  } else {
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Wall collision
    if (ball.x - PONG_BALL_R <= 0) {
      ball.x = PONG_BALL_R;
      ball.vx = Math.abs(ball.vx);
      broadcast(session, { t: "sfx", s: "wall" });
    }
    if (ball.x + PONG_BALL_R >= PONG_CANVAS_W) {
      ball.x = PONG_CANVAS_W - PONG_BALL_R;
      ball.vx = -Math.abs(ball.vx);
      broadcast(session, { t: "sfx", s: "wall" });
    }

    // Paddle 1 collision (bottom)
    if (
      ball.vy > 0 &&
      ball.y + PONG_BALL_R >= PONG_P1_Y - PONG_PADDLE_H / 2 &&
      ball.y + PONG_BALL_R <= PONG_P1_Y + PONG_PADDLE_H / 2 + 6
    ) {
      const px = paddles[0];
      if (ball.x >= px - PONG_PADDLE_W / 2 - PONG_BALL_R && ball.x <= px + PONG_PADDLE_W / 2 + PONG_BALL_R) {
        const hitPos = (ball.x - px) / (PONG_PADDLE_W / 2);
        session.rallyCount++;
        session.speed = PONG_BASE_SPEED + session.rallyCount * 0.15;
        ball.vy = -session.speed;
        ball.vx = hitPos * session.speed * PONG_MAX_ANGLE;
        ball.y = PONG_P1_Y - PONG_PADDLE_H / 2 - PONG_BALL_R;
        broadcast(session, { t: "sfx", s: "paddle" });
      }
    }

    // Paddle 2 collision (top)
    if (
      ball.vy < 0 &&
      ball.y - PONG_BALL_R <= PONG_P2_Y + PONG_PADDLE_H / 2 &&
      ball.y - PONG_BALL_R >= PONG_P2_Y - PONG_PADDLE_H / 2 - 6
    ) {
      const px = paddles[1];
      if (ball.x >= px - PONG_PADDLE_W / 2 - PONG_BALL_R && ball.x <= px + PONG_PADDLE_W / 2 + PONG_BALL_R) {
        const hitPos = (ball.x - px) / (PONG_PADDLE_W / 2);
        session.rallyCount++;
        session.speed = PONG_BASE_SPEED + session.rallyCount * 0.15;
        ball.vy = session.speed;
        ball.vx = hitPos * session.speed * PONG_MAX_ANGLE;
        ball.y = PONG_P2_Y + PONG_PADDLE_H / 2 + PONG_BALL_R;
        broadcast(session, { t: "sfx", s: "paddle" });
      }
    }

    // P2 scores (ball past bottom)
    if (ball.y - PONG_BALL_R > PONG_CANVAS_H) {
      scores[1]++;
      session.serving = 0;
      session.launched = false;
      session.rallyCount = 0;
      session.speed = PONG_BASE_SPEED;
      ball.vx = 0;
      ball.vy = 0;
      broadcast(session, { t: "sfx", s: "score" });

      if (scores[1] >= PONG_WIN_SCORE) {
        broadcast(session, { t: "end", winner: 2, s1: scores[0], s2: scores[1] });
        pongStopGame(session);
        return;
      }
    }

    // P1 scores (ball past top)
    if (ball.y + PONG_BALL_R < 0) {
      scores[0]++;
      session.serving = 1;
      session.launched = false;
      session.rallyCount = 0;
      session.speed = PONG_BASE_SPEED;
      ball.vx = 0;
      ball.vy = 0;
      broadcast(session, { t: "sfx", s: "score" });

      if (scores[0] >= PONG_WIN_SCORE) {
        broadcast(session, { t: "end", winner: 1, s1: scores[0], s2: scores[1] });
        pongStopGame(session);
        return;
      }
    }
  }

  broadcast(session, {
    t: "gs",
    bx: Math.round(ball.x * 10) / 10,
    by: Math.round(ball.y * 10) / 10,
    p1: Math.round(paddles[0]),
    p2: Math.round(paddles[1]),
    s1: scores[0],
    s2: scores[1],
    sv: session.serving,
    l: session.launched,
  });
}

wssPong.on("connection", (ws) => {
  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    switch (msg.t) {
      case "create": {
        const session = {
          id: null,
          players: [ws, null],
          paddles: [PONG_CANVAS_W / 2, PONG_CANVAS_W / 2],
          ball: pongNewBall(0),
          scores: [0, 0],
          serving: 0,
          launched: false,
          speed: PONG_BASE_SPEED,
          rallyCount: 0,
          interval: null,
          active: false,
        };
        let id;
        do {
          id = genId();
        } while (pongSessions.has(id));
        session.id = id;
        pongSessions.set(id, session);
        ws._sessionId = id;
        ws._playerIdx = 0;
        send(ws, { t: "created", id });
        break;
      }

      case "join": {
        const session = pongSessions.get(msg.id?.toUpperCase());
        if (!session || session.players[1]) {
          send(ws, { t: "error", msg: "Sala nao encontrada ou cheia" });
          break;
        }
        session.players[1] = ws;
        ws._sessionId = session.id;
        ws._playerIdx = 1;
        send(ws, { t: "joined", player: 2 });
        send(session.players[0], { t: "opponent_joined" });
        pongStartGame(session);
        break;
      }

      case "paddle": {
        const session = pongSessions.get(ws._sessionId);
        if (!session) break;
        session.paddles[ws._playerIdx] = Math.max(
          PONG_PADDLE_W / 2,
          Math.min(PONG_CANVAS_W - PONG_PADDLE_W / 2, msg.x)
        );
        break;
      }

      case "launch": {
        const session = pongSessions.get(ws._sessionId);
        if (!session || session.launched) break;
        if (session.serving !== ws._playerIdx) break;
        session.launched = true;
        const dir = session.serving === 0 ? -1 : 1;
        const angle = (Math.random() - 0.5) * 0.5;
        session.ball.vx = angle * session.speed;
        session.ball.vy = dir * session.speed;
        break;
      }

      case "restart": {
        const session = pongSessions.get(ws._sessionId);
        if (!session || session.active) break;
        // Track restart requests
        if (!session._restartVotes) session._restartVotes = new Set();
        session._restartVotes.add(ws._playerIdx);
        if (session._restartVotes.size >= 2) {
          session._restartVotes = null;
          pongStartGame(session);
        } else {
          const otherIdx = ws._playerIdx === 0 ? 1 : 0;
          send(session.players[otherIdx], { t: "restart_req" });
        }
        break;
      }
    }
  });

  ws.on("close", () => {
    const sessionId = ws._sessionId;
    if (!sessionId) return;
    const session = pongSessions.get(sessionId);
    if (!session) return;

    const otherIdx = ws._playerIdx === 0 ? 1 : 0;
    const other = session.players[otherIdx];
    if (other && other.readyState === 1) {
      send(other, { t: "left" });
    }

    pongCleanupSession(sessionId);
  });
});

// =============================================================================
// ===== SHIPS GAME LOGIC =====
// =============================================================================

const SHIPS_TILE = 40;
const SHIPS_COLS = 12;
const SHIPS_ROWS = 16;
const SHIPS_SHIP_R = 10;
const SHIPS_SHIP_SIZE = 24;
const SHIPS_SHIP_SPD = 2.2;
const SHIPS_SHIP_BACK = 1.2;
const SHIPS_ROT_SPD = 4 * (Math.PI / 180);
const SHIPS_BULLET_SPD = 5;
const SHIPS_BULLET_MAX_BOUNCE = 2;
const SHIPS_BULLET_MAX_DIST = SHIPS_SHIP_SIZE * 10;
const SHIPS_WIN_SCORE = 10;
const SHIPS_RESPAWN_FRAMES = 90;

const SHIPS_SPAWN = [
  { x: 2.5 * SHIPS_TILE, y: (SHIPS_ROWS - 3) * SHIPS_TILE + SHIPS_TILE / 2, a: -Math.PI / 4 },
  { x: (SHIPS_COLS - 2.5) * SHIPS_TILE, y: 2 * SHIPS_TILE + SHIPS_TILE / 2, a: (Math.PI * 3) / 4 },
];

const shipsSessions = new Map();

function shipsClamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function shipsIsWallTile(grid, x, y) {
  const c = Math.floor(x / SHIPS_TILE), r = Math.floor(y / SHIPS_TILE);
  if (r < 0 || r >= SHIPS_ROWS || c < 0 || c >= SHIPS_COLS) return true;
  return grid[r][c] === 1;
}

function shipsCollidesWall(grid, x, y, rad) {
  const minC = Math.floor((x - rad) / SHIPS_TILE), maxC = Math.floor((x + rad) / SHIPS_TILE);
  const minR = Math.floor((y - rad) / SHIPS_TILE), maxR = Math.floor((y + rad) / SHIPS_TILE);
  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      if (r < 0 || r >= SHIPS_ROWS || c < 0 || c >= SHIPS_COLS) return true;
      if (grid[r][c] === 1) {
        const cx = shipsClamp(x, c * SHIPS_TILE, (c + 1) * SHIPS_TILE);
        const cy = shipsClamp(y, r * SHIPS_TILE, (r + 1) * SHIPS_TILE);
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy < rad * rad) return true;
      }
    }
  }
  return false;
}

function shipsBfs(grid, sr, sc, er, ec) {
  if (grid[sr]?.[sc] === 1 || grid[er]?.[ec] === 1) return false;
  const vis = new Set([`${sr},${sc}`]);
  const q = [[sr, sc]];
  while (q.length) {
    const [r, c] = q.shift();
    if (r === er && c === ec) return true;
    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nr = r + dr, nc = c + dc, k = `${nr},${nc}`;
      if (nr >= 0 && nr < SHIPS_ROWS && nc >= 0 && nc < SHIPS_COLS && !vis.has(k) && grid[nr][nc] === 0) {
        vis.add(k);
        q.push([nr, nc]);
      }
    }
  }
  return false;
}

function shipsGenerateMaze() {
  const grid = Array.from({ length: SHIPS_ROWS }, () => Array(SHIPS_COLS).fill(0));
  for (let c = 0; c < SHIPS_COLS; c++) { grid[0][c] = 1; grid[SHIPS_ROWS - 1][c] = 1; }
  for (let r = 0; r < SHIPS_ROWS; r++) { grid[r][0] = 1; grid[r][SHIPS_COLS - 1] = 1; }

  // Place scattered wall segments (shorter, fewer = more open)
  for (let attempt = 0, placed = 0; attempt < 40 && placed < 10; attempt++) {
    const horiz = Math.random() > 0.5;
    const len = 2 + Math.floor(Math.random() * 2); // 2-3 tiles max
    const r = 2 + Math.floor(Math.random() * (SHIPS_ROWS - 5));
    const c = 2 + Math.floor(Math.random() * (SHIPS_COLS - 5));
    if ((r > SHIPS_ROWS - 6 && c < 5) || (r < 5 && c > SHIPS_COLS - 6)) continue;

    const tiles = [];
    for (let j = 0; j < len; j++) {
      const tr = horiz ? r : r + j, tc = horiz ? c + j : c;
      if (tr >= 1 && tr < SHIPS_ROWS - 1 && tc >= 1 && tc < SHIPS_COLS - 1 && grid[tr][tc] === 0) tiles.push([tr, tc]);
    }
    if (tiles.length < 2) continue;
    tiles.forEach(([tr, tc]) => (grid[tr][tc] = 1));
    // Check multiple paths exist (not just one bottleneck)
    if (!shipsBfs(grid, SHIPS_ROWS - 3, 2, 2, SHIPS_COLS - 3) || !shipsBfs(grid, SHIPS_ROWS - 3, SHIPS_COLS - 3, 2, 2)) {
      tiles.forEach(([tr, tc]) => (grid[tr][tc] = 0));
    } else {
      placed++;
    }
  }

  // Add a few single-block obstacles for cover variety
  for (let i = 0; i < 6; i++) {
    const r = 3 + Math.floor(Math.random() * (SHIPS_ROWS - 7));
    const c = 3 + Math.floor(Math.random() * (SHIPS_COLS - 7));
    if (grid[r][c] === 0) {
      grid[r][c] = 1;
      if (!shipsBfs(grid, SHIPS_ROWS - 3, 2, 2, SHIPS_COLS - 3)) grid[r][c] = 0;
    }
  }

  // Clear spawn areas (larger zone)
  for (let dr = -2; dr <= 2; dr++)
    for (let dc = -2; dc <= 2; dc++) {
      const r1 = SHIPS_ROWS - 3 + dr, c1 = 2 + dc, r2 = 2 + dr, c2 = SHIPS_COLS - 3 + dc;
      if (r1 > 0 && r1 < SHIPS_ROWS - 1 && c1 > 0 && c1 < SHIPS_COLS - 1) grid[r1][c1] = 0;
      if (r2 > 0 && r2 < SHIPS_ROWS - 1 && c2 > 0 && c2 < SHIPS_COLS - 1) grid[r2][c2] = 0;
    }
  return grid;
}

function shipsNewShips() {
  return SHIPS_SPAWN.map((s) => ({ x: s.x, y: s.y, a: s.a, alive: true }));
}

function shipsStopGame(ses) {
  ses.active = false;
  if (ses.interval) { clearInterval(ses.interval); ses.interval = null; }
}

function shipsStartGame(ses) {
  shipsStopGame(ses);
  ses.maze = shipsGenerateMaze();
  ses.ships = shipsNewShips();
  ses.bullets = [null, null];
  ses.scores = [0, 0];
  ses.state = "playing";
  ses.timer = 0;
  ses.inputs = [{}, {}];
  ses.active = true;
  broadcast(ses, { t: "start", maze: ses.maze });
  ses.interval = setInterval(() => shipsGameLoop(ses), 1000 / 60);
}

function shipsMoveShip(ship, keys, maze) {
  if (!ship.alive) return;
  if (keys.l) ship.a -= SHIPS_ROT_SPD;
  if (keys.r) ship.a += SHIPS_ROT_SPD;
  let spd = 0;
  if (keys.u) spd = SHIPS_SHIP_SPD;
  else if (keys.d) spd = -SHIPS_SHIP_BACK;
  if (spd !== 0) {
    const nx = ship.x + Math.cos(ship.a) * spd;
    const ny = ship.y + Math.sin(ship.a) * spd;
    if (!shipsCollidesWall(maze, nx, ship.y, SHIPS_SHIP_R)) ship.x = nx;
    if (!shipsCollidesWall(maze, ship.x, ny, SHIPS_SHIP_R)) ship.y = ny;
  }
}

function shipsMoveBullet(b, maze) {
  if (!b) return null;
  const nx = b.x + b.vx, ny = b.y + b.vy;
  const hitX = shipsIsWallTile(maze, nx, b.y);
  const hitY = shipsIsWallTile(maze, b.x, ny);
  let bounced = false;
  if (hitX && hitY) { b.vx *= -1; b.vy *= -1; bounced = true; }
  else if (hitX) { b.vx *= -1; b.y = ny; bounced = true; }
  else if (hitY) { b.vy *= -1; b.x = nx; bounced = true; }
  else { b.x = nx; b.y = ny; }
  if (bounced) { b.bounces++; }
  b.dist += SHIPS_BULLET_SPD;
  if (b.bounces > SHIPS_BULLET_MAX_BOUNCE || b.dist > SHIPS_BULLET_MAX_DIST) return null;
  return b;
}

function shipsGameLoop(ses) {
  if (!ses.active) return;

  if (ses.state === "respawning") {
    ses.timer--;
    if (ses.timer <= 0) {
      ses.maze = shipsGenerateMaze();
      ses.ships = shipsNewShips();
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
  for (let i = 0; i < 2; i++) shipsMoveShip(ses.ships[i], ses.inputs[i], ses.maze);

  // Shoot
  for (let i = 0; i < 2; i++) {
    if (ses.inputs[i].s && !ses.bullets[i] && ses.ships[i].alive) {
      ses.bullets[i] = {
        x: ses.ships[i].x + Math.cos(ses.ships[i].a) * (SHIPS_SHIP_R + 4),
        y: ses.ships[i].y + Math.sin(ses.ships[i].a) * (SHIPS_SHIP_R + 4),
        vx: Math.cos(ses.ships[i].a) * SHIPS_BULLET_SPD,
        vy: Math.sin(ses.ships[i].a) * SHIPS_BULLET_SPD,
        bounces: 0, dist: 0,
      };
      ses.inputs[i].s = false; // consume
      broadcast(ses, { t: "sfx", s: "laser" });
    }
  }

  // Move bullets
  for (let i = 0; i < 2; i++) {
    ses.bullets[i] = shipsMoveBullet(ses.bullets[i], ses.maze);
  }

  // Hit detection
  for (let i = 0; i < 2; i++) {
    const b = ses.bullets[i];
    const target = ses.ships[1 - i];
    if (!b || !target.alive) continue;
    const dx = b.x - target.x, dy = b.y - target.y;
    if (dx * dx + dy * dy < (SHIPS_SHIP_R + 3) * (SHIPS_SHIP_R + 3)) {
      target.alive = false;
      ses.bullets[i] = null;
      ses.scores[i]++;
      broadcast(ses, { t: "sfx", s: "explosion" });

      if (ses.scores[i] >= SHIPS_WIN_SCORE) {
        broadcast(ses, { t: "end", winner: i + 1, c: ses.scores });
        shipsStopGame(ses);
        return;
      }
      ses.state = "respawning";
      ses.timer = SHIPS_RESPAWN_FRAMES;
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

wssShips.on("connection", (ws) => {
  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.t) {
      case "create": {
        let id;
        do { id = genId(); } while (shipsSessions.has(id));
        const ses = { id, players: [ws, null], active: false, interval: null, _restartVotes: null };
        shipsSessions.set(id, ses);
        ws._sid = id;
        ws._pi = 0;
        send(ws, { t: "created", id });
        break;
      }
      case "join": {
        const ses = shipsSessions.get(msg.id?.toUpperCase());
        if (!ses || ses.players[1]) { send(ws, { t: "error", msg: "Sala nao encontrada" }); break; }
        ses.players[1] = ws;
        ws._sid = ses.id;
        ws._pi = 1;
        send(ws, { t: "joined", player: 2 });
        send(ses.players[0], { t: "opponent_joined" });
        shipsStartGame(ses);
        break;
      }
      case "k": {
        const ses = shipsSessions.get(ws._sid);
        if (!ses) break;
        ses.inputs[ws._pi] = { u: msg.u, d: msg.d, l: msg.l, r: msg.r, s: msg.s };
        break;
      }
      case "restart": {
        const ses = shipsSessions.get(ws._sid);
        if (!ses || ses.active) break;
        if (!ses._restartVotes) ses._restartVotes = new Set();
        ses._restartVotes.add(ws._pi);
        if (ses._restartVotes.size >= 2) { ses._restartVotes = null; shipsStartGame(ses); }
        else { const oi = ws._pi === 0 ? 1 : 0; send(ses.players[oi], { t: "restart_req" }); }
        break;
      }
    }
  });

  ws.on("close", () => {
    const sid = ws._sid;
    if (!sid) return;
    const ses = shipsSessions.get(sid);
    if (!ses) return;
    const oi = ws._pi === 0 ? 1 : 0;
    send(ses.players[oi], { t: "left" });
    shipsStopGame(ses);
    shipsSessions.delete(sid);
  });
});

// =============================================================================
// ===== MEMORY GAME LOGIC =====
// =============================================================================

const MEMORY_ALL_EMOJIS = [
  "\u{1F34E}", "\u{1F680}", "\u26BD", "\u{1F3B5}", "\u{1F31F}", "\u{1F3AF}",
  "\u{1F431}", "\u{1F308}", "\u{1F525}", "\u{1F48E}", "\u{1F3AA}", "\u{1F3C6}",
];

const MEMORY_DIFFICULTIES = {
  easy:   { pairs: 6 },
  medium: { pairs: 8 },
  hard:   { pairs: 12 },
};

const memorySessions = new Map();

function memoryShuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function memoryGenerateDeck(difficulty) {
  const { pairs } = MEMORY_DIFFICULTIES[difficulty] || MEMORY_DIFFICULTIES.medium;
  const selected = memoryShuffle(MEMORY_ALL_EMOJIS).slice(0, pairs);
  return memoryShuffle([...selected, ...selected]);
}

function memoryCleanupSession(sessionId) {
  const session = memorySessions.get(sessionId);
  if (!session) return;
  session.active = false;
  memorySessions.delete(sessionId);
}

function memoryCheckGameOver(session) {
  const totalCards = session.deck.length;
  if (session.matched.length >= totalCards) {
    session.active = false;
    let winner;
    if (session.scores[0] > session.scores[1]) winner = 0;
    else if (session.scores[1] > session.scores[0]) winner = 1;
    else winner = -1; // draw
    broadcast(session, {
      type: "gameover",
      scores: session.scores,
      winner,
    });
    return true;
  }
  return false;
}

function memoryHandleFlip(session, ws, index) {
  const playerIdx = ws._playerIdx;

  // Validate turn
  if (session.turn !== playerIdx) {
    send(ws, { type: "error", message: "Nao e sua vez" });
    return;
  }

  // Validate index
  if (index < 0 || index >= session.deck.length) {
    send(ws, { type: "error", message: "Indice invalido" });
    return;
  }

  // Can't flip already matched card
  if (session.matched.includes(index)) {
    send(ws, { type: "error", message: "Carta ja encontrada" });
    return;
  }

  // Can't flip card already flipped this turn
  if (session.flippedThisTurn.includes(index)) {
    send(ws, { type: "error", message: "Carta ja virada" });
    return;
  }

  // Can't flip more than 2 cards per turn
  if (session.flippedThisTurn.length >= 2) {
    return;
  }

  // Flip the card
  session.flippedThisTurn.push(index);
  const emoji = session.deck[index];

  broadcast(session, {
    type: "flipped",
    index,
    emoji,
    playerNum: playerIdx,
  });

  // After second flip, check for match
  if (session.flippedThisTurn.length === 2) {
    const [i1, i2] = session.flippedThisTurn;
    const e1 = session.deck[i1];
    const e2 = session.deck[i2];

    if (e1 === e2) {
      // Match found
      session.matched.push(i1, i2);
      session.scores[playerIdx]++;
      session.flippedThisTurn = [];

      broadcast(session, {
        type: "match",
        indices: [i1, i2],
        playerNum: playerIdx,
        scores: session.scores,
      });

      // Same player keeps their turn - check game over
      if (!memoryCheckGameOver(session)) {
        broadcast(session, { type: "turn", playerNum: session.turn });
      }
    } else {
      // No match - send nomatch, then after delay switch turn
      broadcast(session, { type: "nomatch", indices: [i1, i2] });

      setTimeout(() => {
        session.flippedThisTurn = [];
        session.turn = session.turn === 0 ? 1 : 0;
        if (session.active) {
          broadcast(session, { type: "turn", playerNum: session.turn });
        }
      }, 800);
    }
  }
}

wssMemory.on("connection", (ws) => {
  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    switch (msg.type) {
      case "create": {
        const difficulty = MEMORY_DIFFICULTIES[msg.difficulty] ? msg.difficulty : "medium";
        const deck = memoryGenerateDeck(difficulty);

        const session = {
          id: null,
          players: [ws, null],
          deck,
          difficulty,
          turn: 0,
          flippedThisTurn: [],
          matched: [],
          scores: [0, 0],
          active: false,
        };

        let id;
        do {
          id = genId();
        } while (memorySessions.has(id));
        session.id = id;
        memorySessions.set(id, session);
        ws._sessionId = id;
        ws._playerIdx = 0;

        send(ws, { type: "created", roomId: id, playerNum: 0 });
        break;
      }

      case "join": {
        const roomId = msg.roomId?.toUpperCase();
        const session = memorySessions.get(roomId);
        if (!session || session.players[1]) {
          send(ws, { type: "error", message: "Sala nao encontrada ou cheia" });
          break;
        }

        session.players[1] = ws;
        ws._sessionId = session.id;
        ws._playerIdx = 1;

        send(ws, { type: "joined", playerNum: 1 });

        // Start game - send deck and initial state to both players
        session.active = true;
        session.turn = 0;
        session.flippedThisTurn = [];
        session.matched = [];
        session.scores = [0, 0];

        broadcast(session, {
          type: "start",
          deck: session.deck,
          difficulty: session.difficulty,
          turn: session.turn,
        });
        break;
      }

      case "flip": {
        const session = memorySessions.get(ws._sessionId);
        if (!session || !session.active) break;
        if (typeof msg.index !== "number") break;
        memoryHandleFlip(session, ws, msg.index);
        break;
      }
    }
  });

  ws.on("close", () => {
    const sessionId = ws._sessionId;
    if (!sessionId) return;
    const session = memorySessions.get(sessionId);
    if (!session) return;

    const otherIdx = ws._playerIdx === 0 ? 1 : 0;
    const other = session.players[otherIdx];
    if (other && other.readyState === 1) {
      send(other, { type: "opponent_left" });
    }

    memoryCleanupSession(sessionId);
  });
});

// =============================================================================
// ===== 2048 GAME LOGIC =====
// =============================================================================

const sessions2048 = new Map();

function cleanup2048Session(sessionId) {
  const session = sessions2048.get(sessionId);
  if (!session) return;
  session.active = false;
  sessions2048.delete(sessionId);
}

wss2048.on("connection", (ws) => {
  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    switch (msg.type) {
      case "create": {
        const session = {
          id: null,
          players: [ws, null],
          scores: [0, 0],
          status: ["playing", "playing"],
          active: false,
        };

        let id;
        do {
          id = genId();
        } while (sessions2048.has(id));
        session.id = id;
        sessions2048.set(id, session);
        ws._sessionId = id;
        ws._playerIdx = 0;

        send(ws, { type: "created", roomId: id, playerNum: 0 });
        break;
      }

      case "join": {
        const roomId = msg.roomId?.toUpperCase();
        const session = sessions2048.get(roomId);
        if (!session || session.players[1]) {
          send(ws, { type: "error", message: "Sala nao encontrada ou cheia" });
          break;
        }

        session.players[1] = ws;
        ws._sessionId = session.id;
        ws._playerIdx = 1;

        send(ws, { type: "joined", playerNum: 1 });

        // Start game
        session.active = true;
        session.scores = [0, 0];
        session.status = ["playing", "playing"];

        broadcast(session, { type: "start" });
        break;
      }

      case "score_update": {
        const session = sessions2048.get(ws._sessionId);
        if (!session || !session.active) break;
        if (typeof msg.score !== "number") break;

        const playerIdx = ws._playerIdx;
        session.scores[playerIdx] = msg.score;

        // Send to opponent
        const otherIdx = playerIdx === 0 ? 1 : 0;
        const other = session.players[otherIdx];
        send(other, { type: "opponent_score", score: msg.score });
        break;
      }

      case "game_over": {
        const session = sessions2048.get(ws._sessionId);
        if (!session || !session.active) break;

        const playerIdx = ws._playerIdx;
        session.status[playerIdx] = "lost";

        const otherIdx = playerIdx === 0 ? 1 : 0;
        const other = session.players[otherIdx];

        // Notify opponent
        send(other, { type: "opponent_lost" });

        // If opponent is still playing, they win
        if (session.status[otherIdx] === "playing") {
          send(other, { type: "you_win" });
          send(ws, { type: "you_lose" });
          session.active = false;
        }
        // If both lost, nobody wins (both already got you_lose from respective events)
        if (session.status[otherIdx] === "lost") {
          session.active = false;
        }
        break;
      }

      case "reached_2048": {
        const session = sessions2048.get(ws._sessionId);
        if (!session || !session.active) break;

        const playerIdx = ws._playerIdx;
        session.status[playerIdx] = "won";

        const otherIdx = playerIdx === 0 ? 1 : 0;
        const other = session.players[otherIdx];

        // Notify opponent that this player won
        send(other, { type: "opponent_won" });

        // This player wins, opponent loses
        send(ws, { type: "you_win" });
        send(other, { type: "you_lose" });
        session.active = false;
        break;
      }
    }
  });

  ws.on("close", () => {
    const sessionId = ws._sessionId;
    if (!sessionId) return;
    const session = sessions2048.get(sessionId);
    if (!session) return;

    const otherIdx = ws._playerIdx === 0 ? 1 : 0;
    const other = session.players[otherIdx];
    if (other && other.readyState === 1) {
      send(other, { type: "opponent_left" });
    }

    cleanup2048Session(sessionId);
  });
});

// =============================================================================
// ===== BATALHA NAVAL GAME LOGIC =====
// =============================================================================

const batalhaSessions = new Map();

function batalhaCleanupSession(sessionId) {
  const session = batalhaSessions.get(sessionId);
  if (!session) return;
  session.active = false;
  batalhaSessions.delete(sessionId);
}

function batalhaResetSession(session) {
  session.grids = [null, null];
  session.ships = [null, null];
  session.ready = [false, false];
  session.turn = 0;
  session.active = false;
  session.phase = "setup";
  session.hitCells = [new Set(), new Set()];
  session.rematchRequests = new Set();
}

function batalhaFindShipAt(ships, row, col) {
  return ships.find(s => s.cells.some(c => c.r === row && c.c === col));
}

function batalhaIsShipSunk(ship, hitCells) {
  return ship.cells.every(c => hitCells.has(`${c.r},${c.c}`));
}

function batalhaAllShipsSunk(ships, hitCells) {
  for (const ship of ships) {
    for (const cell of ship.cells) {
      if (!hitCells.has(`${cell.r},${cell.c}`)) return false;
    }
  }
  return true;
}

wssBatalha.on("connection", (ws) => {
  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    switch (msg.type) {
      case "create": {
        const session = {
          id: null,
          players: [ws, null],
          grids: [null, null],
          ships: [null, null],
          ready: [false, false],
          turn: 0,
          active: false,
          phase: "setup",
          hitCells: [new Set(), new Set()],
          rematchRequests: new Set(),
        };

        let id;
        do {
          id = genId();
        } while (batalhaSessions.has(id));
        session.id = id;
        batalhaSessions.set(id, session);
        ws._sessionId = id;
        ws._playerIdx = 0;

        send(ws, { type: "created", roomId: id, playerNum: 0 });
        break;
      }

      case "join": {
        const roomId = msg.roomId?.toUpperCase();
        const session = batalhaSessions.get(roomId);
        if (!session || session.players[1]) {
          send(ws, { type: "error", message: "Sala nao encontrada ou cheia" });
          break;
        }

        session.players[1] = ws;
        ws._sessionId = session.id;
        ws._playerIdx = 1;

        send(ws, { type: "joined", playerNum: 1 });
        send(session.players[0], { type: "opponent_joined" });
        break;
      }

      case "ready": {
        const session = batalhaSessions.get(ws._sessionId);
        if (!session) break;
        if (session.phase !== "setup") break;

        const playerIdx = ws._playerIdx;
        session.grids[playerIdx] = msg.grid;
        session.ships[playerIdx] = msg.ships;
        session.ready[playerIdx] = true;

        const otherIdx = playerIdx === 0 ? 1 : 0;
        const other = session.players[otherIdx];
        send(other, { type: "opponent_ready" });

        if (session.ready[0] && session.ready[1]) {
          session.phase = "battle";
          session.active = true;
          session.turn = Math.random() < 0.5 ? 0 : 1;
          session.hitCells = [new Set(), new Set()];
          broadcast(session, { type: "start", firstPlayer: session.turn });
          broadcast(session, { type: "turn", playerNum: session.turn });
        }
        break;
      }

      case "attack": {
        const session = batalhaSessions.get(ws._sessionId);
        if (!session || !session.active || session.phase !== "battle") break;

        const attackerIdx = ws._playerIdx;
        const defenderIdx = attackerIdx === 0 ? 1 : 0;

        if (session.turn !== attackerIdx) {
          send(ws, { type: "error", message: "Nao e sua vez" });
          break;
        }

        const row = msg.row;
        const col = msg.col;
        if (typeof row !== "number" || typeof col !== "number") break;
        if (row < 0 || row >= 10 || col < 0 || col >= 10) break;

        const cellKey = `${row},${col}`;
        if (session.hitCells[defenderIdx].has(cellKey)) {
          send(ws, { type: "error", message: "Celula ja atacada" });
          break;
        }

        session.hitCells[defenderIdx].add(cellKey);

        const defenderGrid = session.grids[defenderIdx];
        const defenderShips = session.ships[defenderIdx];
        const targetShip = batalhaFindShipAt(defenderShips, row, col);

        if (targetShip) {
          if (batalhaIsShipSunk(targetShip, session.hitCells[defenderIdx])) {
            broadcast(session, {
              type: "attack_result",
              row, col,
              result: "sunk",
              shipName: targetShip.name,
              shipCells: targetShip.cells,
              attacker: attackerIdx,
            });

            if (batalhaAllShipsSunk(defenderShips, session.hitCells[defenderIdx])) {
              session.phase = "gameover";
              session.active = false;
              broadcast(session, {
                type: "game_over",
                winner: attackerIdx,
                loserGrid: defenderGrid,
                loserShips: defenderShips,
              });
              break;
            }

            broadcast(session, { type: "turn", playerNum: attackerIdx });
          } else {
            broadcast(session, {
              type: "attack_result",
              row, col,
              result: "hit",
              attacker: attackerIdx,
            });
            broadcast(session, { type: "turn", playerNum: attackerIdx });
          }
        } else {
          broadcast(session, {
            type: "attack_result",
            row, col,
            result: "miss",
            attacker: attackerIdx,
          });
          session.turn = defenderIdx;
          broadcast(session, { type: "turn", playerNum: defenderIdx });
        }
        break;
      }

      case "rematch": {
        const session = batalhaSessions.get(ws._sessionId);
        if (!session) break;
        if (session.active) break;

        session.rematchRequests.add(ws._playerIdx);

        const otherIdx = ws._playerIdx === 0 ? 1 : 0;
        const otherWs = session.players[otherIdx];
        if (otherWs && otherWs.readyState === 1) {
          send(otherWs, { type: "rematch_waiting" });
        }

        if (session.rematchRequests.size >= 2) {
          batalhaResetSession(session);
          broadcast(session, { type: "rematch_start" });
        }
        break;
      }
    }
  });

  ws.on("close", () => {
    const sessionId = ws._sessionId;
    if (!sessionId) return;
    const session = batalhaSessions.get(sessionId);
    if (!session) return;

    const otherIdx = ws._playerIdx === 0 ? 1 : 0;
    const other = session.players[otherIdx];
    if (other && other.readyState === 1) {
      send(other, { type: "opponent_left" });
    }

    batalhaCleanupSession(sessionId);
  });
});

// =============================================================================
// ===== START UNIFIED SERVER =====
// =============================================================================

server.listen(PORT, () => {
  console.log(`Acerte a Mosca unified WS server on port ${PORT}`);
  console.log("  /pong, /ships, /memory, /2048, /batalha-naval");
});
