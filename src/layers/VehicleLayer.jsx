// src/layers/VehicleLayer.jsx
import { useEffect } from "react";
import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";

const VehicleLayer = ({ mapInstance, vehicleLayerRef }) => {
  useEffect(() => {
    const source = new VectorSource();
    const layer = new VectorLayer({ source });

    vehicleLayerRef.current = layer;
    mapInstance.current?.addLayer(layer);

    return () => {
      mapInstance.current?.removeLayer(layer);
    };
  }, []);

  return null;
};

export default VehicleLayer;
