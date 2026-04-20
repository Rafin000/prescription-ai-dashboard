import type { ConsultTurn } from '../types';

/**
 * The scripted demo transcript was served by the mock adapter. The real
 * transcript arrives from the live STT stream (slice-5 continuation on the
 * backend). Until that WS plane lands we return an empty array so the
 * consult screens render cleanly without a network error.
 */
export const consultService = {
  getScript: async (): Promise<ConsultTurn[]> => [],
};
