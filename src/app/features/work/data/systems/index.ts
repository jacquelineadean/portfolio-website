import { SystemSpec } from '../../../../shared/components/system-diagram/system.model';
import { ALGORITHM_VISUALIZER } from './algorithm-visualizer';
import { READINESS_LOOP } from './readiness-loop';

/** Each project's system diagram, keyed by project slug. */
export const SYSTEMS: Record<string, SystemSpec> = {
  'algorithm-visualizer': ALGORITHM_VISUALIZER,
  'readiness-loop': READINESS_LOOP,
};
