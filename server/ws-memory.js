const { createServer } = require("http");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 3004;

const ALL_EMOJIS = [
  "\u{1F34E}", "\u{1F680}", "\u26BD", "\u{1F3B5}", "\u{1F31F}", "\u{1F3AF}",
  "\u{1F431}", "\u{1F308}", "\u{1F525}", "\u{1F48E}", "\u{1F3AA}", "\u{1F3C6}",
];

const DIFFICULTIES = {
  easy:   { pairs: 6 },
  medium: { pairs: 8 },
  hard:   { pairs: 12 },
};

const sessions = new Map();

function genId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateDeck(difficulty) {
  const { pairs } = DIFFICULTIES[difficulty] || DIFFICULTIES.medium;
  const selected = shuffle(ALL_EMOJIS).slice(0, pairs);
  return shuffle([...selected, ...selected]);
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

function checkGameOver(session) {
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

function handleFlip(session, ws, index) {
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
      if (!checkGameOver(session)) {
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

// HTTP + WebSocket Server
const server = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Memory WS OK");
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
        const difficulty = DIFFICULTIES[msg.difficulty] ? msg.difficulty : "medium";
        const deck = generateDeck(difficulty);

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
        const session = sessions.get(ws._sessionId);
        if (!session || !session.active) break;
        if (typeof msg.index !== "number") break;
        handleFlip(session, ws, msg.index);
        break;
      }

      case "rematch": {
        const session = sessions.get(ws._sessionId);
        if (!session) break;
        // Only allow rematch after game is over
        if (session.active) break;

        if (!session.rematchRequests) session.rematchRequests = new Set();
        session.rematchRequests.add(ws._playerIdx);

        // Notify the other player that opponent wants rematch
        const otherIdx = ws._playerIdx === 0 ? 1 : 0;
        const otherWs = session.players[otherIdx];
        if (otherWs && otherWs.readyState === 1) {
          send(otherWs, { type: "rematch_waiting" });
        }

        // If both players requested rematch, start a new game
        if (session.rematchRequests.size >= 2) {
          session.rematchRequests = new Set();
          session.deck = generateDeck(session.difficulty);
          session.turn = 0;
          session.flippedThisTurn = [];
          session.matched = [];
          session.scores = [0, 0];
          session.active = true;

          broadcast(session, {
            type: "start",
            deck: session.deck,
            difficulty: session.difficulty,
            turn: session.turn,
          });
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
      send(other, { type: "opponent_left" });
    }

    cleanupSession(sessionId);
  });
});

server.listen(PORT, () => {
  console.log("Memory WS server listening on port " + PORT);
});
