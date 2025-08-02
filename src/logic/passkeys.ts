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
async function createPasskey(name: string = "Safe Wallet"): Promise<P256Credential> {
  // Generate a passkey credential using WebAuthn API
  let passkeyCredential = await createCredential({
    name,
    challenge: crypto.getRandomValues(new Uint8Array(32)),
    rp: { 
      id: window.location.hostname,
      name
    },
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
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

export type PasskeyLocalStorageFormat = {
  id: string
  pubkeyCoordinates: {
    x: bigint
    y: bigint
  }
}

/**
 * Converts a P256Credential into a format suitable for storing in localStorage.
 *
 * @param passkey - The P256Credential returned from WebAuthn.
 * @returns An object containing `id` and `pubkeyCoordinates` ready for JSON.stringify.
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
