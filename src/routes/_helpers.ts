import type { Request } from 'express';

/**
 * Narrow an Express `req.params` lookup (typed `string | string[] | undefined`)
 * down to a plain `string`. Express 5 widened the params shape to include
 * `string[]` for repeated path keys; route handlers that need to forward the
 * value to a service which expects `string` should use this helper instead of
 * casting inline.
 */
export const param = (req: Request, name: string): string => {
  const v = req.params[name];
  return Array.isArray(v) ? v[0]! : (v as string);
};
