import { Component, OnInit, OnDestroy } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { DriverLocationService } from '../../services/driver-location.service';
import { LocationStats, DriverMarker } from '../../models/driver-location';

@Component({
  selector: 'app-driver-stats',
  templateUrl: './driver-stats.component.html',
  styleUrls: ['./driver-stats.component.scss']
})
export class DriverStatsComponent implements OnInit, OnDestroy {
  stats$: Observable<LocationStats | null>;
  drivers$: Observable<DriverMarker[]>;
  driverCounts$: Observable<{online: number, offline: number, total: number}>;
  
  isLoading = true;
  private subscription = new Subscription();

  constructor(private driverService: DriverLocationService) {
    this.stats$ = this.driverService.stats$;
    this.drivers$ = this.driverService.drivers$;
    this.driverCounts$ = this.driverService.getDriverCounts();
  }

  ngOnInit(): void {
    this.setupSubscriptions();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private setupSubscriptions(): void {
    this.subscription.add(
      this.drivers$.subscribe(() => {
        this.isLoading = false;
      })
    );
  }

  refreshData(): void {
    this.isLoading = true;
    this.driverService.startRealTimeUpdates();
  }
}