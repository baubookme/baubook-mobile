export const BAUBOOK_LEGAL_URLS = {
  home: 'https://baubook.me/',
  privacy: 'https://baubook.me/privacy/',
  terms: 'https://baubook.me/terms/',
  communityGuidelines: 'https://baubook.me/community-guidelines/',
  support: 'https://baubook.me/support/',
  accountDeletion: 'https://baubook.me/account-deletion/',
} as const;

export type BauBookLegalUrlKey = keyof typeof BAUBOOK_LEGAL_URLS;

