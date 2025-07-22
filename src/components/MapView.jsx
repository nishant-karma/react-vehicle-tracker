import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "bootstrap/dist/css/bootstrap.min.css";
import useVehicleWebSocket from "../hooks/useVehicleWebSocket"; // adjust path if needed

// Fix for Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

function MapView() {
  const [vehicles, setVehicles] = useState([]);

  // Use the custom WebSocket hook
  useVehicleWebSocket((data) => {
    setVehicles((prevVehicles) => {
      const index = prevVehicles.findIndex((v) => v.vehicleId === data.vehicleId);
      if (index !== -1) {
        const updated = [...prevVehicles];
        updated[index] = data;
        return updated;
      }
      return [...prevVehicles, data];
    });
  });

  return (
    <div className="container-fluid p-4">
      <h3 className="text-center mb-4">🚗 Live Vehicle Tracking</h3>
      <div className="card shadow">
        <div className="card-body p-0" style={{ height: "80vh" }}>
          <MapContainer center={[27.7172, 85.3240]} zoom={15} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {vehicles.map((v) => (
              <Marker key={v.vehicleId} position={[v.latitude, v.longitude]}>
                <Popup>
                  <strong>ID:</strong> {v.vehicleId.slice(0, 6)}...<br />
                  <strong>Lat:</strong> {v.latitude.toFixed(6)}<br />
                  <strong>Lon:</strong> {v.longitude.toFixed(6)}<br />
                  <small>{new Date(v.timestamp).toLocaleString()}</small>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

export default MapView;
