import axios from "axios";

// Create axios instance for Vapi API
export const vapi = axios.create({
  baseURL: "https://api.vapi.ai",
  headers: { 
    Authorization: `Bearer ${process.env.VAPI_PRIVATE_KEY}`,
    "Content-Type": "application/json"
  },
});

// Add request interceptor for logging
vapi.interceptors.request.use(
  (config) => {
    console.log(`Vapi API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error("Vapi API Request Error:", error);
    return Promise.reject(error);
  }
);

// Add response interceptor for logging
vapi.interceptors.response.use(
  (response) => {
    console.log(`Vapi API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error("Vapi API Error:", error.response?.status, error.response?.data || error.message);
    return Promise.reject(error);
  }
); 