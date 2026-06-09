export const BAUBOOK_RELEASE = {
  appVersion: '0.3.1',
  baseline: '2.0.1',
  releaseName: 'Beta Trust Command Center',
  releaseTag: 'v0.3.1-beta-trust-command-center',
  releaseDate: '2026-06-09',
  androidVersionCode: 14,
  iosBuildNumber: '14',
} as const;

export type BauBookRelease = typeof BAUBOOK_RELEASE;
