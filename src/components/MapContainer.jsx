// src/components/MapContainer.jsx
import React, { useEffect } from "react";
import Map from "ol/Map";
import View from "ol/View";
import { OSM } from "ol/source";
import { Tile as TileLayer } from "ol/layer";
import { fromLonLat } from "ol/proj";

const MapContainer = ({ mapRef, mapInstance }) => {
  useEffect(() => {
    if (mapInstance.current) return;

    const baseLayer = new TileLayer({
      source: new OSM(),
    });

    const map = new Map({
      target: mapRef.current,
      layers: [baseLayer],
      view: new View({
        center: fromLonLat([85.324, 27.7172]),
        zoom: 14,
      }),
    });

    mapInstance.current = map;
  }, []);

  return null; // we just hook into the existing div via mapRef
};

export default MapContainer;
