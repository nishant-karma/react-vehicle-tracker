import React, { useEffect, useRef, useState } from "react";
import Map from "ol/Map";
import View from "ol/View";
import { OSM } from "ol/source";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import { Point, LineString } from "ol/geom";
import { Icon, Style, Text, Fill, Stroke } from "ol/style";
import Feature from "ol/Feature";
import { fromLonLat } from "ol/proj";
import Overlay from "ol/Overlay";
import "ol/ol.css";
import "../styles/MapView.css"; // create this for custom style if needed

import { fetchVehiclePath, fetchLiveVehicles } from "../services/api";
import useVehicleWebSocket from "../hooks/useVehicleWebSocket";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

function MapView() {
  const mapRef = useRef();
  const mapInstance = useRef(null);
  const vehicleLayerRef = useRef(null);
  const pathLayerRef = useRef(null);

  const [vehicles, setVehicles] = useState([]);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [showAll, setShowAll] = useState(true);

  // Initial Map Setup
  useEffect(() => {
    const baseLayer = new TileLayer({ source: new OSM() });

    const vehicleSource = new VectorSource();
    const vehicleLayer = new VectorLayer({ source: vehicleSource });
    vehicleLayerRef.current = vehicleSource;

    const pathSource = new VectorSource();
    const pathLayer = new VectorLayer({
      source: pathSource,
      style: new Style({
        stroke: new Stroke({ color: "red", width: 3 }),
      }),
    });
    pathLayerRef.current = pathSource;

    mapInstance.current = new Map({
      target: mapRef.current,
      layers: [baseLayer, vehicleLayer, pathLayer],
      view: new View({
        center: fromLonLat([85.324, 27.7172]),
        zoom: 14,
      }),
    });
  }, []);

  // Fetch Live Vehicles Initially
  useEffect(() => {
    fetchLiveVehicles()
      .then((res) => setVehicles(res.data))
      .catch(console.error);
  }, []);

  // Handle WebSocket Live Updates
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

  // Update vehicle markers on map
  useEffect(() => {
    if (!vehicleLayerRef.current) return;

    vehicleLayerRef.current.clear();

    const filteredVehicles = showAll
      ? vehicles
      : vehicles.filter((v) => v.vehicleNumber === vehicleNumber);

    filteredVehicles.forEach((v) => {
      const feature = new Feature({
        geometry: new Point(fromLonLat([v.longitude, v.latitude])),
      });

      feature.setStyle(
        new Style({
          image: new Icon({
            src: "https://cdn-icons-png.flaticon.com/512/334/334998.png", // car icon
            scale: 0.05,
          }),
          text: new Text({
            text: v.vehicleNumber,
            font: "bold 14px Arial",
            fill: new Fill({ color: "black" }),
            offsetY: -25,
            backgroundFill: new Fill({ color: "white" }),
            padding: [2, 2, 2, 2],
          }),
        })
      );

      vehicleLayerRef.current.addFeature(feature);
    });
  }, [vehicles, showAll, vehicleNumber]);

  // Handle path fetch
  const handlePathRequest = async () => {
    if (!vehicleNumber || !fromDate || !toDate) return;
    setShowAll(false);

    const fromISO = fromDate.toISOString().split("T")[0] + "T00:00:00";
    const toISO = toDate.toISOString().split("T")[0] + "T23:59:59";

    try {
      const res = await fetchVehiclePath(vehicleNumber, fromISO, toISO);

      const coordinates = res.data.coordinates.map((pt) =>
        fromLonLat([pt.x, pt.y])
      );

      pathLayerRef.current.clear();

      const line = new Feature({
        geometry: new LineString(coordinates),
      });

      pathLayerRef.current.addFeature(line);
    } catch (err) {
      console.error("Error fetching path:", err);
    }
  };

  return (
    <div className="container-fluid p-4">
      <h3 className="text-center mb-4">🚗 Live Vehicle Tracking (OpenLayers)</h3>

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
          <button className="btn btn-primary w-50" onClick={handlePathRequest}>
            Show Path
          </button>
          <button
            className="btn btn-secondary w-50"
            onClick={() => {
              setShowAll(true);
              setVehicleNumber("");
              pathLayerRef.current?.clear();
            }}
          >
            Show All
          </button>
        </div>
      </div>

      <div className="card shadow">
        <div
          className="card-body p-0"
          style={{ height: "80vh", width: "100%" }}
        >
          <div
            ref={mapRef}
            style={{ height: "100%", width: "100%" }}
            id="ol-map"
          />
        </div>
      </div>
    </div>
  );
}

export default MapView;
