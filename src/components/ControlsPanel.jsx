// Step 1: Extracting ControlsPanel.jsx

import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

function ControlsPanel({
  vehicleNumber,
  setVehicleNumber,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  onShowPath,
  onShowAll,
  onDrawPolygon,
  onSavePolygon,
  canSavePolygon,
  onViewPolygons,
  onReset,
  selectedPolygon,
  onEnableEdit,
  onSaveEdit,
}) {
  return (
    <div className="row mb-3">
      <div className="col-md-3">
        <input
          type="text"
          className="form-control"
          placeholder="Vehicle Number"
          value={vehicleNumber}
          onChange={(e) => setVehicleNumber(e.target.value)}
        />
      </div>
      <div className="col-md-3" style={{ zIndex: 1000 }}>
        <DatePicker
          selected={fromDate}
          onChange={(date) => setFromDate(date)}
          className="form-control"
          placeholderText="From Date"
          dateFormat="yyyy-MM-dd"
        />
      </div>
      <div className="col-md-3" style={{ zIndex: 1000 }}>
        <DatePicker
          selected={toDate}
          onChange={(date) => setToDate(date)}
          className="form-control"
          placeholderText="To Date"
          dateFormat="yyyy-MM-dd"
        />
      </div>
      <div className="col-md-3 d-flex gap-2">
        <button className="btn btn-primary w-50" onClick={onShowPath}>
          Show Path
        </button>
        <button className="btn btn-secondary w-50" onClick={onShowAll}>
          Show All
        </button>
      </div>

      <div className="col-md-3 mt-2">
        <button className="btn btn-success w-100" onClick={onDrawPolygon}>
          Draw Polygon
        </button>
      </div>
      <div className="col-md-3 mt-2">
        <button
          className="btn btn-outline-primary w-100"
          onClick={onSavePolygon}
          disabled={!canSavePolygon}
        >
          Save Polygon
        </button>
      </div>
      <div className="col-md-3 mt-2">
        <button className="btn btn-warning w-100" onClick={onViewPolygons}>
          📐 View All Polygons
        </button>
      </div>
      <div>
        <button className="btn btn-danger" onClick={onReset}>
          🔄 Reset Map
        </button>
      </div>
      <div>
        <button
          className="btn btn-info"
          disabled={!selectedPolygon}
          onClick={onEnableEdit}
        >
          ✏️ Edit Polygon
        </button>
      </div>
      <div>
        <button
          className="btn btn-outline-success ms-2"
          disabled={!selectedPolygon}
          onClick={onSaveEdit}
        >
          📂 Save Edited Polygon
        </button>
      </div>
    </div>
  );
}

export default ControlsPanel;
