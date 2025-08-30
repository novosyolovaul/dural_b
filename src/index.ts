import http from "http";
import express from "express";
import { Server } from "socket.io";
import cors from "cors";
import { GameRoom } from "./game/gameRoom";

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const rooms = new Map<string, GameRoom>();
const lobbies = new Map<
  string,
  { ownerId: string; ownerName: string; ownerSocketId: string }
>();

io.on("connection", (socket) => {
  const userId = socket.handshake.auth?.userId as string | undefined;
  if (!userId) {
    socket.disconnect(true);
    return;
  }

  socket.on("lobby:create", () => {
    const roomId = Math.random().toString(36).slice(2, 8);
    lobbies.set(roomId, {
      ownerId: userId!,
      ownerName: "P1",
      ownerSocketId: socket.id,
    });
    socket.join(roomId);
    socket.emit("lobby:joined", { roomId });
  });

  socket.on("lobby:join", ({ roomId, peerId, peerName }) => {
    const lobby = lobbies.get(roomId);
    if (!lobby)
      return socket.emit("error", {
        code: "LOBBY_NOT_FOUND",
        message: "Комната не найдена",
      });

    const room = new GameRoom(
      io,
      roomId,
      { id: lobby.ownerId, name: lobby.ownerName },
      { id: peerId, name: peerName || "P2" }
    );
    rooms.set(roomId, room);
    lobbies.delete(roomId);

    // Привязываем присоединившегося
    room.bindSocket(roomId, socket, peerId);
    // Привязываем создателя
    const ownerSock = io.sockets.sockets.get(lobby.ownerSocketId);
    if (ownerSock) {
      room.bindSocket(roomId, ownerSock, lobby.ownerId);
      ownerSock.emit("game:state", room.state); // Явно отправляем состояние создателю
    }

    // ⬅️ ВАЖНО: сказать клиенту, что он «вошёл», чтобы смонтировать GameTable
    socket.emit("lobby:joined", { roomId });

    room.broadcast();
  });

  socket.on("game:action", (a) => {
    const roomId = [...socket.rooms].find((r) => r !== socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;
    room.handleAction(userId!, a);
  });
});

server.listen(3001, () => console.log("server on :3001"));
