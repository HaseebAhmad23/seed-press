/** Privacy / legal contact; override with PUBLIC_CONTACT_EMAIL in env (e.g. Vercel). */
export const contactEmail =
  import.meta.env.PUBLIC_CONTACT_EMAIL?.trim() || 'privacy@haseebstudio.com';
