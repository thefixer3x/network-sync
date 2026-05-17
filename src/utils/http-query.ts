/**
 * HTTP Query Parameter Utilities
 *
 * Canonical helper for reading typed query parameters from Express Request objects.
 * All route files MUST use these helpers — never read req.query.x directly.
 *
 * @see Implementation_Guide.md §10.1
 */

import type { Request } from 'express';

/**
 * Read a query param as a raw string (or undefined if absent/array).
 * Use this when the param is expected to be a single string value.
 */
export function getQuery(
  req: Request,
  name: string,
  opts: { default?: string } = {},
): string | undefined {
  const v = req.query[name];
  if (Array.isArray(v)) return typeof v[0] === 'string' ? v[0] : opts.default;
  if (typeof v === 'string') return v;
  return opts.default;
}

/**
 * Read a query param as an integer (or a default if absent/invalid).
 * Use for pagination, timestamps, numeric IDs.
 */
export function getQueryInt(req: Request, name: string, def?: number): number | undefined {
  const s = getQuery(req, name);
  if (s === undefined) return def;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : def;
}

/**
 * Read a query param as a boolean.
 * Accepts: '1', 'true' (case-insensitive) → true; everything else → default.
 */
export function getQueryBool(req: Request, name: string, def = false): boolean {
  const s = getQuery(req, name);
  if (s === undefined) return def;
  return s === '1' || s.toLowerCase() === 'true';
}