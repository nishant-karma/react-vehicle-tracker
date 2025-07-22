import { useEffect } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const useVehicleWebSocket = (onMessage) => {
  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      onConnect: () => {
        console.log('Connected to WebSocket');
        client.subscribe('/topic/locations', (message) => {
          const location = JSON.parse(message.body);
          onMessage(location);
        });
      },
      debug: (str) => console.log(str),
    });

    client.activate();

    return () => client.deactivate();
  }, [onMessage]);
};

export default useVehicleWebSocket;
