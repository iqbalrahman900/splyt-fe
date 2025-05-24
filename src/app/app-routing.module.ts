import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DriverMapComponent } from './components/driver-map/driver-map.component';
import { DriverListComponent } from './components/driver-list/driver-list.component';
import { DriverStatsComponent } from './components/driver-stats/driver-stats.component';

const routes: Routes = [
  { path: '', redirectTo: '/map', pathMatch: 'full' },
  { path: 'map', component: DriverMapComponent },
  { path: 'drivers', component: DriverListComponent },
  { path: 'stats', component: DriverStatsComponent },
  { path: '**', redirectTo: '/map' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }