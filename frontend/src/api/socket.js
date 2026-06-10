import { io } from "socket.io-client";

let socket = null;

export function getSocket() {
  if (!socket) {
    const url = import.meta.env.VITE_API_URL || undefined; // undefined = mesma origem
    socket = io(url, {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });
  }
  return socket;
}

export default getSocket;
