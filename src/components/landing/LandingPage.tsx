/** Standalone homepage: the live CapabilityStatement rendered as a transit map. */

import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

import { isWelcomeMode, useExperience } from '../../context/ExperienceContext';
import { CommandPalette } from '../CommandPalette';
import { FhirMetro } from './FhirMetro';
import { FhirOrrery } from './FhirOrrery';

export function LandingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { welcomeMode } = useExperience();
  const requestedMode = searchParams.get('mode');
  const mode = isWelcomeMode(requestedMode) ? requestedMode : welcomeMode;

  useEffect(() => {
    if (requestedMode === 'orrery') {
      navigate('/', { replace: true });
    }
  }, [navigate, requestedMode]);

  return (
    <div className="min-h-full">
      <CommandPalette />
      {mode === 'orrery' ? <FhirOrrery /> : <FhirMetro />}
    </div>
  );
}
