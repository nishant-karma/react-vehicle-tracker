import React from "react";
import MapView from "./components/MapView";
import VehicleTable from "./components/VehicleTable";
import "bootstrap/dist/css/bootstrap.min.css";

function App() {
  return (
    <div className="container-fluid vh-100 overflow-hidden">
      <div className="row h-100">
        <div className="col-md-4 bg-light p-3 overflow-auto">
          <h3 className="mb-3">Live Vehicle Locations</h3>
          <VehicleTable />
        </div>
        <div className="col-md-8 p-0">
          <MapView />
        </div>
      </div>
    </div>
  );
}

export default App;
