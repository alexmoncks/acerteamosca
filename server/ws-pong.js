const { createServer } = require("http");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 3002;

const CANVAS_W = 480;
const CANVAS_H = 640;
const PADDLE_W = 80;
const PADDLE_H = 12;
const BALL_R = 6;
const P1_Y = CANVAS_H - 40;
const P2_Y = 28;
const WIN_SCORE = 10;
const BASE_SPEED = 5;
const MAX_ANGLE = 0.75;

const sessions = new Map();

function genId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function newBall(servingIdx) {
  return {
    x: CANVAS_W / 2,
    y: servingIdx === 0 ? P1_Y - PADDLE_H / 2 - BALL_R - 2 : P2_Y + PADDLE_H / 2 + BALL_R + 2,
    vx: 0,
    vy: 0,
  };
}

function broadcast(session, msg) {
  const data = JSON.stringify(msg);
  session.players.forEach((ws) => {
    if (ws && ws.readyState === 1) ws.send(data);
  });
}

function send(ws, msg) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
}

function stopGame(session) {
  session.active = false;
  if (session.interval) {
    clearInterval(session.interval);
    session.interval = null;
  }
}

function cleanupSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return;
  stopGame(session);
  sessions.delete(sessionId);
}

function resetSession(session) {
  session.scores = [0, 0];
  session.serving = 0;
  session.launched = false;
  session.speed = BASE_SPEED;
  session.rallyCount = 0;
  session.paddles = [CANVAS_W / 2, CANVAS_W / 2];
  session.ball = newBall(0);
}

function startGame(session) {
  stopGame(session);
  resetSession(session);
  session.active = true;
  broadcast(session, { t: "start" });
  session.interval = setInterval(() => gameLoop(session), 1000 / 60);
}

function gameLoop(session) {
  if (!session.active) return;

  const { ball, paddles, scores } = session;

  if (!session.launched) {
    if (session.serving === 0) {
      ball.x = paddles[0];
      ball.y = P1_Y - PADDLE_H / 2 - BALL_R - 2;
    } else {
      ball.x = paddles[1];
      ball.y = P2_Y + PADDLE_H / 2 + BALL_R + 2;
    }
  } else {
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Wall collision
    if (ball.x - BALL_R <= 0) {
      ball.x = BALL_R;
      ball.vx = Math.abs(ball.vx);
      broadcast(session, { t: "sfx", s: "wall" });
    }
    if (ball.x + BALL_R >= CANVAS_W) {
      ball.x = CANVAS_W - BALL_R;
      ball.vx = -Math.abs(ball.vx);
      broadcast(session, { t: "sfx", s: "wall" });
    }

    // Paddle 1 collision (bottom)
    if (
      ball.vy > 0 &&
      ball.y + BALL_R >= P1_Y - PADDLE_H / 2 &&
      ball.y + BALL_R <= P1_Y + PADDLE_H / 2 + 6
    ) {
      const px = paddles[0];
      if (ball.x >= px - PADDLE_W / 2 - BALL_R && ball.x <= px + PADDLE_W / 2 + BALL_R) {
        const hitPos = (ball.x - px) / (PADDLE_W / 2);
        session.rallyCount++;
        session.speed = BASE_SPEED + session.rallyCount * 0.15;
        ball.vy = -session.speed;
        ball.vx = hitPos * session.speed * MAX_ANGLE;
        ball.y = P1_Y - PADDLE_H / 2 - BALL_R;
        broadcast(session, { t: "sfx", s: "paddle" });
      }
    }

    // Paddle 2 collision (top)
    if (
      ball.vy < 0 &&
      ball.y - BALL_R <= P2_Y + PADDLE_H / 2 &&
      ball.y - BALL_R >= P2_Y - PADDLE_H / 2 - 6
    ) {
      const px = paddles[1];
      if (ball.x >= px - PADDLE_W / 2 - BALL_R && ball.x <= px + PADDLE_W / 2 + BALL_R) {
        const hitPos = (ball.x - px) / (PADDLE_W / 2);
        session.rallyCount++;
        session.speed = BASE_SPEED + session.rallyCount * 0.15;
        ball.vy = session.speed;
        ball.vx = hitPos * session.speed * MAX_ANGLE;
        ball.y = P2_Y + PADDLE_H / 2 + BALL_R;
        broadcast(session, { t: "sfx", s: "paddle" });
      }
    }

    // P2 scores (ball past bottom)
    if (ball.y - BALL_R > CANVAS_H) {
      scores[1]++;
      session.serving = 0;
      session.launched = false;
      session.rallyCount = 0;
      session.speed = BASE_SPEED;
      ball.vx = 0;
      ball.vy = 0;
      broadcast(session, { t: "sfx", s: "score" });

      if (scores[1] >= WIN_SCORE) {
        broadcast(session, { t: "end", winner: 2, s1: scores[0], s2: scores[1] });
        stopGame(session);
        return;
      }
    }

    // P1 scores (ball past top)
    if (ball.y + BALL_R < 0) {
      scores[0]++;
      session.serving = 1;
      session.launched = false;
      session.rallyCount = 0;
      session.speed = BASE_SPEED;
      ball.vx = 0;
      ball.vy = 0;
      broadcast(session, { t: "sfx", s: "score" });

      if (scores[0] >= WIN_SCORE) {
        broadcast(session, { t: "end", winner: 1, s1: scores[0], s2: scores[1] });
        stopGame(session);
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

// HTTP + WebSocket Server
const server = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Pong WS OK");
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
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
          paddles: [CANVAS_W / 2, CANVAS_W / 2],
          ball: newBall(0),
          scores: [0, 0],
          serving: 0,
          launched: false,
          speed: BASE_SPEED,
          rallyCount: 0,
          interval: null,
          active: false,
        };
        let id;
        do {
          id = genId();
        } while (sessions.has(id));
        session.id = id;
        sessions.set(id, session);
        ws._sessionId = id;
        ws._playerIdx = 0;
        send(ws, { t: "created", id });
        break;
      }

      case "join": {
        const session = sessions.get(msg.id?.toUpperCase());
        if (!session || session.players[1]) {
          send(ws, { t: "error", msg: "Sala nao encontrada ou cheia" });
          break;
        }
        session.players[1] = ws;
        ws._sessionId = session.id;
        ws._playerIdx = 1;
        send(ws, { t: "joined", player: 2 });
        send(session.players[0], { t: "opponent_joined" });
        startGame(session);
        break;
      }

      case "paddle": {
        const session = sessions.get(ws._sessionId);
        if (!session) break;
        session.paddles[ws._playerIdx] = Math.max(
          PADDLE_W / 2,
          Math.min(CANVAS_W - PADDLE_W / 2, msg.x)
        );
        break;
      }

      case "launch": {
        const session = sessions.get(ws._sessionId);
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
        const session = sessions.get(ws._sessionId);
        if (!session || session.active) break;
        // Track restart requests
        if (!session._restartVotes) session._restartVotes = new Set();
        session._restartVotes.add(ws._playerIdx);
        if (session._restartVotes.size >= 2) {
          session._restartVotes = null;
          startGame(session);
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
    const session = sessions.get(sessionId);
    if (!session) return;

    const otherIdx = ws._playerIdx === 0 ? 1 : 0;
    const other = session.players[otherIdx];
    if (other && other.readyState === 1) {
      send(other, { t: "left" });
    }

    cleanupSession(sessionId);
  });
});

server.listen(PORT, () => {
  console.log(`\u{1F3D3} Pong WebSocket server running on port ${PORT}`);
});
