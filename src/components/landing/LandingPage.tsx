/** Standalone welcome route: the live CapabilityStatement rendered as a transit map. */

import { useSearchParams } from 'react-router-dom';

import { isWelcomeMode, useExperience } from '../../context/ExperienceContext';
import { CommandPalette } from '../CommandPalette';
import { FhirMetro } from './FhirMetro';
import { FhirOrrery } from './FhirOrrery';

export function LandingPage() {
  const [searchParams] = useSearchParams();
  const { welcomeMode } = useExperience();
  const requestedMode = searchParams.get('mode');
  const mode = isWelcomeMode(requestedMode) ? requestedMode : welcomeMode;

  return (
    <div className="min-h-full">
      <CommandPalette />
      {mode === 'orrery' ? <FhirOrrery /> : <FhirMetro />}
    </div>
  );
}
