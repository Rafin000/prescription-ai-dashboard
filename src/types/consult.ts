export interface ConsultTurn {
  id: string;
  who: 'doctor' | 'patient';
  text: string;
  textBn?: string;
  at?: string;
}
