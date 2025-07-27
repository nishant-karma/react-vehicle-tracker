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
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import { fetchVehiclePath, fetchLiveVehicles } from "../services/api";
import useVehicleWebSocket from "../hooks/useVehicleWebSocket";

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

  const createVehicleFeatures = (vehicle) => {
    const coord = fromLonLat([vehicle.longitude, vehicle.latitude]);

    const iconFeature = new Feature(new Point(coord));
    iconFeature.setId(`icon-${vehicle.vehicleId}`);
    iconFeature.setStyle(
      new Style({
        image: new Icon({
          src: "https://cdn-icons-png.flaticon.com/512/334/334998.png",
          scale: 0.1,
        }),
      })
    );

    const labelFeature = new Feature(new Point(coord));
    labelFeature.setId(`label-${vehicle.vehicleId}`);
    labelFeature.setStyle(
      new Style({
        text: new Text({
          text: vehicle.vehicleNumber,
          font: "bold 14px Arial",
          fill: new Fill({ color: "black" }),
          backgroundFill: new Fill({ color: "white" }),
          offsetY: -25,
          padding: [2, 2, 2, 2],
        }),
      })
    );

    return [iconFeature, labelFeature];
  };

  useEffect(() => {
    if (mapInstance.current) return;

    const baseLayer = new TileLayer({ source: new OSM() });
    const vehicleSource = new VectorSource();
    const vehicleLayer = new VectorLayer({ source: vehicleSource });
    vehicleLayerRef.current = vehicleLayer;

    const pathSource = new VectorSource();
    const pathLayer = new VectorLayer({
      source: pathSource,
      style: new Style({ stroke: new Stroke({ color: "red", width: 3 }) }),
    });
    pathLayerRef.current = pathLayer;

    mapInstance.current = new Map({
      target: mapRef.current,
      layers: [baseLayer, vehicleLayer, pathLayer],
      view: new View({ center: fromLonLat([85.324, 27.7172]), zoom: 14 }),
    });
  }, []);

  useEffect(() => {
    fetchLiveVehicles()
      .then((res) => setVehicles(res.data))
      .catch(console.error);
  }, []);

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

  useEffect(() => {
    if (!vehicleLayerRef.current) return;

    const source = vehicleLayerRef.current.getSource();
    const filteredVehicles = showAll
      ? vehicles
      : vehicles.filter((v) => v.vehicleNumber === vehicleNumber);

    const newIds = new Set();
    filteredVehicles.forEach((v) => {
      const [iconFeature, labelFeature] = createVehicleFeatures(v);
      newIds.add(iconFeature.getId());
      newIds.add(labelFeature.getId());

      const iconExisting = source.getFeatureById(iconFeature.getId());
      const labelExisting = source.getFeatureById(labelFeature.getId());

      if (!iconExisting) source.addFeature(iconFeature);
      else iconExisting.setGeometry(iconFeature.getGeometry());

      if (!labelExisting) source.addFeature(labelFeature);
      else labelExisting.setGeometry(labelFeature.getGeometry());
    });

    source.getFeatures().forEach((f) => {
      if (!newIds.has(f.getId())) source.removeFeature(f);
    });
  }, [vehicles, showAll, vehicleNumber]);

  const handlePathRequest = async () => {
    if (!vehicleNumber || !fromDate || !toDate) return;
    setShowAll(false);

    const formatDate = (date, time = "00:00:00") => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}T${time}`;
    };

    const fromISO = formatDate(fromDate, "00:00:00");
    const toISO = formatDate(toDate, "23:59:59");

    try {
      const res = await fetchVehiclePath(vehicleNumber, fromISO, toISO);
      if (!res.data?.coordinates?.length) return alert("No path found");

      const coordinates = res.data.coordinates.map((pt) =>
        fromLonLat([pt.x, pt.y])
      );

      const lastCoord = coordinates[coordinates.length - 1];

      const pathVehicleMarker = new Feature({
        geometry: new Point(lastCoord),
      });
      pathVehicleMarker.setStyle(createFeatureStyle(vehicleNumber));
      pathLayerRef.current.getSource().addFeature(pathVehicleMarker);

      const source = pathLayerRef.current.getSource();
      source.clear();
      source.addFeature(new Feature({ geometry: new LineString(coordinates) }));

      const vehicleSource = vehicleLayerRef.current.getSource();
      vehicleSource.clear();

      const [iconFeature, labelFeature] = createVehicleFeatures({
        vehicleId: "path-end",
        vehicleNumber,
        longitude: res.data.coordinates.at(-1).x,
        latitude: res.data.coordinates.at(-1).y,
      });

      vehicleSource.addFeature(iconFeature);
      vehicleSource.addFeature(labelFeature);




      mapInstance.current.getView().fit(source.getExtent(), {
        padding: [50, 50, 50, 50],
        duration: 500,
      });
    } catch (err) {
      console.error("Path fetch error:", err);
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
        <div className="card-body p-0" style={{ height: "80vh" }}>
          <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
        </div>
      </div>
    </div>
  );
}

export default MapView;
