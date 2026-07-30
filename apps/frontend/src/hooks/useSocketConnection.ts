import { useEffect } from "react";
import { getSocket } from "../sockets/socket";
import { useAuthStore } from "../stores/authStore";

export function useSocketConnection() {
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    const socket = getSocket();

    if (token && !socket.connected) {
      socket.connect();
    }

    if (!token && socket.connected) {
      socket.disconnect();
    }

    return () => {
      // No desconectamos aquí: el socket debe seguir vivo mientras dure la sesión,
      // no solo mientras el componente que llamó este hook esté montado.
    };
  }, [token]);
}
