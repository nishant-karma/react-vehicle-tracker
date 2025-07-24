import React, { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "bootstrap/dist/css/bootstrap.min.css";
import useVehicleWebSocket from "../hooks/useVehicleWebSocket";
import { fetchVehiclePath, fetchLiveVehicles } from "../services/api";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";



// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

// Custom label icon showing vehicle number
function createLabelIcon(vehicleNumber) {
  return L.divIcon({
    className: "custom-label-icon",
    html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        font-weight: bold;
        font-size: 16px;
        color: black;
        background: transparent;
        pointer-events: none;
      ">
        <span style="font-size: 26px;">🚗</span>
        <span>${vehicleNumber || "N/A"}</span>
      </div>
    `,
    iconAnchor: [30, 40], // anchor below the label to place it above marker
  });
}

function MapView() {
  const [vehicles, setVehicles] = useState([]);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [polylineCoords, setPolylineCoords] = useState([]);
  const [showAllVehicles, setShowAllVehicles] = useState(true);

  // Initial load + polling
  useEffect(() => {
    const loadVehicles = () => {
      fetchLiveVehicles()
        .then((res) => setVehicles(res.data))
        .catch((err) => console.error("Failed to fetch live vehicles:", err));
    };

    loadVehicles();
    const interval = setInterval(loadVehicles, 10000); // poll every 10s

    return () => clearInterval(interval);
  }, []);

  // WebSocket updates
  useVehicleWebSocket((data) => {
    setVehicles((prev) => {
      const index = prev.findIndex((v) => v.vehicleId === data.vehicleId);
      if (index !== -1) {
        const updated = [...prev];
        updated[index] = data;
        return updated;
      }
      return [...prev, data];
    });
  });

  // Fetch path from backend
  const handlePathRequest = async () => {
    if (!vehicleNumber || !fromDate || !toDate) return;
    setShowAllVehicles(false);

    const fromDateTime = fromDate.toISOString().split("T")[0] + "T00:00:00";
    const toDateTime = toDate.toISOString().split("T")[0] + "T23:59:59";

    try {
      const res = await fetchVehiclePath(vehicleNumber, fromDateTime, toDateTime);
      const coords = res.data.coordinates.map((pt) => [pt.y, pt.x]);
      setPolylineCoords(coords);
    } catch (err) {
      console.error("Error fetching path:", err);
    }
  };

  return (
    <div className="container-fluid p-4">
      <h3 className="text-center mb-4">🚗 Live Vehicle Tracking</h3>

      {/* Filter Inputs */}
      <div className="row mb-3">
        <div className="col-md-3">
          <input
            type="text"
            placeholder="Vehicle Number"
            className="form-control"
            value={vehicleNumber}
            onChange={(e) => setVehicleNumber(e.target.value)}
          />
        </div>
        <div className="col-md-3 position-relative" style={{ zIndex: 1000 }}>
          <DatePicker
            selected={fromDate}
            onChange={(date) => setFromDate(date)}
            className="form-control"
            placeholderText="From Date"
            dateFormat="yyyy-MM-dd"
            isClearable
          />
        </div>
        <div className="col-md-3 position-relative" style={{ zIndex: 1000 }}>
          <DatePicker
            selected={toDate}
            onChange={(date) => setToDate(date)}
            className="form-control"
            placeholderText="To Date"
            dateFormat="yyyy-MM-dd"
            isClearable
          />
        </div>

        <div className="col-md-3 d-flex gap-2">
          <button className="btn btn-primary w-100" onClick={handlePathRequest}>
            Show Path
          </button>
          <button className="btn btn-secondary w-100" onClick={() => {
            setShowAllVehicles(true);
            setVehicleNumber("");
            setPolylineCoords([]);
          }}>
            Show All
          </button>
        </div>

      </div>

      {/* Map */}
      <div className="card shadow">
        <div className="card-body p-0" style={{ height: "80vh" }}>
          <MapContainer
            center={[27.7172, 85.324]}
            zoom={15}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Render all valid markers */}
            {vehicles
              .filter((v) => showAllVehicles || v.vehicleNumber === vehicleNumber)
              .map((v) => (
                <Marker
                  key={v.vehicleId}
                  position={[v.latitude, v.longitude]}
                  icon={createLabelIcon(v.vehicleNumber)}
                >
                  <Popup>
                    <strong>ID:</strong> {v.vehicleId?.slice(0, 6)}...<br />
                    <strong>Vehicle Number:</strong> {v.vehicleNumber || "N/A"}<br />
                     <strong>Lat:</strong> {v.latitude?.toFixed(6)}<br />
                    <strong>Lon:</strong> {v.longitude?.toFixed(6)}<br />
                   

                    <small>{new Date(v.timestamp).toLocaleString()}</small>
                  </Popup>
                </Marker>
              ))}
            {/* Vehicle Path */}
            {polylineCoords.length > 1 && (
              <Polyline positions={polylineCoords} color="red" />
            )}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

export default MapView;
