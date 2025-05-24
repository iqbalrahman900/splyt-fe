import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { GoogleMap, MapInfoWindow, MapMarker } from '@angular/google-maps';
import { Observable, Subscription, BehaviorSubject } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DriverLocationService } from '../../services/driver-location.service';
import { DriverMarker, HistoricalLocationData } from '../../models/driver-location';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-driver-map',
  templateUrl: './driver-map.component.html',
  styleUrls: ['./driver-map.component.scss']
})
export class DriverMapComponent implements OnInit, OnDestroy {
  @ViewChild(GoogleMap) map!: GoogleMap;
  @ViewChild(MapInfoWindow) infoWindow!: MapInfoWindow;

  // Map configuration
  center: google.maps.LatLngLiteral = environment.mapCenter;
  zoom = environment.mapZoom;
  mapOptions: google.maps.MapOptions = {
    zoomControl: true,
    scrollwheel: true,
    disableDoubleClickZoom: false,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    maxZoom: 18,
    minZoom: 8,
    styles: [
      {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }]
      }
    ]
  };

  // Data streams
  drivers$ = this.driverService.drivers$;
  
  // Component state
  selectedDriver: DriverMarker | null = null;
  showOnlineOnly = true;
  showDriverHistory = false;
  isLoading = true;
  
  // Filters
  radiusFilter = 10; // km
  centerSearch: google.maps.LatLngLiteral | null = null;
  
  // Driver history
  private driverHistorySubject = new BehaviorSubject<google.maps.LatLngLiteral[]>([]);
  driverHistoryPath$ = this.driverHistorySubject.asObservable();
  
  private subscription = new Subscription();

  constructor(
    private driverService: DriverLocationService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadGoogleMapsAPI();
    this.setupSubscriptions();
    // Initialize radius filter
    this.radiusFilter = 10;
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.driverService.stopRealTimeUpdates();
  }

  private loadGoogleMapsAPI(): void {
    // Google Maps will be loaded automatically by Angular Google Maps
    this.isLoading = false;
  }

  private setupSubscriptions(): void {
    // Subscribe to driver updates
    this.subscription.add(
      this.drivers$.subscribe(drivers => {
        this.isLoading = false;
        if (drivers.length === 0) {
          this.showNoDriversMessage();
        }
      })
    );
  }

  /**
   * Get filtered drivers based on current settings
   */
  getFilteredDrivers(): Observable<DriverMarker[]> {
    return this.drivers$;
  }

  /**
   * Handle marker click - show driver info
   */
  onMarkerClick(marker: MapMarker, driver: DriverMarker): void {
    this.selectedDriver = driver;
    this.infoWindow.open(marker);
    
    // Load driver history if enabled
    if (this.showDriverHistory) {
      this.loadDriverHistory(driver.driver_id);
    }
  }

  /**
   * Load and display driver movement history
   */
  loadDriverHistory(driverId: string): void {
    this.driverService.getDriverHistory(driverId, 20).subscribe({
      next: (history: HistoricalLocationData) => {
        const path = history.locations.map(location => ({
          lat: location.latitude,
          lng: location.longitude
        }));
        this.driverHistorySubject.next(path);
      },
      error: (error) => {
        console.error('Error loading driver history:', error);
        this.snackBar.open('Failed to load driver history', 'Close', { duration: 3000 });
      }
    });
  }

  /**
   * Clear driver history path
   */
  clearDriverHistory(): void {
    this.driverHistorySubject.next([]);
    this.selectedDriver = null;
  }

  /**
   * Get marker icon based on driver status
   */
  getMarkerIcon(driver: DriverMarker): google.maps.Symbol {
    const color = driver.isOnline ? '#4CAF50' : '#FF9800';
    
    return {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 8,
      fillColor: color,
      fillOpacity: 0.9,
      strokeColor: '#FFFFFF',
      strokeWeight: 2
    };
  }

  /**
   * Get marker options for each driver
   */
  getMarkerOptions(driver: DriverMarker): google.maps.MarkerOptions {
    return {
      position: { lat: driver.latitude, lng: driver.longitude },
      title: `${driver.driver_id} (${driver.isOnline ? 'Online' : 'Offline'})`,
      icon: this.getMarkerIcon(driver),
      animation: driver.isOnline ? google.maps.Animation.DROP : undefined
    };
  }

  /**
   * Toggle showing only online drivers
   */
  toggleOnlineFilter(): void {
    this.showOnlineOnly = !this.showOnlineOnly;
  }

  /**
   * Toggle driver history display
   */
  toggleHistoryDisplay(): void {
    this.showDriverHistory = !this.showDriverHistory;
    if (!this.showDriverHistory) {
      this.clearDriverHistory();
    }
  }

  /**
   * Center map on specific driver
   */
  

  /**
   * Center map on specific driver
   */
  centerOnDriver(driver: DriverMarker): void {
    this.center = { lat: driver.latitude, lng: driver.longitude };
    this.zoom = 15;
  }

  /**
   * Find nearby drivers around clicked location
   */
  onMapClick(event: google.maps.MapMouseEvent): void {
    if (event.latLng) {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      
      this.centerSearch = { lat, lng };
      
      this.driverService.getNearbyDrivers(lat, lng, this.radiusFilter).subscribe({
        next: (nearbyDrivers) => {
          this.snackBar.open(
            `Found ${nearbyDrivers.length} drivers within ${this.radiusFilter}km`, 
            'Close', 
            { duration: 3000 }
          );
        },
        error: (error) => {
          console.error('Error finding nearby drivers:', error);
        }
      });
    }
  }

  /**
   * Get polyline options for driver history path
   */
  

  /**
   * Refresh driver data manually
   */
  refreshData(): void {
    this.isLoading = true;
    this.driverService.startRealTimeUpdates();
    this.snackBar.open('Refreshing driver locations...', 'Close', { duration: 2000 });
  }

  /**
   * Show message when no drivers are available
   */
  private showNoDriversMessage(): void {
    const snackBarRef = this.snackBar.open(
      'No active drivers found. Make sure your backend is running and has data.', 
      'Refresh', 
      { 
        duration: 5000
      }
    );
    
    snackBarRef.onAction().subscribe(() => {
      this.refreshData();
    });
  }

  /**
   * Format driver last seen time
   */
  formatLastSeen(minutes: number): string {
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hour ago';
    return `${hours} hours ago`;
  }

  /**
   * Get driver status color
   */
  getStatusColor(driver: DriverMarker): string {
    return driver.isOnline ? '#4CAF50' : '#FF9800';
  }

  /**
   * Track by function for ngFor performance
   */
  trackByDriverId(index: number, driver: DriverMarker): string {
    return driver.driver_id;
  }

  /**
   * Get count of online drivers
   */
  getOnlineDriverCount(drivers: DriverMarker[]): number {
    return drivers.filter(driver => driver.isOnline).length;
  }

  /**
   * Get count of offline drivers
   */
  getOfflineDriverCount(drivers: DriverMarker[]): number {
    return drivers.filter(driver => !driver.isOnline).length;
  }

  /**
   * Get search center marker options
   */
  getSearchCenterMarkerOptions(): google.maps.MarkerOptions {
    return {
      icon: {
        path: 'M12,2C8.13,2 5,5.13 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9C19,5.13 15.87,2 12,2Z',
        fillColor: '#E91E63',
        fillOpacity: 0.9,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
        scale: 1.5
      } as google.maps.Symbol,
      title: 'Search Center'
    };
  }

  /**
   * Get polyline options for driver history path
   */
  getPolylineOptions(): google.maps.PolylineOptions {
    return {
      strokeColor: '#2196F3',
      strokeOpacity: 0.8,
      strokeWeight: 3,
      geodesic: true,
      icons: [{
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 3,
          strokeColor: '#2196F3'
        },
        repeat: '50px'
      }]
    };
  }
}