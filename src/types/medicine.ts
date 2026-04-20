import type { MedicineCategory } from './common';

export type MedicineForm = 'tablet' | 'capsule' | 'syrup' | 'injection' | 'cream' | 'drops';

export interface Medicine {
  id: string;
  brand: string;
  generic: string;
  strength: string;
  company: string;
  form?: MedicineForm;
  rating?: number;
  doctorNote?: string;
}

/** Medicine as written on an Rx — the minimal line item */
export interface RxMedicine {
  id: string;
  brand: string;
  generic?: string;
  strength?: string;
  dose: string;
  duration?: string;
  /** Structured timing hint, e.g. "After meal", "Empty stomach". */
  instruction?: string;
  /** Free-form doctor's note — printed under the medicine line. */
  note?: string;
  category?: MedicineCategory;
}

/** Rich active medication — tracked with adherence, source visit, etc. */
export interface ActiveMedicine {
  id: string;
  brand: string;
  generic: string;
  dose: string;
  duration: string;
  since: string;
  category: MedicineCategory;
  adherence?: number;
  forCondition?: string;
}
