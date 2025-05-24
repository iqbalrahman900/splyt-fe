import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { DriverLocationService } from '../../services/driver-location.service';
import { LocationStats } from '../../models/driver-location';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit, OnDestroy {
  stats$: Observable<LocationStats | null>;
  driverCounts$: Observable<{online: number, offline: number, total: number}>;
  private subscription = new Subscription();

  constructor(
    private router: Router,
    private driverService: DriverLocationService
  ) {
    this.stats$ = this.driverService.stats$;
    this.driverCounts$ = this.driverService.getDriverCounts();
  }

  ngOnInit(): void {
    // Start real-time updates when navbar loads
    this.driverService.startRealTimeUpdates();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  navigateToMap(): void {
    this.router.navigate(['/map']);
  }

  navigateToDrivers(): void {
    this.router.navigate(['/drivers']);
  }

  navigateToStats(): void {
    this.router.navigate(['/stats']);
  }

  isCurrentRoute(route: string): boolean {
    return this.router.url === route;
  }
}