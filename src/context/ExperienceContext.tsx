/** Persisted presentation preferences that are independent of FHIR server data. */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { initialString, writeStorage } from '../lib/storage';

export const WELCOME_MODES = [
  {
    id: 'metro',
    label: 'FHIR Metro',
    note: 'Explore the server as a connected transit network.',
  },
  {
    id: 'orrery',
    label: 'FHIR Orrery',
    note: 'Explore landmark resources as an orbital system.',
  },
] as const;

export type WelcomeMode = (typeof WELCOME_MODES)[number]['id'];

const DEFAULT_WELCOME_MODE: WelcomeMode = 'orrery';
const WELCOME_MODE_STORAGE_KEY = 'welcome-mode';

export function isWelcomeMode(value: string | null): value is WelcomeMode {
  return !!value && WELCOME_MODES.some((mode) => mode.id === value);
}

interface ExperienceContextValue {
  welcomeMode: WelcomeMode;
  setWelcomeMode: (mode: WelcomeMode) => void;
}

const ExperienceContext = createContext<ExperienceContextValue | null>(null);

export function ExperienceProvider({ children }: { children: ReactNode }) {
  const [welcomeMode, setWelcomeModeState] = useState<WelcomeMode>(() => {
    const stored = initialString(localStorage, WELCOME_MODE_STORAGE_KEY, DEFAULT_WELCOME_MODE);
    return isWelcomeMode(stored) ? stored : DEFAULT_WELCOME_MODE;
  });

  useEffect(() => {
    writeStorage(localStorage, WELCOME_MODE_STORAGE_KEY, welcomeMode);
  }, [welcomeMode]);

  const setWelcomeMode = useCallback((mode: WelcomeMode) => setWelcomeModeState(mode), []);
  const value = useMemo(() => ({ welcomeMode, setWelcomeMode }), [welcomeMode, setWelcomeMode]);

  return <ExperienceContext.Provider value={value}>{children}</ExperienceContext.Provider>;
}

export function useExperience(): ExperienceContextValue {
  const context = useContext(ExperienceContext);
  if (!context) throw new Error('useExperience must be used within an ExperienceProvider');
  return context;
}
