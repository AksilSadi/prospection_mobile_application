import { Buffer } from 'buffer';
import { TokenPayload } from './auth.types';

function base64Decode(input: string): string {
  if (typeof globalThis.atob === 'function') {
    return globalThis.atob(input);
  }

  return Buffer.from(input, 'base64').toString('binary');
}

export function decodeToken(token: string): TokenPayload {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      base64Decode(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    throw new Error('Invalid token format');
  }
}
