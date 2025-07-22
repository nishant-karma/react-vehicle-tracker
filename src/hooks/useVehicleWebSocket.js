import { useEffect } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const useVehicleWebSocket = (onMessage) => {
  useEffect(() => {
    const token = localStorage.getItem("token"); // or get from cookies
    const socketUrl = `http://localhost:8080/ws?token=${token}`;

    const client = new Client({
      webSocketFactory: () => new SockJS(socketUrl),
      reconnectDelay: 5000,
      debug: (str) => console.log(str),
      onConnect: () => {
        console.log('🔌 Connected to WebSocket');
        client.subscribe('/topic/locations', (message) => {
          const location = JSON.parse(message.body);
          onMessage(location);
        });
      },
      onStompError: (frame) => {
        console.error('💥 STOMP error:', frame);
      },
    });

    client.activate();

    return () => {
      client.deactivate();
    };
  }, [onMessage]);
};

export default useVehicleWebSocket;
