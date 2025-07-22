import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:8080/api',
});

export const login = (email, password) =>
  API.post('/login', { email, password });

// Add role field to signup
export const signup = (email, password, role) =>
  API.post('/signup', { email, password, role });
