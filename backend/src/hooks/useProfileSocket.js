import { useEffect } from "react";

const useProfileSocket = (userId, onUpdate) => {
  useEffect(() => {
    if (!userId) return;

    const ws = new WebSocket(
      `${import.meta.env.VITE_WS_URL}/ws/profile/${userId}`
    );

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // ✅ FIX: send full message
      onUpdate(data);
    };

    return () => ws.close();
  }, [userId]);
};

export default useProfileSocket;