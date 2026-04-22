import {
  createCredential,
  type P256Credential,
} from 'ox/WebAuthnP256'


/**
 * Creates a WebAuthn P-256 credential for signing.
 *
 * @returns A promise that resolves to a P256Credential, which includes the credential's rawId and publicKey coordinates.
 * @throws Throws an Error if credential creation fails or returns null.
 */
async function createPasskey(): Promise<P256Credential> {
  // Generate a passkey credential using WebAuthn API
  let passkeyCredential = await createCredential({
    name: 'Safe Wallet',
    challenge: crypto.getRandomValues(new Uint8Array(32)),
    rp: {
      id: window.location.hostname,
      name: 'Safe Wallet'
    },
    authenticatorSelection: {
      // Removed authenticatorAttachment to support both platform (Touch ID, Face ID)
      // and cross-platform authenticators (Google Password Manager, security keys)
      residentKey: 'required',
      userVerification: 'required',
    },
    timeout: 60000,
    attestation: 'none',
  })

  if (!passkeyCredential) {
    throw new Error('Failed to generate passkey. Received null as a credential')
  }
  return passkeyCredential
}

/**
 * Shape persisted per passkey.
 *
 * `pubkeyCoordinates` (x, y) is required on every session because:
 *   1. It's the input to `SafeAccount.createAccountAddress` — the only way
 *      to derive the account address before the Safe is deployed.
 *   2. It identifies this owner when formatting the WebAuthn signature for
 *      the Safe.
 *   3. WebAuthn only returns the public key at *registration* time; the
 *      assertion response from `navigator.credentials.get()` does not
 *      include it. Something must remember it.
 *
 * DEMO SHORTCUT — we persist (x, y) in localStorage. See App.tsx for why
 * that's not a production pattern. Back-end index or `userHandle` packing
 * are the production alternatives.
 */
export type PasskeyLocalStorageFormat = {
  id: string
  pubkeyCoordinates: {
    x: bigint
    y: bigint
  }
}

/**
 * Converts a P256Credential into the persisted shape.
 */
function toLocalStorageFormat(passkey: P256Credential): PasskeyLocalStorageFormat {
  return {
    id: passkey.id,
    pubkeyCoordinates: passkey.publicKey
  }
}


export {
	createPasskey,
	toLocalStorageFormat,
};
