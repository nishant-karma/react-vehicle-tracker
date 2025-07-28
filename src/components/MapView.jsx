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
import Draw from "ol/interaction/Draw";
import { Polygon } from "ol/geom";
import Select from "ol/interaction/Select";
import Modify from "ol/interaction/Modify";
import Collection from "ol/Collection";
import { click } from 'ol/events/condition';

import { fetchVehiclePath, fetchLiveVehicles, savePolygon, getAllPolygons, editPolygon , deletePolygon} from "../services/api";
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
  const polygonLayerRef = useRef(null);
  const drawInteractionRef = useRef(null);
  const selectInteractionRef = useRef(null);
  const modifyInteractionRef = useRef(null);

  const [vehicles, setVehicles] = useState([]);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [showAll, setShowAll] = useState(true);
  const [polygonId, setPolygonId] = useState('');
  const [coordinates, setCoordinates] = useState('');
  const [selectedPolygon, setSelectedPolygon] = useState(null);

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

    const polygonSource = new VectorSource();
    const polygonLayer = new VectorLayer({
      source: polygonSource,
      style: new Style({
        stroke: new Stroke({ color: "blue", width: 2 }),
        fill: new Fill({ color: "rgba(0, 0, 255, 0.1)" }),
      }),
    });
    polygonLayerRef.current = polygonLayer;
    mapInstance.current.addLayer(polygonLayer);

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
      console.log(res.data);
      if (!res.data) return alert("No Vehicle with such number", vehicleNumber);

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


  const handleSavePolygonRequest = async () => {
    try {
      await savePolygon(coordinates);
      alert("Polygon Saved Successfully");

      setShowAll(true);
      setVehicleNumber("");
      setCoordinates(null); // optional: clear polygon state

      // ✅ Clear polygon and path layers from map
      polygonLayerRef.current?.getSource()?.clear();
      pathLayerRef.current?.getSource()?.clear();

      // ✅ Optionally re-fetch vehicles (not strictly necessary if WebSocket updates are active)
      fetchLiveVehicles()
        .then((res) => setVehicles(res.data))
        .catch(console.error);
    } catch (err) {
      alert("Saving Polygon Failed, Please Try Again")
    }

  };

  const handleViewPolygonRequest = async () => {
    try {
      const res = await getAllPolygons();
      const polygons = res.data;
      const polygonSource = polygonLayerRef.current.getSource();
      polygonSource.clear();

      polygons.forEach((poly) => {
        const feature = new Feature({
          geometry: new Polygon(poly.coordinates),
        });

        feature.setId(poly.polygonId); // Store ID for editing/deleting
        feature.set("name", poly.name || ""); // Optional label
        polygonSource.addFeature(feature);
      });

      alert("✅ All saved polygons displayed.");
    } catch (err) {
      console.error(err);
      alert("❌ Failed to fetch polygons.");
      return;
    }

    // Remove existing selection/edit interactions
    mapInstance.current.removeInteraction(selectInteractionRef.current);
    mapInstance.current.removeInteraction(modifyInteractionRef.current);

    // Add select interaction
    const select = new Select({
      condition: (event) => event.type === 'dblclick',
      layers: [polygonLayerRef.current],
    });

    selectInteractionRef.current = select;
    mapInstance.current.addInteraction(select);

    // Highlight style
    const selectedPolygonStyle = new Style({
      stroke: new Stroke({ color: "yellow", width: 3 }),
      fill: new Fill({ color: "rgba(255,255,0,0.2)" }),
    });

    // On polygon click
    select.on("select", (e) => {
      const selected = e.selected[0];
      const deselected = e.deselected[0];

      if (deselected && deselected === selectedPolygon) {
        deselected.setStyle(null);
        // DON'T clear selectedPolygon or buttons
        return;
      }

      if (selected) {
        selected.setStyle(selectedPolygonStyle);
        setSelectedPolygon(selected);
      }
    });
  };

  const handleResetMapView = () => {
    // Clear polygons and paths
    polygonLayerRef.current?.getSource()?.clear();
    pathLayerRef.current?.getSource()?.clear();

    // Reset vehicle filters
    setVehicleNumber("");
    setShowAll(true);
    setFromDate(null);
    setToDate(null);

    // Optionally reset map view to default location
    mapInstance.current?.getView().setCenter(fromLonLat([85.324, 27.7172]));
    mapInstance.current?.getView().setZoom(14);
  };


  const handleSaveEditedPolygon = async () => {
    try {
      if (!selectedPolygon) return alert("No polygon selected");

      const coords = selectedPolygon.getGeometry().getCoordinates();
      const id = selectedPolygon.getId();

      await editPolygon({ id, coordinates: coords });

      alert("Polygon updated successfully!");

      // Optional: Clear selection and edit state
      setSelectedPolygon(null);
      mapInstance.current.removeInteraction(modifyInteractionRef.current);
      modifyInteractionRef.current = null;
    } catch (err) {
      console.error(err);
      alert("Failed to save edited polygon");
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

        <div className="col-md-3 mt-2">
          <button
            className="btn btn-success w-100"
            onClick={() => {
              if (!drawInteractionRef.current) {
                const draw = new Draw({
                  source: polygonLayerRef.current.getSource(),
                  type: "Polygon",
                });

                draw.on("drawend", (event) => {
                  const coords = event.feature.getGeometry().getCoordinates();

                  console.log("Polygon coordinates:", coords);

                  setCoordinates(coords); // ✅ store in state for saving later

                  mapInstance.current.removeInteraction(draw);
                  drawInteractionRef.current = null;
                });
                mapInstance.current.addInteraction(draw); // ✅ This was missing!
                drawInteractionRef.current = draw;


              }
            }}>
            Draw Polygon

          </button>


        </div>
        <div className="col-md-3 mt-2">
          <button
            className="btn btn-outline-primary w-100"
            onClick={handleSavePolygonRequest}
            disabled={!coordinates}
          >
            Save Polygon
          </button>
        </div>

        <div className="col-md-3 mt-2">
          <button
            className="btn btn-warning w-100"
            onClick={handleViewPolygonRequest}
          >
            📐 View All Polygons
          </button>
        </div>

        <div>
          <button
            className="btn btn-danger"
            onClick={handleResetMapView}>
            🔄 Reset Map
          </button>
        </div>

        <div>
          <button
            className="btn btn-info"
            disabled={!selectedPolygon}
            onClick={() => {
              if (selectedPolygon) {
                mapInstance.current.removeInteraction(modifyInteractionRef.current);

                const modify = new Modify({
                  features: new Collection([selectedPolygon]),
                });

                modifyInteractionRef.current = modify;
                mapInstance.current.addInteraction(modify);

                alert("You can now drag and edit the selected polygon!");
              }
            }}
          >
            ✏️ Edit Polygon
          </button>

        </div>

        <div>
          <button
            className="btn btn-outline-success ms-2"
            disabled={!selectedPolygon}
            onClick={handleSaveEditedPolygon}
          >
            💾 Save Edited Polygon
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
