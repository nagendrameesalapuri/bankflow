import type { Server } from 'socket.io';

let io: Server | null = null;

export function setIo(server: Server) {
  io = server;
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  io?.to(`user:${userId}`).emit(event, payload);
}

/** Live activity feed for connected ADMIN sessions (audit-style events). */
export function emitToAdmins(event: string, payload: unknown) {
  io?.to('admins').emit(event, payload);
}
