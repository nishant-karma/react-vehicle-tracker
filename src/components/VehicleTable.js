import React, { useEffect, useState } from "react";
import useVehicleWebSocket from "../hooks/useVehicleWebSocket"; // adjust the path
import "bootstrap/dist/css/bootstrap.min.css";

function VehicleTable() {
  const [vehicles, setVehicles] = useState([]);

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
    <div className="container mt-4">
      <h4 className="mb-3 text-center">🚗 Live Vehicle Data</h4>
      <div className="table-responsive">
        <table className="table table-bordered table-hover shadow-sm">
          <thead className="table-dark">
            <tr>
              <th scope="col">#</th>
              <th scope="col">Vehicle ID</th>
              <th scope="col">Latitude</th>
              <th scope="col">Longitude</th>
              <th scope="col">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center text-muted">
                  No live vehicle data received yet.
                </td>
              </tr>
            ) : (
              vehicles.map((vehicle, index) => (
                <tr key={vehicle.vehicleId}>
                  <th scope="row">{index + 1}</th>
                  <td>{vehicle.vehicleId.slice(0, 6)}...</td>
                  <td>{vehicle.latitude.toFixed(6)}</td>
                  <td>{vehicle.longitude.toFixed(6)}</td>
                  <td>{new Date(vehicle.timestamp).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default VehicleTable;
