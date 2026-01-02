import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IndexPaginator } from './index-paginator';

describe('IndexPaginator', () => {
  let component: IndexPaginator;
  let fixture: ComponentFixture<IndexPaginator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IndexPaginator]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IndexPaginator);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
