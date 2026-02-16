import { sign } from 'ox/WebAuthnP256';
import { Hex as OxHex } from 'ox/Hex'
import { Bytes, Hex } from 'ox'
import {
  SafeMultiChainSigAccount as SafeAccount,
  AllowAllPaymaster,
  SignerSignaturePair,
  WebauthnSignatureData,
  SendUseroperationResponse,
  UserOperationV9,
} from 'abstractionkit'

import {
  PasskeyLocalStorageFormat
} from './passkeys'

export interface MultiChainUserOpInput {
  userOp: UserOperationV9;
  chainId: bigint;
  bundlerUrl: string;
}

/**
 * Signs N UserOperations on multiple chains with a single passkey authentication
 * and sends them to their respective bundlers.
 *
 * Workflow:
 * 1. Build userOperationsToSign array for all chains.
 * 2. Compute multichain Merkle root hash via getMultiChainSingleSignatureUserOperationsEip712Hash().
 * 3. Sign once with WebAuthn (single biometric prompt).
 * 4. Expand the single signature into per-chain signatures via formatSignaturesToUseroperationsSignatures().
 * 5. Apply AllowAllPaymaster data (must happen after signatures are set).
 * 6. Send all UserOperations concurrently.
 */
async function signAndSendMultiChainUserOps(
  ops: MultiChainUserOpInput[],
  passkey: PasskeyLocalStorageFormat,
): Promise<SendUseroperationResponse[]> {
  const userOperationsToSign = ops.map((op) => ({
    userOperation: op.userOp,
    chainId: op.chainId,
  }));

  // Debug: log per-chain UserOp data before signing
  console.log('[multichain] chains:', ops.map(op => op.chainId.toString()));
  ops.forEach((op, i) => {
    const uo = op.userOp;
    console.log(`[multichain] chain ${op.chainId} userOp:`, {
      sender: uo.sender,
      nonce: uo.nonce.toString(),
      callDataLen: uo.callData.length,
      callGasLimit: uo.callGasLimit.toString(),
      verificationGasLimit: uo.verificationGasLimit.toString(),
      preVerificationGas: uo.preVerificationGas.toString(),
      maxFeePerGas: uo.maxFeePerGas.toString(),
      maxPriorityFeePerGas: uo.maxPriorityFeePerGas.toString(),
      factory: uo.factory,
      paymaster: uo.paymaster,
      paymasterData: uo.paymasterData,
    });
  });

  // 1. Multichain Merkle root hash
  const multiChainHash = SafeAccount.getMultiChainSingleSignatureUserOperationsEip712Hash(
    userOperationsToSign,
  );

  console.log('[multichain] multiChainHash:', multiChainHash);

  // 2. Sign with passkey (single biometric prompt)
  const { metadata, signature } = await sign({
    challenge: multiChainHash as OxHex,
    credentialId: passkey.id as OxHex,
  });

  // 3. Extract additional clientDataJSON fields (post-challenge)
  console.log('[multichain] clientDataJSON:', metadata.clientDataJSON);

  const clientDataMatch = metadata.clientDataJSON.match(
    /^\{"type":"webauthn.get","challenge":"[A-Za-z0-9\-_]{43}",(.*)\}$/,
  );
  if (!clientDataMatch) {
    throw new Error('Invalid clientDataJSON format: challenge not found');
  }
  const [, fields] = clientDataMatch;

  // 4. Assemble WebauthnSignatureData
  const webauthnSignatureData: WebauthnSignatureData = {
    authenticatorData: Bytes.fromHex(metadata.authenticatorData)
      .buffer as ArrayBuffer,
    clientDataFields: Hex.fromString(fields),
    rs: [signature.r, signature.s],
  };

  const webauthSignature = SafeAccount.createWebAuthnSignature(
    webauthnSignatureData,
  );

  const signerSignaturePair: SignerSignaturePair = {
    signer: passkey.pubkeyCoordinates,
    signature: webauthSignature,
  };

  // 5. Format single signature into per-UserOperation signatures
  const isInit = ops[0].userOp.nonce == 0n;
  console.log('[multichain] isInit:', isInit);

  const signatures = SafeAccount.formatSignaturesToUseroperationsSignatures(
    userOperationsToSign,
    [signerSignaturePair],
    { isInit },
  );

  ops.forEach((op, i) => {
    op.userOp.signature = signatures[i];
    console.log(`[multichain] chain ${op.chainId} signature length:`, signatures[i].length);
  });

  // 6. Apply paymaster data (can happen during or after signatures are set)
  const paymaster = new AllowAllPaymaster();
  const paymasterResults = await Promise.all(
    ops.map((op) => paymaster.getApprovedPaymasterData(op.userOp)),
  );

  ops.forEach((op, i) => {
    op.userOp.paymasterData = paymasterResults[i];
  });

  // 7. Send all UserOperations — use allSettled to see per-chain results
  const results = await Promise.allSettled(
    ops.map((op) => {
      const sender = new SafeAccount(op.userOp.sender);
      return sender.sendUserOperation(op.userOp, op.bundlerUrl);
    }),
  );

  // Log per-chain send results
  const responses: SendUseroperationResponse[] = [];
  const errors: string[] = [];
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      console.log(`[multichain] chain ${ops[i].chainId} SENT OK:`, result.value.userOperationHash);
      responses.push(result.value);
    } else {
      const err = result.reason;
      // Log the full error object to see all properties
      console.error(`[multichain] chain ${ops[i].chainId} FAILED — full error:`, err);
      console.error(`[multichain] chain ${ops[i].chainId} error keys:`, err ? Object.keys(err) : 'null');
      console.error(`[multichain] chain ${ops[i].chainId} JSON:`, JSON.stringify(err, Object.getOwnPropertyNames(err || {})));
      const errMsg = err?.message || err?.toString() || 'Unknown error';
      errors.push(`Chain ${ops[i].chainId}: ${errMsg}`);
    }
  });

  if (errors.length > 0) {
    // If some chains succeeded but others failed, log it clearly
    console.error(`[multichain] ${errors.length}/${ops.length} chains failed:`, errors);
    throw new Error(errors.join('\n'));
  }

  return responses;
}

export { signAndSendMultiChainUserOps }
