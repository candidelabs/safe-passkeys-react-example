// frontEnd/src/logic/api.ts

import type { PasskeyLocalStorageFormat } from './passkeys'
import { toHex } from 'viem'

// Base URL for your Rails API
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

/**
 * The shape of a User record returned by Rails
 */
export type UserRecord = {
  id: number
  username: string                     // on-chain account address
  pubkey_id: string                   // original passkey UUID
  pubkey_coordinates: { x: string; y: string }  // raw hex strings (0x-prefixed)
  timestamp: string
  created_at: string
  updated_at: string
}

/**
 * Helper to convert DB format → PasskeyLocalStorageFormat
 */
export function toPasskeyLocalFormat(user: UserRecord): PasskeyLocalStorageFormat {
  return {
    id: user.pubkey_id,
    pubkeyCoordinates: {
      x: BigInt(user.pubkey_coordinates.x),
      y: BigInt(user.pubkey_coordinates.y),
    },
  }
}

/**
 * Inserts a new user into Postgres via your Rails backend.
 * Assumes you already know the account address (username).
 */
export async function createUser(
  accountAddress: string,
  passkey: PasskeyLocalStorageFormat
): Promise<void> {
  // Convert BigInt coords into 0x-hex strings
  const xHex = toHex(passkey.pubkeyCoordinates.x)
  const yHex = toHex(passkey.pubkeyCoordinates.y)

  const body = {
    user: {
      account_address:    accountAddress,
      username:           accountAddress,
      pubkey_id:          passkey.id,
      pubkey_coordinates: { x: xHex, y: yHex },
    },
  }

  const res = await fetch(`${API_BASE}/users`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '')
    throw new Error(`createUser failed: ${res.status} ${errorBody}`)
  }
}

/**
 * Retrieves a single User record by account address (username).
 */
export async function fetchUserByAccount(
  accountAddress: string
): Promise<UserRecord | undefined> {
  const encoded = encodeURIComponent(accountAddress)
  const res = await fetch(
    `${API_BASE}/users/by_account/${encoded}`,
    { headers: { 'Accept': 'application/json' } }
  )

  if (res.status === 404) return undefined
  if (!res.ok) throw new Error(`fetchUserByAccount failed: ${res.status}`)

  return res.json() as Promise<UserRecord>
}

/**
 * Convenience wrapper: fetch user passkey by account and return in local format.
 */
export async function fetchPasskeyFromDB(
  accountAddress: string
): Promise<PasskeyLocalStorageFormat> {
  const user = await fetchUserByAccount(accountAddress)
  if (!user) {
    throw new Error(`No user found for address: ${accountAddress}`)
  }
  return toPasskeyLocalFormat(user)
}
