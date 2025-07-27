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
import "ol/ol.css";

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

  // Initialize map once
  useEffect(() => {
    if (mapInstance.current) return;

    const baseLayer = new TileLayer({ source: new OSM() });

    const vehicleSource = new VectorSource();
    const vehicleLayer = new VectorLayer({
      source: vehicleSource,
      declutter: true,
    });
    vehicleLayerRef.current = vehicleLayer;

    const pathSource = new VectorSource();
    const pathLayer = new VectorLayer({
      source: pathSource,
      style: new Style({
        stroke: new Stroke({ color: "red", width: 3 }),
      }),
    });
    pathLayerRef.current = pathLayer;

    mapInstance.current = new Map({
      target: mapRef.current,
      layers: [baseLayer, vehicleLayer, pathLayer],
      view: new View({
        center: fromLonLat([85.324, 27.7172]),
        zoom: 14,
      }),
    });

    // Add static label feature (e.g., city center label)
    const staticLabelFeature = new Feature({
      geometry: new Point(fromLonLat([85.324, 27.7172])),
    });
    staticLabelFeature.setId("static-label");
    staticLabelFeature.setStyle(createFeatureStyle("Static Label"));
    vehicleSource.addFeature(staticLabelFeature);
  }, []);

  // Fetch vehicles initially
  useEffect(() => {
    fetchLiveVehicles()
      .then((res) => {
        setVehicles(res.data);
      })
      .catch(console.error);
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

  // Create style for vehicle features with label
  function createFeatureStyle(labelText) {
    return new Style({
      image: new Icon({
        src: "https://cdn-icons-png.flaticon.com/512/334/334998.png",
        scale: 0.07,
      }),
      text: new Text({
        text: labelText,
        font: "bold 14px Arial",
        overflow: true,
        fill: new Fill({ color: "black" }),
        backgroundFill: new Fill({ color: "white" }),
        padding: [2, 2, 2, 2],
        offsetY: -25,
      }),
    });
  }

  // Update vehicle markers whenever vehicles or filters change
  useEffect(() => {
    if (!vehicleLayerRef.current) return;

    const source = vehicleLayerRef.current.getSource();

    // Keep static label ID so we don't remove it
    const staticLabelId = "static-label";

    const filteredVehicles = showAll
      ? vehicles
      : vehicles.filter((v) => v.vehicleNumber === vehicleNumber);

    // Remove features that are not in filteredVehicles (but keep static label)
    const filteredIds = new Set(filteredVehicles.map((v) => v.vehicleId));
    source.getFeatures().forEach((feature) => {
      const fid = feature.getId();
      if (fid !== staticLabelId && !filteredIds.has(fid)) {
        source.removeFeature(feature);
      }
    });

    // Add or update filtered vehicles features
    filteredVehicles.forEach((v) => {
      let feature = source.getFeatureById(v.vehicleId);
      const coord = fromLonLat([v.longitude, v.latitude]);

      if (!feature) {
        feature = new Feature({
          geometry: new Point(coord),
        });
        feature.setId(v.vehicleId);
        source.addFeature(feature);
      } else {
        feature.setGeometry(new Point(coord));
      }

      feature.setStyle(createFeatureStyle(v.vehicleNumber));
      feature.changed();
    });
  }, [vehicles, showAll, vehicleNumber]);

  // Handle path fetch and display
  const handlePathRequest = async () => {
    if (!vehicleNumber || !fromDate || !toDate) return;
    setShowAll(false);

    const fromISO = fromDate.toISOString().split("T")[0] + "T00:00:00";
    const toISO = toDate.toISOString().split("T")[0] + "T23:59:59";

    try {
      const res = await fetchVehiclePath(vehicleNumber, fromISO, toISO);

      if (!res.data?.coordinates || res.data.coordinates.length < 2) {
        alert("Path too short or empty.");
        return;
      }

      const coordinates = res.data.coordinates.map((pt) =>
        fromLonLat([pt.x, pt.y])
      );

      const source = pathLayerRef.current.getSource();
      source.clear();

      const line = new Feature({
        geometry: new LineString(coordinates),
      });
      source.addFeature(line);

      // Add vehicle icon at path end point with label
      const lastCoord = coordinates[coordinates.length - 1];

      const vehicleSource = vehicleLayerRef.current.getSource();

      // Clear all vehicle features except static label
      vehicleSource
        .getFeatures()
        .filter((f) => f.getId() !== "static-label")
        .forEach((f) => vehicleSource.removeFeature(f));

      const pathVehicleMarker = new Feature({
        geometry: new Point(lastCoord),
      });
      pathVehicleMarker.setId("path-vehicle");

      pathVehicleMarker.setStyle(createFeatureStyle(vehicleNumber));
      vehicleSource.addFeature(pathVehicleMarker);

      // Zoom to fit path line
      mapInstance.current.getView().fit(line.getGeometry().getExtent(), {
        padding: [50, 50, 50, 50],
        duration: 500,
      });
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
              pathLayerRef.current?.getSource()?.clear();
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
