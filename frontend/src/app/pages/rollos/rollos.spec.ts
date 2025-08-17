import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Rollos } from './rollos';

describe('Rollos', () => {
  let component: Rollos;
  let fixture: ComponentFixture<Rollos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Rollos]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Rollos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
