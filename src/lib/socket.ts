import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(`http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:3002`, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return socket;
}
