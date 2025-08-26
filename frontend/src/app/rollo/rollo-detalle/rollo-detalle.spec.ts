import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RolloDetalle } from './rollo-detalle';

describe('RolloDetalle', () => {
  let component: RolloDetalle;
  let fixture: ComponentFixture<RolloDetalle>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RolloDetalle]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RolloDetalle);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
