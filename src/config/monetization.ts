/**
 * Optional monetization — set in `.env` (use PUBLIC_* so values are available at build time).
 * See `.env.example` in the repo root.
 */
export const supportUrl = import.meta.env.PUBLIC_SUPPORT_URL?.trim() ?? '';

/** Google AdSense data-ad-client value, e.g. ca-pub-1234567890123456 */
export const adsenseClientId = import.meta.env.PUBLIC_ADSENSE_CLIENT_ID?.trim() ?? '';

export const showAffiliateDisclosure =
  import.meta.env.PUBLIC_SHOW_AFFILIATE_DISCLOSURE === 'true';
