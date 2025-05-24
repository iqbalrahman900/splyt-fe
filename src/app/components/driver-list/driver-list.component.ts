import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Observable, Subscription, combineLatest } from 'rxjs';
import { map, startWith, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { DriverLocationService } from '../../services/driver-location.service';
import { DriverMarker, HistoricalLocationData } from '../../models/driver-location';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-driver-list',
  templateUrl: './driver-list.component.html',
  styleUrls: ['./driver-list.component.scss']
})
export class DriverListComponent implements OnInit, OnDestroy {
  // Data streams
  drivers$ = this.driverService.drivers$;
  
  // Filter controls
  searchControl = new FormControl('');
  statusFilter: 'all' | 'online' | 'offline' = 'all';
  sortBy: 'id' | 'timestamp' | 'status' = 'id';
  sortDirection: 'asc' | 'desc' = 'asc';
  
  // Filtered and sorted drivers
  filteredDrivers$: Observable<DriverMarker[]>;
  
  // Component state
  isLoading = false;
  selectedDriver: DriverMarker | null = null;
  showHistoryFor: string | null = null;
  driverHistory: HistoricalLocationData | null = null;
  
  private subscription = new Subscription();

  constructor(
    private driverService: DriverLocationService,
    private snackBar: MatSnackBar
  ) {
    // Setup filtered drivers observable
    this.filteredDrivers$ = combineLatest([
      this.drivers$,
      this.searchControl.valueChanges.pipe(
        startWith(''),
        debounceTime(300),
        distinctUntilChanged()
      )
    ]).pipe(
      map(([drivers, searchTerm]) => this.filterAndSortDrivers(drivers, searchTerm || ''))
    );
  }

  ngOnInit(): void {
    this.setupSubscriptions();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private setupSubscriptions(): void {
    // Subscribe to filtered drivers for count updates
    this.subscription.add(
      this.filteredDrivers$.subscribe(drivers => {
        this.isLoading = false;
      })
    );
  }

  /**
   * Filter and sort drivers based on current criteria
   */
  private filterAndSortDrivers(drivers: DriverMarker[], searchTerm: string): DriverMarker[] {
    let filtered = drivers;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(driver =>
        driver.driver_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (this.statusFilter === 'online') {
      filtered = filtered.filter(driver => driver.isOnline);
    } else if (this.statusFilter === 'offline') {
      filtered = filtered.filter(driver => !driver.isOnline);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (this.sortBy) {
        case 'id':
          comparison = a.driver_id.localeCompare(b.driver_id);
          break;
        case 'timestamp':
          comparison = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
          break;
        case 'status':
          comparison = (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0);
          break;
      }

      return this.sortDirection === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }

  /**
   * Set status filter
   */
  setStatusFilter(status: 'all' | 'online' | 'offline'): void {
    this.statusFilter = status;
    this.refreshFilter();
  }

  /**
   * Set sort criteria
   */
  setSortBy(field: 'id' | 'timestamp' | 'status'): void {
    if (this.sortBy === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortDirection = 'asc';
    }
    this.refreshFilter();
  }

  /**
   * Refresh the filter (trigger re-filtering)
   */
  private refreshFilter(): void {
    // Trigger a new emission to update the filtered list
    this.searchControl.updateValueAndValidity();
  }

  /**
   * Select a driver and show details
   */
  selectDriver(driver: DriverMarker): void {
    this.selectedDriver = driver;
    this.loadDriverHistory(driver.driver_id);
  }

  /**
   * Load driver history
   */
  loadDriverHistory(driverId: string): void {
    this.showHistoryFor = driverId;
    this.driverHistory = null;
    
    this.driverService.getDriverHistory(driverId, 50).subscribe({
      next: (history) => {
        this.driverHistory = history;
      },
      error: (error) => {
        console.error('Error loading driver history:', error);
        this.snackBar.open('Failed to load driver history', 'Close', { duration: 3000 });
      }
    });
  }

  /**
   * Clear selection
   */
  clearSelection(): void {
    this.selectedDriver = null;
    this.showHistoryFor = null;
    this.driverHistory = null;
  }

  /**
   * Get driver status color
   */
  getStatusColor(driver: DriverMarker): string {
    return driver.isOnline ? '#4CAF50' : '#FF9800';
  }

  /**
   * Get driver status text
   */
  getStatusText(driver: DriverMarker): string {
    return driver.isOnline ? 'Online' : 'Offline';
  }

  /**
   * Format timestamp
   */
  formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleString();
  }

  /**
   * Format last seen time
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
   * Get sort icon
   */
  getSortIcon(field: string): string {
    if (this.sortBy !== field) return 'unfold_more';
    return this.sortDirection === 'asc' ? 'keyboard_arrow_up' : 'keyboard_arrow_down';
  }

  /**
   * Refresh driver data
   */
  refreshData(): void {
    this.isLoading = true;
    this.driverService.startRealTimeUpdates();
    this.snackBar.open('Refreshing driver data...', 'Close', { duration: 2000 });
  }

  /**
   * Track by function for ngFor
   */
  trackByDriverId(index: number, driver: DriverMarker): string {
    return driver.driver_id;
  }

  /**
   * Get filter badge count
   */
  getFilterCount(filter: 'all' | 'online' | 'offline'): Observable<number> {
    return this.drivers$.pipe(
      map(drivers => {
        if (filter === 'all') return drivers.length;
        if (filter === 'online') return drivers.filter(d => d.isOnline).length;
        return drivers.filter(d => !d.isOnline).length;
      })
    );
  }

  /**
   * Export driver data to CSV
   */
  exportToCSV(): void {
    this.filteredDrivers$.subscribe(drivers => {
      const csvData = this.convertToCSV(drivers);
      this.downloadCSV(csvData, 'driver-locations.csv');
      this.snackBar.open('Driver data exported successfully', 'Close', { duration: 3000 });
    });
  }

  /**
   * Convert drivers to CSV format
   */
  private convertToCSV(drivers: DriverMarker[]): string {
    const headers = ['Driver ID', 'Latitude', 'Longitude', 'Status', 'Last Updated', 'Version'];
    const rows = drivers.map(driver => [
      driver.driver_id,
      driver.latitude.toString(),
      driver.longitude.toString(),
      driver.isOnline ? 'Online' : 'Offline',
      this.formatTimestamp(driver.timestamp),
      driver.version.toString()
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }

  /**
   * Download CSV file
   */
  private downloadCSV(csvData: string, filename: string): void {
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}