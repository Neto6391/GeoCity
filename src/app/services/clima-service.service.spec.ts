import { TestBed } from '@angular/core/testing';

import { ClimaServiceService } from './clima-service.service';

describe('ClimaServiceService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ClimaServiceService = TestBed.get(ClimaServiceService);
    expect(service).toBeTruthy();
  });
});
