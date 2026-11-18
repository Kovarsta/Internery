/** Public API of the AI service. */
export { AI_DATA_NOTICE, getAiConsent, setAiConsent, type AiConsentState } from './consent.ts';
export { getJobFit, type JobFit, type JobFitRequest } from './fit.ts';
export { getJobSuggestions, type JobSuggestion, type JobSuggestions } from './suggestions.ts';
