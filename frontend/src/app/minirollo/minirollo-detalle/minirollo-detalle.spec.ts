import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MinirolloDetalle } from './minirollo-detalle';

describe('MinirolloDetalle', () => {
  let component: MinirolloDetalle;
  let fixture: ComponentFixture<MinirolloDetalle>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MinirolloDetalle]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MinirolloDetalle);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
