// src/hooks/useDraw.js
import { useRef, useState } from "react";
import Draw from "ol/interaction/Draw";
import Select from "ol/interaction/Select";
import Modify from "ol/interaction/Modify";
import Collection from "ol/Collection";
import { doubleClick } from "ol/events/condition";
import GeoJSON from "ol/format/GeoJSON";

/**
 * Hook to draw and modify geometries (Point, LineString, Polygon)
 * on the given map and vector layer.
 *
 * @param {React.RefObject} mapInstance - Ref to OpenLayers map instance
 * @param {React.RefObject} vectorLayerRef - Ref to vector layer for drawing
 * @returns {Object} drawing and editing controls
 */
export default function useDraw(mapInstance, vectorLayerRef) {
    const drawInteractionRef = useRef(null);
    const modifyRef = useRef(null);
    const selectRef = useRef(null);
    const drawnFeatureRef = useRef(null);

    const [selectedFeature, setSelectedFeature] = useState(null);
    const [hasDrawn, setHasDrawn] = useState(false);

    /**
     * Starts drawing a geometry of the given type
     * @param {"Point" | "LineString" | "Polygon"} type
     */
    const drawGeometry = (type = "Polygon") => {
        if (!mapInstance.current || !vectorLayerRef.current) return;
        if (drawInteractionRef.current) return;

        const draw = new Draw({
            source: vectorLayerRef.current.getSource(),
            type,
        });

        draw.on("drawend", (event) => {
            drawnFeatureRef.current = event.feature;
            setHasDrawn(true);
            mapInstance.current.removeInteraction(draw);
            drawInteractionRef.current = null;
        });

        mapInstance.current.addInteraction(draw);
        drawInteractionRef.current = draw;
    };

    /**
     * Enables selecting and modifying drawn feature (on double click)
     */
    const selectAndModify = () => {
        if (!mapInstance.current || !vectorLayerRef.current) return;

        // Cleanup existing interactions
        if (selectRef.current) mapInstance.current.removeInteraction(selectRef.current);
        if (modifyRef.current) mapInstance.current.removeInteraction(modifyRef.current);

        const select = new Select({
            condition: doubleClick,
            layers: [vectorLayerRef.current],
        });

        select.on("select", (e) => {
            const feature = e.selected[0];
            if (!feature) return;

            setSelectedFeature(feature);

            const modify = new Modify({
                features: new Collection([feature]),
            });

            modifyRef.current = modify;
            mapInstance.current.addInteraction(modify);
        });

        mapInstance.current.addInteraction(select);
        selectRef.current = select;
    };

    /**
     * Converts the drawn feature to GeoJSON format (EPSG:4326)
     * @returns {Object|null} GeoJSON object or null
     */
    const exportDrawnFeatureGeoJSON = () => {
        if (!drawnFeatureRef.current) return null;

        const format = new GeoJSON();
        return format.writeFeatureObject(drawnFeatureRef.current, {
            featureProjection: "EPSG:3857",
            dataProjection: "EPSG:4326",
        });
    };

    return {
        drawGeometry,
        selectAndModify,
        exportDrawnFeatureGeoJSON,
        selectedFeature,
        drawnFeatureRef,
        hasDrawn,
        drawInteractionRef,
        selectRef,
        modifyRef,
    };
}
