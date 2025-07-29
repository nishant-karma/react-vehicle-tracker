// src/layers/PathLayer.jsx
import { useEffect } from "react";
import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import { Style, Stroke } from "ol/style";

const PathLayer = ({ mapInstance, pathLayerRef }) => {
  useEffect(() => {
    const source = new VectorSource();
    const layer = new VectorLayer({
      source,
      style: new Style({
        stroke: new Stroke({ color: "red", width: 3 }),
      }),
    });

    pathLayerRef.current = layer;
    mapInstance.current?.addLayer(layer);

    return () => {
      mapInstance.current?.removeLayer(layer);
    };
  }, []);

  return null;
};

export default PathLayer;
