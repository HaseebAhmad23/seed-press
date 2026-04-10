import { contactEmail } from './site';

/**
 * Impressum (legal notice) for Germany — set via PUBLIC_* env vars on your host (e.g. Vercel).
 * See `.env.example`.
 */
export const impressum = {
  name: import.meta.env.PUBLIC_IMPRESSUM_NAME?.trim() ?? '',
  street: import.meta.env.PUBLIC_IMPRESSUM_STREET?.trim() ?? '',
  postalCode: import.meta.env.PUBLIC_IMPRESSUM_POSTAL_CODE?.trim() ?? '',
  city: import.meta.env.PUBLIC_IMPRESSUM_CITY?.trim() ?? '',
  country: import.meta.env.PUBLIC_IMPRESSUM_COUNTRY?.trim() || 'Deutschland',
  email: contactEmail,
  phone: import.meta.env.PUBLIC_IMPRESSUM_PHONE?.trim() ?? '',
  /** e.g. USt-IdNr. DE123456789 — leave empty if not applicable */
  vatId: import.meta.env.PUBLIC_IMPRESSUM_VAT_ID?.trim() ?? '',
  /** Optional short line, e.g. Kleinunternehmer status */
  businessNote: import.meta.env.PUBLIC_IMPRESSUM_BUSINESS_NOTE?.trim() ?? '',
} as const;
