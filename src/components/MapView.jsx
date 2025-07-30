// src/components/MapView.jsx
import React, { useRef, useState, useEffect } from "react";
import { fromLonLat } from "ol/proj";
import { Point, LineString } from "ol/geom";
import Feature from "ol/Feature";
import { Style, Icon, Text, Fill } from "ol/style";

import MapContainer from "./MapContainer";
import VehicleLayer from "../layers/VehicleLayer";
import PathLayer from "../layers/PathLayer";
import PolygonLayer from "../layers/PolygonLayer";
import ControlsPanel from "./ControlsPanel";
import GeoJSON from "ol/format/GeoJSON";

import useVehicleWebSocket from "../hooks/useVehicleWebSocket";
import useDraw from "../hooks/useDraw";

import {
  saveFeature,
  getAllFeatures,
  editFeature,
  deleteFeature,
  fetchLiveVehicles,
  fetchVehiclePath
} from '../services/api';

// Utility for vehicle icon + label
function createVehicleFeatures(vehicle) {
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
}

// Utility for styling path-end marker
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

// 🔁 Convert GeoJSON geometry to backend FeatureRequestDTO
function convertGeoJSONToFeatureRequestDTO(geometry) {
  const { type, coordinates } = geometry;

  switch (type) {
    case "Point":
      return { featureType: "Point", point: coordinates };
    case "LineString":
      return { featureType: "LineString", lineString: coordinates };
    case "Polygon":
      return { featureType: "Polygon", polygon: coordinates };
    default:
      throw new Error(`Unsupported geometry type: ${type}`);
  }
}

