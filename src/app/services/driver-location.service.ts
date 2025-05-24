import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, timer } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { 
  DriverLocation, 
  HistoricalLocationData, 
  LocationStats, 
  UpdateLocationRequest,
  DriverMarker 
} from '../models/driver-location';

@Injectable({
  providedIn: 'root'
})
export class DriverLocationService {
  private apiUrl = environment.apiUrl;
  
  // Real-time data streams
  private driversSubject = new BehaviorSubject<DriverMarker[]>([]);
  public drivers$ = this.driversSubject.asObservable();
  
  private statsSubject = new BehaviorSubject<LocationStats | null>(null);
  public stats$ = this.statsSubject.asObservable();

  private isPollingActive = false;

  constructor(private http: HttpClient) {}

  /**
   * Start real-time polling for driver locations
   */
  startRealTimeUpdates(): void {
    if (this.isPollingActive) return;
    
    this.isPollingActive = true;
    
    // Poll every 30 seconds
    timer(0, environment.refreshInterval).subscribe(() => {
      if (this.isPollingActive) {
        this.refreshAllData();
      }
    });
  }

  /**
   * Stop real-time polling
   */
  stopRealTimeUpdates(): void {
    this.isPollingActive = false;
  }

  /**
   * Refresh all data (drivers + stats)
   */
  private refreshAllData(): void {
    // Get active drivers and stats simultaneously
    Promise.all([
      this.getActiveDrivers().toPromise(),
      this.getLocationStats().toPromise()
    ]).then(([drivers, stats]) => {
      if (drivers) {
        const enrichedDrivers = this.enrichDriverData(drivers);
        this.driversSubject.next(enrichedDrivers);
      }
      if (stats) {
        this.statsSubject.next(stats);
      }
    }).catch(error => {
      console.error('Error refreshing data:', error);
    });
  }

  /**
   * Add additional metadata to driver data
   */
  private enrichDriverData(drivers: DriverLocation[]): DriverMarker[] {
    const now = new Date();
    
    return drivers.map(driver => {
      const lastUpdate = new Date(driver.timestamp);
      const minutesSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60));
      
      return {
        ...driver,
        isOnline: minutesSinceUpdate <= environment.maxActiveMinutes,
        lastSeenMinutes: minutesSinceUpdate
      };
    });
  }

  /**
   * Get all drivers with latest locations
   */
  getAllDrivers(): Observable<DriverLocation[]> {
    return this.http.get<DriverLocation[]>(`${this.apiUrl}/location/drivers/all`);
  }

  /**
   * Get active drivers (with recent updates)
   */
  getActiveDrivers(minutes?: number): Observable<DriverLocation[]> {
    let params = new HttpParams();
    if (minutes) {
      params = params.set('minutes', minutes.toString());
    }
    
    return this.http.get<DriverLocation[]>(`${this.apiUrl}/location/drivers/active`, { params });
  }

  /**
   * Get drivers near a specific location
   */
  getNearbyDrivers(lat: number, lng: number, radius?: number): Observable<DriverLocation[]> {
    let params = new HttpParams()
      .set('lat', lat.toString())
      .set('lng', lng.toString());
    
    if (radius) {
      params = params.set('radius', radius.toString());
    }
    
    return this.http.get<DriverLocation[]>(`${this.apiUrl}/location/drivers/nearby`, { params });
  }

  /**
   * Get latest location for specific driver
   */
  getDriverLocation(driverId: string): Observable<DriverLocation> {
    return this.http.get<DriverLocation>(`${this.apiUrl}/location/${driverId}`);
  }

  /**
   * Get historical data for specific driver
   */
  getDriverHistory(driverId: string, limit?: number, startTime?: Date, endTime?: Date): Observable<HistoricalLocationData> {
    let params = new HttpParams();
    
    if (limit) params = params.set('limit', limit.toString());
    if (startTime) params = params.set('startTime', startTime.toISOString());
    if (endTime) params = params.set('endTime', endTime.toISOString());
    
    return this.http.get<HistoricalLocationData>(`${this.apiUrl}/location/${driverId}/history`, { params });
  }

  /**
   * Update driver location (for testing or driver app simulation)
   */
  updateDriverLocation(locationData: UpdateLocationRequest): Observable<DriverLocation> {
    return this.http.post<DriverLocation>(`${this.apiUrl}/location`, locationData);
  }

  /**
   * Get system statistics
   */
  getLocationStats(): Observable<LocationStats> {
    return this.http.get<LocationStats>(`${this.apiUrl}/location/stats/overview`);
  }

  /**
   * Filter drivers by online status
   */
  getOnlineDrivers(): Observable<DriverMarker[]> {
    return this.drivers$.pipe(
      map(drivers => drivers.filter(driver => driver.isOnline))
    );
  }

  /**
   * Get driver count by status
   */
  getDriverCounts(): Observable<{online: number, offline: number, total: number}> {
    return this.drivers$.pipe(
      map(drivers => ({
        online: drivers.filter(d => d.isOnline).length,
        offline: drivers.filter(d => !d.isOnline).length,
        total: drivers.length
      }))
    );
  }

  /**
   * Search drivers by ID
   */
  searchDrivers(searchTerm: string): Observable<DriverMarker[]> {
    return this.drivers$.pipe(
      map(drivers => 
        drivers.filter(driver => 
          driver.driver_id.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    );
  }
}