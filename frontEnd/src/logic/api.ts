// frontEnd/src/logic/api.ts

import type { PasskeyLocalStorageFormat } from './passkeys';
import { toHex } from 'viem';

// Base URL for your Rails API
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

/**
 * The shape of a User record returned by Rails
 */
export type UserRecord = {
  id: number;
  account_address: string;               // on-chain account address
  username: string;                      // user's display name
  pubkey_id: string;                     // original passkey UUID
  pubkey_coordinates: { x: string; y: string };  // raw hex strings (0x-prefixed)
  timestamp: string;
  created_at: string;
  updated_at: string;
};

/**
 * Convert a UserRecord to PasskeyLocalStorageFormat
 */
export function toPasskeyLocalFormat(user: UserRecord): PasskeyLocalStorageFormat {
  return {
    id: user.pubkey_id,
    pubkeyCoordinates: {
      x: BigInt(user.pubkey_coordinates.x),
      y: BigInt(user.pubkey_coordinates.y),
    },
  };
}

/**
 * Create a new user (signup). Handles JSON error payloads, including 409 Conflict.
 */
export async function createUser(
  accountAddress: string,
  passkey: PasskeyLocalStorageFormat,
  username: string
): Promise<void> {
  const xHex = toHex(passkey.pubkeyCoordinates.x);
  const yHex = toHex(passkey.pubkeyCoordinates.y);

  const payload = {
    user: {
      account_address: accountAddress,
      username,
      pubkey_id: passkey.id,
      pubkey_coordinates: { x: xHex, y: yHex },
    },
  };

  const res = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const contentType = res.headers.get('content-type') || '';
    // If JSON, pick off our custom error fields
    if (contentType.includes('application/json')) {
      const body = await res.json();
      if (body.error) {
        throw new Error(body.error as string);
      }
      if (body.errors) {
        throw new Error((body.errors as string[]).join(', '));
      }
    }
    // Fallback to plain text
    const text = await res.text().catch(() => '');
    throw new Error(`createUser failed: ${res.status} ${text}`);
  }
}

/**
 * Fetch user by on-chain account address
 */
export async function fetchUserByAccount(
  accountAddress: string
): Promise<UserRecord | undefined> {
  const res = await fetch(
    `${API_BASE}/users/by_account/${encodeURIComponent(accountAddress)}`,
    { headers: { 'Accept': 'application/json' } }
  );
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(`fetchUserByAccount failed: ${res.status}`);
  return (await res.json()) as UserRecord;
}

/**
 * Fetch user by display name (login)
 */
export async function fetchUserByUsername(
  username: string
): Promise<UserRecord | undefined> {
  const res = await fetch(
    `${API_BASE}/users/by_username/${encodeURIComponent(username)}`,
    { headers: { 'Accept': 'application/json' } }
  );
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(`fetchUserByUsername failed: ${res.status}`);
  return (await res.json()) as UserRecord;
}

/**
 * Login helper: fetch user record and return account address + passkey
 */
export async function loginUser(
  username: string
): Promise<{ account_address: string; passkey: PasskeyLocalStorageFormat }> {
  const user = await fetchUserByUsername(username);
  if (!user) throw new Error(`No user found for username: ${username}`);
  return {
    account_address: user.account_address,
    passkey: toPasskeyLocalFormat(user),
  };
}

/**
 * Convenience wrapper: fetch user passkey by account and return in local format
 */
export async function fetchPasskeyFromDB(
  accountAddress: string
): Promise<PasskeyLocalStorageFormat> {
  const user = await fetchUserByAccount(accountAddress);
  if (!user) throw new Error(`No user found for address: ${accountAddress}`);
  return toPasskeyLocalFormat(user);
}