const MapView = () => {
  const mapRef = useRef();
  const mapInstance = useRef(null);

  const vehicleLayerRef = useRef(null);
  const pathLayerRef = useRef(null);
  const polygonLayerRef = useRef(null);

  const [vehicles, setVehicles] = useState([]);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [showAll, setShowAll] = useState(true);
  const [drawType, setDrawType] = useState("Polygon");

  const {
    drawGeometry,
    selectAndModify,
    exportDrawnFeatureGeoJSON,
    selectedFeature,
    drawnFeatureRef,
    drawInteractionRef,
    selectRef,
    modifyRef,
    hasDrawn,
  } = useDraw(mapInstance, polygonLayerRef);

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
    const filtered = showAll
      ? vehicles
      : vehicles.filter((v) => v.vehicleNumber === vehicleNumber);

    const newIds = new Set();

    filtered.forEach((v) => {
      const [icon, label] = createVehicleFeatures(v);
      newIds.add(icon.getId());
      newIds.add(label.getId());

      const existingIcon = source.getFeatureById(icon.getId());
      const existingLabel = source.getFeatureById(label.getId());

      if (!existingIcon) source.addFeature(icon);
      else existingIcon.setGeometry(icon.getGeometry());

      if (!existingLabel) source.addFeature(label);
      else existingLabel.setGeometry(label.getGeometry());
    });

    source.getFeatures().forEach((f) => {
      if (!newIds.has(f.getId())) source.removeFeature(f);
    });
  }, [vehicles, showAll, vehicleNumber]);

  const handlePathRequest = async () => {
    if (!vehicleNumber || !fromDate || !toDate) return;

    setShowAll(false);

    const formatDate = (date, time = "00:00:00") =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${time}`;

    const fromISO = formatDate(fromDate, "00:00:00");
    const toISO = formatDate(toDate, "23:59:59");

    try {
      const res = await fetchVehiclePath(vehicleNumber, fromISO, toISO);
      if (!res.data) {
        alert("No Vehicle with such number: " + vehicleNumber);
        return;
      }

      const coords = res.data.coordinates.map((pt) =>
        fromLonLat([pt.x, pt.y])
      );

      const source = pathLayerRef.current.getSource();
      source.clear();

      const path = new Feature({ geometry: new LineString(coords) });
      source.addFeature(path);

      const last = coords.at(-1);
      const marker = new Feature(new Point(last));
      marker.setStyle(createFeatureStyle(vehicleNumber));
      source.addFeature(marker);

      const vehicleSource = vehicleLayerRef.current.getSource();
      vehicleSource.clear();

      const [icon, label] = createVehicleFeatures({
        vehicleId: "path-end",
        vehicleNumber,
        longitude: res.data.coordinates.at(-1).x,
        latitude: res.data.coordinates.at(-1).y,
      });
      vehicleSource.addFeature(icon);
      vehicleSource.addFeature(label);

      mapInstance.current.getView().fit(source.getExtent(), {
        padding: [50, 50, 50, 50],
        duration: 500,
      });
    } catch (err) {
      console.error("Path fetch error:", err);
      alert("Failed to fetch path");
    }
  };

  const handleSaveFeatureRequest = async () => {
    try {
      const format = new GeoJSON();

      if (selectedFeature) {
        const geometry = format.writeGeometryObject(
          selectedFeature.getGeometry(),
          {
            featureProjection: "EPSG:3857",
            dataProjection: "EPSG:4326",
          }
        );

        const dto = convertGeoJSONToFeatureRequestDTO(geometry);

        await editFeature(selectedFeature.getId(), dto);
        alert("✅ Feature edited!");

        if (modifyRef.current) {
          mapInstance.current.removeInteraction(modifyRef.current);
          modifyRef.current = null;
        }
        return;
      }

      if (!drawnFeatureRef.current) {
        alert("❌ No feature drawn");
        return;
      }

      const geojson = exportDrawnFeatureGeoJSON();
      const dto = convertGeoJSONToFeatureRequestDTO(geojson.geometry);

      await saveFeature(dto);
      alert("✅ Feature saved!");

      polygonLayerRef.current?.getSource()?.clear();
      pathLayerRef.current?.getSource()?.clear();
      setShowAll(true);
      setVehicleNumber("");
      setFromDate(null);
      setToDate(null);

      const res = await fetchLiveVehicles();
      setVehicles(res.data);
    } catch (err) {
      console.error("Save Feature Error:", err);
      alert("❌ Saving Failed");
    }
  };

  const handleViewFeatures = async () => {
    try {
      const res = await getAllFeatures();
      const features = res.data;
      const polygonSource = polygonLayerRef.current.getSource();
      polygonSource.clear();

      const format = new GeoJSON();

      features.forEach((f) => {
        if (!f.geometry) return;

        const feature = format.readFeature(
          {
            type: "Feature",
            geometry: f.geometry,
            properties: { id: f.featureTypeId },
          },
          {
            dataProjection: "EPSG:4326",
            featureProjection: "EPSG:3857",
          }
        );
        feature.setId(f.featureTypeId);
        polygonSource.addFeature(feature);
      });

      if (selectRef.current) {
        mapInstance.current.removeInteraction(selectRef.current);
        selectRef.current = null;
      }
      if (modifyRef.current) {
        mapInstance.current.removeInteraction(modifyRef.current);
        modifyRef.current = null;
      }

      selectAndModify();
      alert("✅ Features loaded.");
    } catch (err) {
      console.error("Fetch error:", err);
      alert("❌ Failed to fetch features.");
    }
  };

  const handleResetMapView = () => {
    polygonLayerRef.current?.getSource()?.clear();
    pathLayerRef.current?.getSource()?.clear();

    setVehicleNumber("");
    setShowAll(true);
    setFromDate(null);
    setToDate(null);

    if (drawInteractionRef.current) {
      mapInstance.current?.removeInteraction(drawInteractionRef.current);
      drawInteractionRef.current = null;
    }

    if (modifyRef.current) {
      mapInstance.current?.removeInteraction(modifyRef.current);
      modifyRef.current = null;
    }

    if (selectRef.current) {
      mapInstance.current?.removeInteraction(selectRef.current);
      selectRef.current = null;
    }

    mapInstance.current?.getView().setCenter(fromLonLat([85.324, 27.7172]));
    mapInstance.current?.getView().setZoom(14);
  };

  return (
    <div className="container-fluid p-4">
      <h3 className="text-center mb-4">🚗 Live Vehicle Tracking (OpenLayers)</h3>

      <ControlsPanel
        vehicleNumber={vehicleNumber}
        setVehicleNumber={setVehicleNumber}
        fromDate={fromDate}
        setFromDate={setFromDate}
        toDate={toDate}
        setToDate={setToDate}
        onShowPath={handlePathRequest}
        onShowAll={() => {
          setShowAll(true);
          setVehicleNumber("");
          pathLayerRef.current?.getSource()?.clear();
        }}
        onDrawGeometry={(type) => {
          setDrawType(type);
          drawGeometry(type);
        }}
        onSavePolygon={handleSaveFeatureRequest}
        canSavePolygon={!!selectedFeature || hasDrawn}
        onViewPolygons={handleViewFeatures}
        onReset={handleResetMapView}
        selectedPolygon={selectedFeature}
      />

      <div className="card shadow">
        <div className="card-body p-0" style={{ height: "80vh" }}>
          <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
          <MapContainer mapRef={mapRef} mapInstance={mapInstance} />
          <VehicleLayer mapInstance={mapInstance} vehicleLayerRef={vehicleLayerRef} />
          <PathLayer mapInstance={mapInstance} pathLayerRef={pathLayerRef} />
          <PolygonLayer mapInstance={mapInstance} polygonLayerRef={polygonLayerRef} />
        </div>
      </div>
    </div>
  );
};

export default MapView;
