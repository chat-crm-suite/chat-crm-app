import { io, type Socket } from "socket.io-client";
import { SOCKET_NAMESPACES } from "@chat-crm/contracts";

// VITE_SOCKET_URL is the server base URL (no namespace); the namespace comes
// from the shared contracts (single source of truth with the API).
const SOCKET_BASE_URL = (
  import.meta.env.VITE_SOCKET_URL || "http://localhost:3000"
).replace(/\/+$/, "");

export const socket: Socket = io(
  `${SOCKET_BASE_URL}/${SOCKET_NAMESPACES.conversation}`,
  {
    transports: ["websocket"],
    autoConnect: true,
  }
);
