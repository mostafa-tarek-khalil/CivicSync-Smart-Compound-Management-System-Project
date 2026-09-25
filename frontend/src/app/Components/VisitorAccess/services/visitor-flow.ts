import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface VisitorFlowData {
  requestId: string;
  visitorEmail: string;

  visitorName: string;
  visitorPhone: string;

  residentName: string;

  building: string;
  unit: string;
  buildingId: string;
  unitId: string;

  visitDate: string;
  startTime: string;
  purpose: string;

  status: string;

  qrExpiresAt: string;

  checkInTime: string;
  checkOutTime: string;

  visitorChatToken: string;
}

const STORAGE_KEY = 'civicsync.visitor-flow';

const emptyVisit = (): VisitorFlowData => ({
  requestId: '',
  visitorEmail: '',

  visitorName: '',
  visitorPhone: '',

  residentName: '',

  building: '',
  unit: '',
  buildingId: '',
  unitId: '',

  visitDate: '',
  startTime: '',
  purpose: '',

  status: '',

  qrExpiresAt: '',

  checkInTime: '',
  checkOutTime: '',

  visitorChatToken: ''
});

@Injectable({
  providedIn: 'root'
})
export class VisitorFlow {

  private readonly state =
    new BehaviorSubject<VisitorFlowData>(
      this.load()
    );

  readonly visit$: Observable<VisitorFlowData> =
    this.state.asObservable();

  getVisit(): VisitorFlowData {
    return {
      ...this.state.value
    };
  }

  hasVisit(): boolean {
    const visit = this.state.value;

    return !!visit.requestId &&
           !!visit.visitorEmail;
  }

  trackVisit(
    data: Pick<
      VisitorFlowData,
      'requestId' | 'visitorEmail'
    > &
    Partial<VisitorFlowData>
  ): void {

    const current = this.state.value;

    const visit: VisitorFlowData = {
      ...emptyVisit(),
      ...current,
      ...data
    };

    this.set(visit);
  }

  updateVisit(
    data: Partial<VisitorFlowData>
  ): void {

    const visit: VisitorFlowData = {
      ...this.state.value,
      ...data
    };

    this.set(visit);
  }

  clear(): void {
    const visit = emptyVisit();

    this.state.next(visit);

    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  private set(
    visit: VisitorFlowData
  ): void {

    this.state.next({
      ...visit
    });

    this.persist(visit);
  }

  private load(): VisitorFlowData {

    if (typeof localStorage === 'undefined') {
      return emptyVisit();
    }

    try {

      const stored =
        localStorage.getItem(STORAGE_KEY);

      if (!stored) {
        return emptyVisit();
      }

      const parsed =
        JSON.parse(stored);

      return {
        ...emptyVisit(),
        ...parsed
      };

    } catch (error) {

      console.error(
        'Failed to load visitor flow:',
        error
      );

      return emptyVisit();
    }
  }

  private persist(
    visit: VisitorFlowData
  ): void {

    if (typeof localStorage === 'undefined') {
      return;
    }

    try {

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(visit)
      );

    } catch (error) {

      console.error(
        'Failed to persist visitor flow:',
        error
      );
    }
  }
}