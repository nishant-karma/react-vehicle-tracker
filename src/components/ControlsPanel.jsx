// src/components/ControlsPanel.jsx
import React, { useState } from "react";

const ControlsPanel = ({
  vehicleNumber,
  setVehicleNumber,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  onShowPath,
  onShowAll,
  onDrawGeometry,
  onSavePolygon,
  canSavePolygon,
  onViewPolygons,
  onReset,
  selectedPolygon,
  onEnableEdit,
}) => {
  const [drawType, setDrawType] = useState("Polygon");

  return (
    <div className="row mb-3 g-2 align-items-center">
      <div className="col-md-2">
        <input
          type="text"
          className="form-control"
          placeholder="Vehicle Number"
          value={vehicleNumber}
          onChange={(e) => setVehicleNumber(e.target.value)}
        />
      </div>

      <div className="col-md-2">
        <input
          type="date"
          className="form-control"
          value={fromDate ? fromDate.toISOString().slice(0, 10) : ""}
          onChange={(e) => setFromDate(e.target.value ? new Date(e.target.value) : null)}
        />
      </div>

      <div className="col-md-2">
        <input
          type="date"
          className="form-control"
          value={toDate ? toDate.toISOString().slice(0, 10) : ""}
          onChange={(e) => setToDate(e.target.value ? new Date(e.target.value) : null)}
        />
      </div>

      <div className="col-md-2 d-grid">
        <button className="btn btn-primary" onClick={onShowPath}>
          Show Path
        </button>
      </div>

      <div className="col-md-2 d-grid">
        <button className="btn btn-secondary" onClick={onShowAll}>
          Show All
        </button>
      </div>

      <div className="col-md-3 mt-2">
        <select
          className="form-select mb-2"
          value={drawType}
          onChange={(e) => setDrawType(e.target.value)}
        >
          <option value="Point">Point</option>
          <option value="LineString">LineString</option>
          <option value="Polygon">Polygon</option>
        </select>

        <button
          className="btn btn-success w-100"
          onClick={() => onDrawGeometry(drawType)}
        >
          Draw {drawType}
        </button>
      </div>

      <div className="col-md-2 mt-2 d-grid">
        <button
          className="btn btn-info"
          onClick={onSavePolygon}
          disabled={!canSavePolygon}
        >
          Save Polygon
        </button>
      </div>

      <div className="col-md-2 mt-2 d-grid">
        <button className="btn btn-warning" onClick={onViewPolygons}>
          View Polygons
        </button>
      </div>

      <div className="col-md-2 mt-2 d-grid">
        <button className="btn btn-danger" onClick={onReset}>
          Reset Map
        </button>
      </div>
    </div>
  );
};

export default ControlsPanel;
