import { Component, OnInit } from '@angular/core';
import { DriverLocationService } from './services/driver-location.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Driver Location Tracker';

  constructor(private driverService: DriverLocationService) {}

  ngOnInit(): void {
    // Start real-time updates when app loads
    this.driverService.startRealTimeUpdates();
  }
}