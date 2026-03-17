const { createServer } = require("http");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 3006;

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

function resetSession(session) {
  session.grids = [null, null];
  session.ships = [null, null];
  session.ready = [false, false];
  session.turn = 0;
  session.active = false;
  session.phase = "setup";
  session.hitCells = [new Set(), new Set()]; // track which cells have been attacked per defender
  session.rematchRequests = new Set();
}

/**
 * Check if all ships of a player are sunk.
 * grid: 10x10 array, ships: array of ship objects with cells
 * hitCells: Set of "r,c" strings that have been hit
 */
function allShipsSunk(ships, hitCells) {
  for (const ship of ships) {
    for (const cell of ship.cells) {
      if (!hitCells.has(`${cell.r},${cell.c}`)) return false;
    }
  }
  return true;
}

/**
 * Find which ship is at a given cell
 */
function findShipAt(ships, row, col) {
  return ships.find(s => s.cells.some(c => c.r === row && c.c === col));
}

/**
 * Check if a ship is fully sunk
 */
function isShipSunk(ship, hitCells) {
  return ship.cells.every(c => hitCells.has(`${c.r},${c.c}`));
}

// HTTP + WebSocket Server
const server = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Batalha Naval WS OK");
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
        send(session.players[0], { type: "opponent_joined" });
        break;
      }

      case "ready": {
        const session = sessions.get(ws._sessionId);
        if (!session) break;
        if (session.phase !== "setup") break;

        const playerIdx = ws._playerIdx;
        session.grids[playerIdx] = msg.grid;
        session.ships[playerIdx] = msg.ships;
        session.ready[playerIdx] = true;

        // Notify the other player that this player is ready
        const otherIdx = playerIdx === 0 ? 1 : 0;
        const other = session.players[otherIdx];
        send(other, { type: "opponent_ready" });

        // If both ready, start battle
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
        const session = sessions.get(ws._sessionId);
        if (!session || !session.active || session.phase !== "battle") break;

        const attackerIdx = ws._playerIdx;
        const defenderIdx = attackerIdx === 0 ? 1 : 0;

        // Validate turn
        if (session.turn !== attackerIdx) {
          send(ws, { type: "error", message: "Nao e sua vez" });
          break;
        }

        const row = msg.row;
        const col = msg.col;
        if (typeof row !== "number" || typeof col !== "number") break;
        if (row < 0 || row >= 10 || col < 0 || col >= 10) break;

        // Check if cell already attacked
        const cellKey = `${row},${col}`;
        if (session.hitCells[defenderIdx].has(cellKey)) {
          send(ws, { type: "error", message: "Celula ja atacada" });
          break;
        }

        session.hitCells[defenderIdx].add(cellKey);

        // Check defender's grid
        const defenderGrid = session.grids[defenderIdx];
        const defenderShips = session.ships[defenderIdx];
        const targetShip = findShipAt(defenderShips, row, col);

        if (targetShip) {
          // Hit!
          if (isShipSunk(targetShip, session.hitCells[defenderIdx])) {
            // Sunk!
            broadcast(session, {
              type: "attack_result",
              row, col,
              result: "sunk",
              shipName: targetShip.name,
              shipCells: targetShip.cells,
              attacker: attackerIdx,
            });

            // Check if all ships sunk (game over)
            if (allShipsSunk(defenderShips, session.hitCells[defenderIdx])) {
              session.phase = "gameover";
              session.active = false;
              // Send loser's full grid and ships for reveal
              broadcast(session, {
                type: "game_over",
                winner: attackerIdx,
                loserGrid: defenderGrid,
                loserShips: defenderShips,
              });
              break;
            }

            // Hit/sunk = attacker goes again
            broadcast(session, { type: "turn", playerNum: attackerIdx });
          } else {
            // Hit but not sunk
            broadcast(session, {
              type: "attack_result",
              row, col,
              result: "hit",
              attacker: attackerIdx,
            });
            // Hit = attacker goes again
            broadcast(session, { type: "turn", playerNum: attackerIdx });
          }
        } else {
          // Miss
          broadcast(session, {
            type: "attack_result",
            row, col,
            result: "miss",
            attacker: attackerIdx,
          });
          // Miss = switch turn
          session.turn = defenderIdx;
          broadcast(session, { type: "turn", playerNum: defenderIdx });
        }
        break;
      }

      case "rematch": {
        const session = sessions.get(ws._sessionId);
        if (!session) break;
        if (session.active) break;

        session.rematchRequests.add(ws._playerIdx);

        const otherIdx = ws._playerIdx === 0 ? 1 : 0;
        const otherWs = session.players[otherIdx];
        if (otherWs && otherWs.readyState === 1) {
          send(otherWs, { type: "rematch_waiting" });
        }

        if (session.rematchRequests.size >= 2) {
          // Reset session for new game
          resetSession(session);
          broadcast(session, { type: "rematch_start" });
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
  console.log("Batalha Naval WS server listening on port " + PORT);
});
