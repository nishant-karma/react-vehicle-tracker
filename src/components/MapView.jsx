// src/components/MapView.jsx
import React, { useRef, useState, useEffect } from "react";
import { fromLonLat } from "ol/proj";
import { Point, LineString } from "ol/geom";
import Feature from "ol/Feature";
import { Style, Icon, Text, Fill, Stroke } from "ol/style";

import MapContainer from "./MapContainer";
import VehicleLayer from "../layers/VehicleLayer";
import PathLayer from "../layers/PathLayer";
import PolygonLayer from "../layers/PolygonLayer";
import ControlsPanel from "./ControlsPanel";
import GeoJSON from "ol/format/GeoJSON";

import useVehicleWebSocket from "../hooks/useVehicleWebSocket";
import useDraw from "../hooks/useDraw";

import {
  fetchVehiclePath,
  fetchLiveVehicles,
  savePolygon,
  getAllPolygons,
  editPolygon,
} from "../services/api";

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

const MapView = () => {
  const mapRef = useRef();
  const mapInstance = useRef(null);

  // Layer refs to manipulate OL vector layers directly
  const vehicleLayerRef = useRef(null);
  const pathLayerRef = useRef(null);
  const polygonLayerRef = useRef(null);

  // Vehicle & filters state
  const [vehicles, setVehicles] = useState([]);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [showAll, setShowAll] = useState(true);

  // Polygon selection/edit state handled inside hook
  const {
    drawGeometry,
    selectAndModifyPolygon,
    exportDrawnPolygonGeoJSON,
    selectedPolygon,
    drawnPolygonRef,
    selectRef,
    modifyRef,
    drawInteractionRef,
    hasDrawnPolygon,
  } = useDraw(mapInstance, polygonLayerRef);

  // Live vehicle fetch on mount
  useEffect(() => {
    fetchLiveVehicles()
      .then((res) => setVehicles(res.data))
      .catch(console.error);
  }, []);

  // Live vehicle updates via websocket
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

  // Update vehicle layer when vehicles or filters change
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

    // Remove features that no longer match
    source.getFeatures().forEach((f) => {
      if (!newIds.has(f.getId())) source.removeFeature(f);
    });
  }, [vehicles, showAll, vehicleNumber]);

  // Show vehicle path between dates
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
      if (!res.data) {
        alert("No Vehicle with such number: " + vehicleNumber);
        return;
      }

      const coords = res.data.coordinates.map((pt) =>
        fromLonLat([pt.x, pt.y])
      );

      const source = pathLayerRef.current.getSource();
      source.clear();

      // Add path line
      const pathFeature = new Feature({
        geometry: new LineString(coords),
      });
      source.addFeature(pathFeature);

      // Add vehicle marker at path end
      const lastCoord = coords[coords.length - 1];
      const pathVehicleMarker = new Feature(new Point(lastCoord));
      pathVehicleMarker.setStyle(createFeatureStyle(vehicleNumber));
      source.addFeature(pathVehicleMarker);

      // Update vehicle layer to show only this vehicle at path end
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

      // Fit map view to path extent with padding and animation
      mapInstance.current.getView().fit(source.getExtent(), {
        padding: [50, 50, 50, 50],
        duration: 500,
      });
    } catch (err) {
      console.error("Path fetch error:", err);
      alert("Failed to fetch path");
    }
  };

  // Save drawn polygon

  const handleSavePolygonRequest = async () => {
    try {
      const format = new GeoJSON();

      // Check if an edited polygon is selected
      if (selectedPolygon) {
        const geometry = format.writeGeometryObject(
          selectedPolygon.getGeometry(),
          {
            featureProjection: "EPSG:3857",
            dataProjection: "EPSG:4326",
          }
        );
        const id = selectedPolygon.getId();

        await editPolygon({
          id,
          coordinates: geometry,
        });

        alert("Polygon edited successfully!");

        // Cleanup edit state
        if (modifyRef.current) {
          mapInstance.current.removeInteraction(modifyRef.current);
          modifyRef.current = null;
        }
        return;
      }

      // Otherwise, save new drawn polygon
      if (!drawnPolygonRef.current) {
        alert("No polygon drawn");
        return;
      }

      const geojson = exportDrawnPolygonGeoJSON();

      await savePolygon({ coordinates: geojson.geometry });

      alert("Polygon Saved Successfully");

      // Clear polygon and path layers and reset filters
      polygonLayerRef.current?.getSource()?.clear();
      pathLayerRef.current?.getSource()?.clear();
      setShowAll(true);
      setVehicleNumber("");
      setFromDate(null);
      setToDate(null);

      fetchLiveVehicles()
        .then((res) => setVehicles(res.data))
        .catch(console.error);
    } catch (err) {
      console.error("Save Polygon Error:", err);
      alert("Saving Polygon Failed, Please Try Again");
    }
  };


  // Fetch and display all saved polygons
  const handleViewPolygonRequest = async () => {
    try {
      const res = await getAllPolygons();
      const polygons = res.data;
      const polygonSource = polygonLayerRef.current.getSource();
      polygonSource.clear();

      const format = new GeoJSON();

      polygons.forEach((poly) => {
        if (!poly.geometry || poly.geometry.type !== "Polygon") {
          console.warn("Invalid polygon geometry", poly);
          return;
        }
        const feature = format.readFeature(
          {
            type: "Feature",
            geometry: poly.geometry,
            properties: { id: poly.polygonId },
          },
          { dataProjection: "EPSG:4326", featureProjection: "EPSG:3857" }
        );
        feature.setId(poly.polygonId);

        polygonSource.addFeature(feature);
      });

      // Remove existing interactions and add new select for polygon editing
      if (selectRef.current) {
        mapInstance.current.removeInteraction(selectRef.current);
        selectRef.current = null;
      }
      if (modifyRef.current) {
        mapInstance.current.removeInteraction(modifyRef.current);
        modifyRef.current = null;
      }

      selectAndModifyPolygon();

      alert("✅ All saved polygons displayed.");
    } catch (err) {
      console.error("Polygon fetch error:", err);
      alert("❌ Failed to fetch polygons.");
    }
  };

  // Reset map and filters
  const handleResetMapView = () => {
    // Clear polygons and paths
    polygonLayerRef.current?.getSource()?.clear();
    pathLayerRef.current?.getSource()?.clear();

    // Reset vehicle filters
    setVehicleNumber("");
    setShowAll(true);
    setFromDate(null);
    setToDate(null);

    // Remove draw interaction if active
    if (drawInteractionRef.current) {
      mapInstance.current?.removeInteraction(drawInteractionRef.current);
      drawInteractionRef.current = null;
    }

    // Optionally remove modify/select interactions too
    if (modifyRef.current) {
      mapInstance.current?.removeInteraction(modifyRef.current);
      modifyRef.current = null;
    }

    if (selectRef.current) {
      mapInstance.current?.removeInteraction(selectRef.current);
      selectRef.current = null;
    }

    // Reset map view to default location
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
        onDrawGeometry={drawGeometry}
        onSavePolygon={handleSavePolygonRequest}
        canSavePolygon={!!selectedPolygon || hasDrawnPolygon}
        onViewPolygons={handleViewPolygonRequest}
        onReset={handleResetMapView}
        selectedPolygon={selectedPolygon}
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
