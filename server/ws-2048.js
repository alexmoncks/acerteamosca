const { createServer } = require("http");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 3005;

const sessions = new Map();

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

function cleanupSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return;
  session.active = false;
  sessions.delete(sessionId);
}

// HTTP + WebSocket Server
const server = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("2048 WS OK");
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
        } while (sessions.has(id));
        session.id = id;
        sessions.set(id, session);
        ws._sessionId = id;
        ws._playerIdx = 0;

        send(ws, { type: "created", roomId: id, playerNum: 0 });
        break;
      }

      case "join": {
        const roomId = msg.roomId?.toUpperCase();
        const session = sessions.get(roomId);
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
        const session = sessions.get(ws._sessionId);
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
        const session = sessions.get(ws._sessionId);
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
        const session = sessions.get(ws._sessionId);
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
    const session = sessions.get(sessionId);
    if (!session) return;

    const otherIdx = ws._playerIdx === 0 ? 1 : 0;
    const other = session.players[otherIdx];
    if (other && other.readyState === 1) {
      send(other, { type: "opponent_left" });
    }

    cleanupSession(sessionId);
  });
});

server.listen(PORT, () => {
  console.log("2048 WS server listening on port " + PORT);
});
