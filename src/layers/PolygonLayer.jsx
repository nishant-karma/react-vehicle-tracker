// src/layers/PolygonLayer.jsx
import { useEffect } from "react";
import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import { Style, Stroke, Fill } from "ol/style";

const PolygonLayer = ({ mapInstance, polygonLayerRef }) => {
  useEffect(() => {
    const source = new VectorSource();
    const layer = new VectorLayer({
      source,
      style: new Style({
        stroke: new Stroke({ color: "blue", width: 2 }),
        fill: new Fill({ color: "rgba(0, 0, 255, 0.1)" }),
      }),
    });

    polygonLayerRef.current = layer;
    mapInstance.current?.addLayer(layer);

    return () => {
      mapInstance.current?.removeLayer(layer);
    };
  }, []);

  return null;
};

export default PolygonLayer;
