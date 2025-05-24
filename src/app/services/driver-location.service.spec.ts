import { TestBed } from '@angular/core/testing';

import { DriverLocationService } from './driver-location.service';

describe('DriverLocationService', () => {
  let service: DriverLocationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DriverLocationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
