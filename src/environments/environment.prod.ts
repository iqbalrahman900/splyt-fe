export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  googleMapsApiKey: 'YOUR_GOOGLE_MAPS_API_KEY', // Replace with your actual API key
  mapCenter: {
    lat: 1.3521, // Singapore latitude
    lng: 103.8198 // Singapore longitude
  },
  mapZoom: 12,
  refreshInterval: 30000, // 30 seconds
  maxActiveMinutes: 10
};