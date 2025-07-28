import axios from 'axios';
import { polygon } from 'leaflet';

const API = axios.create({
  baseURL: 'http://localhost:8080/api',
});

export const login = (email, password) =>
  API.post('/login', { email, password });

// Add role field to signup
export const signup = (email, password, role) =>
  API.post('/signup', { email, password, role });


export const fetchVehiclePath = (vehicleNumber, from, to) =>
  API.get("/vehicles/path", {
    params: { vehicleNumber, from, to },
  });


  export const fetchLiveVehicles = () => API.get("/vehicles/live");

  export const savePolygon = (coordinates) => API.post("/polygons/save",{coordinates});

  export const getAllPolygons = () => API.get("/polygons/get");

  export const editPolygon = ({ id, coordinates }) =>
    API.put(`/polygons/edit/${id}`, { coordinates });

  export const deletePolygon = () => API.delete(`/polygons/delete/$(id)`);