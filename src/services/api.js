import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:8080/api',
});

// Auth
export const login = (email, password) =>
  API.post('/login', { email, password });

export const signup = (email, password, role) =>
  API.post('/signup', { email, password, role });

// Vehicle APIs
export const fetchVehiclePath = (vehicleNumber, from, to) =>
  API.get('/vehicles/path', {
    params: { vehicleNumber, from, to },
  });

export const fetchLiveVehicles = () => API.get('/vehicles/live');

// Feature APIs (supports Point, LineString, Polygon)
export const saveFeature = (payload) => API.post('/features/save', payload);

export const getAllFeatures = () => API.get('/features/get');

export const editFeature = ({ id, geometry }) =>
  API.put(`/features/edit/${id}`, { geometry });

export const deleteFeature = (id) =>
  API.delete(`/features/delete/${id}`);
