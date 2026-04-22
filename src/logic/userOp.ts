import { sign } from 'ox/WebAuthnP256';
import type { Hex as OxHex } from 'ox/Hex';
import { Bytes, Hex } from 'ox';
import { SafeAccountV0_3_0 as SafeAccount } from 'abstractionkit';
import type {
  SendUseroperationResponse,
  SignerSignaturePair,
  WebauthnSignatureData,
  UserOperationV7,
} from 'abstractionkit';

import type { PasskeyLocalStorageFormat } from './passkeys';

/**
 * Signs a SafeAccount UserOperation with a WebAuthn passkey and sends it to
 * the bundler.
 *
 * Workflow:
 * 1. Compute the EIP-712 hash of the UserOperation.
 * 2. Sign the hash via WebAuthn (single biometric prompt).
 * 3. Extract the non-challenge `clientDataJSON` fields by parsing, not regex,
 *    so authenticators free to add fields (e.g. Safari's `crossOrigin`) don't
 *    break signing.
 * 4. Assemble the Safe-format WebAuthn signature.
 * 5. Attach to the UserOperation and dispatch to the bundler.
 *
 * @param smartAccount - Initialized SafeAccount instance (the sender).
 * @param userOp       - The unsigned UserOperationV7.
 * @param passkey      - Stored passkey (`id` + public-key coords).
 * @param chainId      - Chain id for the EIP-712 domain.
 * @param bundlerUrl   - Bundler RPC URL.
 */
async function signAndSendUserOp(
  smartAccount: SafeAccount,
  userOp: UserOperationV7,
  passkey: PasskeyLocalStorageFormat,
  chainId: bigint,
  bundlerUrl: string,
): Promise<SendUseroperationResponse> {
  // 1. EIP-712 hash of the UserOperation
  const safeOpHash = SafeAccount.getUserOperationEip712Hash(userOp, chainId);

  // 2. Sign via WebAuthn
  const { metadata, signature } = await sign({
    challenge: safeOpHash as OxHex,
    credentialId: passkey.id as OxHex,
  });

  // 3. Re-serialize every clientDataJSON field except `type` and `challenge`.
  // Robust to authenticators adding fields or reordering keys.
  const clientData = JSON.parse(metadata.clientDataJSON);
  const { type: _type, challenge: _challenge, ...rest } = clientData;
  const fields = Object.entries(rest)
    .map(([key, value]) => `"${key}":${JSON.stringify(value)}`)
    .join(',');

  // 4. Assemble the Safe-format WebAuthn signature
  const webauthnSignatureData: WebauthnSignatureData = {
    authenticatorData: Bytes.fromHex(metadata.authenticatorData).buffer as ArrayBuffer,
    clientDataFields: Hex.fromString(fields),
    rs: [signature.r, signature.s],
  };

  const webauthnSignature = SafeAccount.createWebAuthnSignature(webauthnSignatureData);

  const signerSignaturePair: SignerSignaturePair = {
    signer: passkey.pubkeyCoordinates,
    signature: webauthnSignature,
  };

  userOp.signature = SafeAccount.formatSignaturesToUseroperationSignature(
    [signerSignaturePair],
    { isInit: userOp.nonce === 0n },
  );

  // 5. Send
  return smartAccount.sendUserOperation(userOp, bundlerUrl);
}

export { signAndSendUserOp };
