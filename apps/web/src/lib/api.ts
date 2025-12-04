import axios from "axios";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const api = axios.create({ 
  baseURL: apiUrl,
  withCredentials: true  // Importante para enviar cookies de sesión
});
