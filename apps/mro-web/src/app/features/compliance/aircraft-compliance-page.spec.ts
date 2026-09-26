import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { VORTEX_CORE_CONFIG } from '@vortex/core';
import type {
  AircraftComplianceResponse,
  AircraftRecord,
  ComplianceItemRecord,
} from '@vortex/shared-dto';
import { of } from 'rxjs';
import { AircraftCompliancePage } from './aircraft-compliance-page';

const AIRCRAFT: AircraftRecord = {
  id: 'a1',
  registration: 'PP-ABC',
  model: 'C172',
  manufacturer: 'Cessna',
  serialNumber: null,
  totalHours: 1234.5,
  totalCycles: 42,
  airworthinessStatus: 'AERONAVEGAVEL',
};

const ITEM: ComplianceItemRecord = {
  id: 'i1',
  aircraftId: 'a1',
  kind: 'INSPECAO_100H',
  label: 'Inspecao de 100 horas',
  regulatory: true,
  interval: { hours: 100, months: null, cycles: null },
  monthCounting: 'exact',
  meter: 'airframe',
  lastDoneDate: '2026-01-01',
  lastDoneHours: 1200,
  lastDoneCycles: null,
  nextDueDate: null,
  nextDueHours: 1300,
  nextDueCycles: null,
  notes: null,
};

const ASSESSMENT: AircraftComplianceResponse = {
  aircraftId: 'a1',
  today: '2026-02-01',
  worstUrgency: 'overdue',
  utilization: null,
  items: [
    {
      itemId: 'i1',
      kind: 'INSPECAO_100H',
      label: 'Inspecao de 100 horas',
      nextDue: { date: null, hours: 1300, cycles: null },
      urgency: 'overdue',
      dueText: 'vencido por 34,5 h',
      alert: null,
      projection: null,
    },
  ],
};

describe('AircraftCompliancePage', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AircraftCompliancePage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([]),
        { provide: VORTEX_CORE_CONFIG, useValue: { apiBaseUrl: '/api' } },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ aircraftId: 'a1' })) },
        },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('carrega a ficha e exibe matricula, item e urgencia', () => {
    const fixture = TestBed.createComponent(AircraftCompliancePage);
    fixture.detectChanges();

    http.expectOne('/api/mro/aircraft').flush({ success: true, data: [AIRCRAFT], error: null });
    fixture.detectChanges();

    http
      .expectOne('/api/mro/aircraft/a1/compliance/assess')
      .flush({ success: true, data: ASSESSMENT, error: null });
    http
      .expectOne('/api/mro/aircraft/a1/compliance-items')
      .flush({ success: true, data: [ITEM], error: null });
    http
      .expectOne('/api/mro/aircraft/a1/meter-readings')
      .flush({ success: true, data: [], error: null });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('PP-ABC');
    expect(text).toContain('INSPECAO_100H');
    expect(text).toContain('Vencido');
  });

  it('mostra erro quando a aeronave nao esta no vinculo', () => {
    const fixture = TestBed.createComponent(AircraftCompliancePage);
    fixture.detectChanges();

    http.expectOne('/api/mro/aircraft').flush({ success: true, data: [], error: null });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Aeronave nao encontrada no seu vinculo.');
  });
});
