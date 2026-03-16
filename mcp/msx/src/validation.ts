// Input validation utilities for OData queries and API calls (extracted from frontend)

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidGuid(value: unknown): value is string {
  if (!value || typeof value !== 'string') return false;
  return GUID_REGEX.test(value);
}

export function normalizeGuid(value: unknown): string {
  return String(value || '').replace(/[{}]/g, '').toLowerCase();
}

export function isValidTpid(value: unknown): value is string {
  if (!value || typeof value !== 'string') return false;
  return /^\d+$/.test(value) && value.length >= 1;
}

export function sanitizeODataString(value: unknown): string {
  if (!value || typeof value !== 'string') return '';
  return value.replace(/'/g, "''");
}
