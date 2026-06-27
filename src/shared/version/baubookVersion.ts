export const BAUBOOK_RELEASE = {
  appVersion: '0.7.4',
  baseline: '2.3.0',
  releaseName: 'BauBook 0.7.4 Store Metadata & Legal Readiness',
  releaseTag: 'baubook-0.7.4-store-metadata-legal-readiness',
  releaseDate: '2026-06-25',
  androidVersionCode: 34,
  iosBuildNumber: '34',
} as const;

export type BauBookRelease = typeof BAUBOOK_RELEASE;
