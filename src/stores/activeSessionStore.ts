import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ConsultTurn, RxMedicine } from '../types';

export type SessionKind = 'consult' | 'call';
export type SessionLang = 'bn' | 'en';

export interface SessionDraft {
  chiefComplaint: string;
  oe: string[];
  diagnoses: string[];
  tests: string[];
  advice: string[];
  medicines: RxMedicine[];
  followUp: string;
  operation: string[];
}

export interface SessionVitals {
  weight: string;
  bp: string;
  pulse: string;
}

export interface SessionStripOverrides {
  patientName?: string;
  ageSex?: string;
  date?: string;
}

export interface ActiveSession {
  id: string;
  kind: SessionKind;
  patientId: string;
  patientName: string;
  /** The URL to return to when the user taps the "ongoing" pill. */
  returnPath: string;
  startedAt: string;
  recording: boolean;
  elapsed: number;
  lang: SessionLang;
  transcript: ConsultTurn[];
  scriptIndex: number;
  draft: SessionDraft;
  vitals: SessionVitals;
  stripOverrides: SessionStripOverrides;
  /** Call-only flags — harmless on consults. */
  micOn: boolean;
  camOn: boolean;
  patientLeft: boolean;
}

const emptyDraft: SessionDraft = {
  chiefComplaint: '',
  oe: [],
  diagnoses: [],
  tests: [],
  advice: [],
  medicines: [],
  followUp: '',
  operation: [],
};

const defaultVitals: SessionVitals = { weight: '68', bp: '140/90', pulse: '88' };

export interface StartArgs {
  kind: SessionKind;
  patientId: string;
  patientName: string;
  returnPath: string;
  /** Call auto-records from the moment it opens. Consults start paused. */
  autoRecord?: boolean;
}

interface SessionState {
  active: ActiveSession | null;

  start: (args: StartArgs) => void;
  end: () => void;

  setRecording: (on: boolean) => void;
  setLang: (l: SessionLang) => void;
  tickElapsed: () => void;
  appendTurn: (t: ConsultTurn) => void;
  incrementScriptIndex: () => void;

  setDraft: (fn: (d: SessionDraft) => SessionDraft) => void;
  setVitals: (fn: (v: SessionVitals) => SessionVitals) => void;
  setStripOverrides: (patch: Partial<SessionStripOverrides>) => void;

  setMic: (on: boolean) => void;
  setCam: (on: boolean) => void;
  setPatientLeft: (left: boolean) => void;
}

export const useActiveSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      active: null,

      start: ({ kind, patientId, patientName, returnPath, autoRecord }) => {
        const cur = get().active;
        // Resume the same session if patient + kind match — we just refresh
        // the return path (in case the URL scheme changed).
        if (cur && cur.patientId === patientId && cur.kind === kind) {
          set({ active: { ...cur, returnPath } });
          return;
        }
        set({
          active: {
            id: `${kind}-${Date.now()}`,
            kind,
            patientId,
            patientName,
            returnPath,
            startedAt: new Date().toISOString(),
            recording: autoRecord ?? kind === 'call',
            elapsed: 0,
            lang: 'bn',
            transcript: [],
            scriptIndex: 0,
            draft: emptyDraft,
            vitals: defaultVitals,
            stripOverrides: {},
            micOn: true,
            camOn: true,
            patientLeft: false,
          },
        });
      },

      end: () => set({ active: null }),

      setRecording: (on) =>
        set((s) => (s.active ? { active: { ...s.active, recording: on } } : s)),
      setLang: (l) =>
        set((s) => (s.active ? { active: { ...s.active, lang: l } } : s)),
      tickElapsed: () =>
        set((s) =>
          s.active ? { active: { ...s.active, elapsed: s.active.elapsed + 1 } } : s
        ),
      appendTurn: (t) =>
        set((s) =>
          s.active
            ? { active: { ...s.active, transcript: [...s.active.transcript, t] } }
            : s
        ),
      incrementScriptIndex: () =>
        set((s) =>
          s.active ? { active: { ...s.active, scriptIndex: s.active.scriptIndex + 1 } } : s
        ),

      setDraft: (fn) =>
        set((s) =>
          s.active ? { active: { ...s.active, draft: fn(s.active.draft) } } : s
        ),
      setVitals: (fn) =>
        set((s) =>
          s.active ? { active: { ...s.active, vitals: fn(s.active.vitals) } } : s
        ),
      setStripOverrides: (patch) =>
        set((s) =>
          s.active
            ? {
                active: {
                  ...s.active,
                  stripOverrides: { ...s.active.stripOverrides, ...patch },
                },
              }
            : s
        ),

      setMic: (on) =>
        set((s) => (s.active ? { active: { ...s.active, micOn: on } } : s)),
      setCam: (on) =>
        set((s) => (s.active ? { active: { ...s.active, camOn: on } } : s)),
      setPatientLeft: (left) =>
        set((s) => (s.active ? { active: { ...s.active, patientLeft: left } } : s)),
    }),
    { name: 'pai.active-session', version: 1 }
  )
);
