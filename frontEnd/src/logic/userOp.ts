/*
 * Copyright (c) 2025 CANDIDE Labs. All rights reserved.
 *
 * This software contains confidential and proprietary information of CANDIDE Labs.
 * Any reproduction, modification, or distribution of this software, in whole or in part,
 * without the express written consent of CANDIDE Labs is strictly prohibited.
 */

import { sign } from 'ox/WebAuthnP256';
import { Hex as OxHex } from 'ox/Hex'
import { Bytes, Hex } from 'ox'
import {
  SafeAccountV0_3_0 as SafeAccount,
  SignerSignaturePair,
  WebauthnSignatureData,
  SendUseroperationResponse,
  UserOperationV7,
} from 'abstractionkit'

import { 
  PasskeyLocalStorageFormat
} from './passkeys'

/**
 * Signs a SafeAccount UserOperation using Ox/WebAuthnP256 and sends it to the bundler.
 *
 * Workflow:
 * 1. Compute the EIP-712 hash of the UserOperation.
 * 2. Call Ox `sign()` with the stored credential ID to obtain the raw WebAuthn signature and metadata.
 * 3. Extract any extra clientDataJSON fields beyond the challenge.
 * 4. Build a WebauthnSignatureData object for SafeAccount.
 * 5. Generate the final EIP-4337 signature via SafeAccount API.
 * 6. Embed the signature in the UserOperation and dispatch it.
 *
 * @param smartAccount - Initialized SafeAccount instance.
 * @param userOp - The unsigned UserOperationV7.
 * @param passkey - LocalStorage passkey containing `id` and public-key coords.
 * @param chainId - Chain ID (bigint|string|number) for EIP-712 domain.
 * @param bundlerUrl - URL of the bundler endpoint.
 * @returns A promise resolving to the SendUseroperationResponse.
 * @throws If the WebAuthn metadata format is invalid.
 */
async function signAndSendUserOp(
  smartAccount: SafeAccount,
  userOp: UserOperationV7,
  passkey: PasskeyLocalStorageFormat,
  chainId: bigint | string | number = import.meta.env.VITE_CHAIN_ID,
  bundlerUrl: string = import.meta.env.VITE_BUNDLER_URL,
): Promise<SendUseroperationResponse> {
    // 1. EIP-712 hash for the UserOperation
  const safeInitOpHash = SafeAccount.getUserOperationEip712Hash(userOp, BigInt(chainId)) ;

  // 2. Sign via Ox/WebAuthnP256
  const { metadata, signature } = await sign({
    challenge: safeInitOpHash as OxHex,
    credentialId: passkey.id as OxHex,
  });

  // 3. Extract additional clientDataJSON fields (post-challenge)
  const clientDataMatch = metadata.clientDataJSON.match(
    /^\{"type":"webauthn.get","challenge":"[A-Za-z0-9\-_]{43}",(.*)\}$/,
  );
  if (!clientDataMatch) {
    throw new Error('Invalid clientDataJSON format: challenge not found');
  }
  const [, fields] = clientDataMatch;

  // 4. Assemble WebauthnSignatureData for SafeAccount
  const webauthnSignatureData: WebauthnSignatureData = {
    authenticatorData: Bytes.fromHex(metadata.authenticatorData)
      .buffer as ArrayBuffer,
    clientDataFields: Hex.fromString(fields),
    rs: [signature.r, signature.s],
  };
  
  // 5. Create the final Safe EIP-4337 signature
  const webauthSignature = SafeAccount.createWebAuthnSignature(
    webauthnSignatureData,
  );

  // 6. Attach to UserOperation and send
  const signerSignaturePair: SignerSignaturePair = {
    signer: passkey.pubkeyCoordinates,
    signature: webauthSignature,
  };
  userOp.signature = SafeAccount.formatSignaturesToUseroperationSignature(
    [signerSignaturePair],
    { isInit: userOp.nonce === 0n },
  );

  return smartAccount.sendUserOperation(userOp, bundlerUrl);
}

export { signAndSendUserOp }

