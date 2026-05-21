export const FULL_ADMIN_EMAILS = [
  'pderivera.student@ua.edu.ph',
  'admin@ssite.com'
];

export const PRIMARY_ADMIN_EMAIL = FULL_ADMIN_EMAILS[0];

export const normalizeAdminEmail = (email = '') => email.trim().toLowerCase();

export const isFullAdminEmail = (email = '') =>
  FULL_ADMIN_EMAILS.includes(normalizeAdminEmail(email));
