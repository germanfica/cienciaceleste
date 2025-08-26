import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Minirollos } from './minirollos';

describe('Minirollos', () => {
  let component: Minirollos;
  let fixture: ComponentFixture<Minirollos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Minirollos]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Minirollos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
