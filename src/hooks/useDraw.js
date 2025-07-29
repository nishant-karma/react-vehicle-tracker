// src/hooks/useDraw.js
import { useRef, useState } from "react";
import Draw from "ol/interaction/Draw";
import Select from "ol/interaction/Select";
import Modify from "ol/interaction/Modify";
import Collection from "ol/Collection";
import { doubleClick } from "ol/events/condition";
import GeoJSON from "ol/format/GeoJSON";

export default function useDraw(mapInstance, polygonLayerRef) {
    const drawRef = useRef(null);
    const selectRef = useRef(null);
    const modifyRef = useRef(null);
    const drawnPolygonRef = useRef(null);
    const drawInteractionRef = useRef(null);
    const [selectedPolygon, setSelectedPolygon] = useState(null);
    const [hasDrawnPolygon, setHasDrawnPolygon] = useState(false);

    const drawGeometry = (type = "Polygon") => {
        if (drawInteractionRef.current) return;

        const draw = new Draw({
            source: polygonLayerRef.current.getSource(),
            type,   // ✅ now type is passed as param
        });

        draw.on("drawend", (event) => {
            drawnPolygonRef.current = event.feature;
            setHasDrawnPolygon(true); // ✅ trigger UI update
            mapInstance.current.removeInteraction(draw);
            drawInteractionRef.current = null;
        });

        mapInstance.current.addInteraction(draw);
        drawInteractionRef.current = draw;
    };

    const selectAndModifyPolygon = () => {
        if (selectRef.current) mapInstance.current.removeInteraction(selectRef.current);
        if (modifyRef.current) mapInstance.current.removeInteraction(modifyRef.current);

        const select = new Select({
            condition: doubleClick,
            layers: [polygonLayerRef.current],
        });

        select.on("select", (e) => {
            const feature = e.selected[0];
            if (!feature) return;

            setSelectedPolygon(feature);

            const modify = new Modify({
                features: new Collection([feature]),
            });

            modifyRef.current = modify;
            mapInstance.current.addInteraction(modify);
        });

        mapInstance.current.addInteraction(select);
        selectRef.current = select;
    };

    const exportDrawnPolygonGeoJSON = () => {
        const format = new GeoJSON();
        return format.writeFeatureObject(drawnPolygonRef.current, {
            featureProjection: "EPSG:3857",
            dataProjection: "EPSG:4326",
        });
    };

    return {
        drawGeometry,
        selectAndModifyPolygon,
        exportDrawnPolygonGeoJSON,
        selectedPolygon,
        drawnPolygonRef,
        selectRef,
        modifyRef,
        drawInteractionRef,
        hasDrawnPolygon,
    };
}
