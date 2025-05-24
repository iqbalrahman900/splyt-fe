export interface DriverLocation {
    driver_id: string;
    latitude: number;
    longitude: number;
    timestamp: string;
    version: number;
  }
  
  export interface HistoricalLocationData {
    driver_id: string;
    locations: LocationPoint[];
  }
  
  export interface LocationPoint {
    latitude: number;
    longitude: number;
    timestamp: string;
  }
  
  export interface LocationStats {
    totalDrivers: number;
    totalUpdates: number;
    recentUpdates: number;
    timestamp: string;
  }
  
  export interface UpdateLocationRequest {
    driver_id: string;
    latitude: number;
    longitude: number;
  }
  
  export interface MapBounds {
    north: number;
    south: number;
    east: number;
    west: number;
  }
  
  export interface DriverMarker extends DriverLocation {
    isOnline: boolean;
    lastSeenMinutes: number;
  }