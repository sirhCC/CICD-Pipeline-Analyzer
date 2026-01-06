import type { Request, Response, NextFunction } from 'express';

export interface CacheControlOptions {
  maxAge?: number; // seconds
  sMaxAge?: number; // seconds for proxies/CDNs
  staleWhileRevalidate?: number; // seconds
  staleIfError?: number; // seconds
  public?: boolean;
  private?: boolean;
  noStore?: boolean;
  noCache?: boolean;
  mustRevalidate?: boolean;
  immutable?: boolean;
}

/**
 * Returns an Express middleware that sets Cache-Control headers based on options.
 * Defaults to no-store when no options are provided.
 */
export function cacheControl(options: CacheControlOptions = { noStore: true }) {
  return function (_req: Request, res: Response, next: NextFunction) {
    const parts: string[] = [];

    if (options.noStore) {
      parts.push('no-store');
    } else {
      if (options.noCache) parts.push('no-cache');
      if (options.public) parts.push('public');
      if (options.private) parts.push('private');
      if (typeof options.maxAge === 'number')
        parts.push(`max-age=${Math.max(0, Math.floor(options.maxAge))}`);
      if (typeof options.sMaxAge === 'number')
        parts.push(`s-maxage=${Math.max(0, Math.floor(options.sMaxAge))}`);
      if (typeof options.staleWhileRevalidate === 'number')
        parts.push(
          `stale-while-revalidate=${Math.max(0, Math.floor(options.staleWhileRevalidate))}`
        );
      if (typeof options.staleIfError === 'number')
        parts.push(`stale-if-error=${Math.max(0, Math.floor(options.staleIfError))}`);
      if (options.mustRevalidate) parts.push('must-revalidate');
      if (options.immutable) parts.push('immutable');
    }

    res.setHeader('Cache-Control', parts.length ? parts.join(', ') : 'no-store');
    next();
  };
}

// Convenience presets
export const noStore = () => cacheControl({ noStore: true });
export const shortPublicCache = (seconds = 60) =>
  cacheControl({ public: true, maxAge: seconds, staleWhileRevalidate: seconds });
