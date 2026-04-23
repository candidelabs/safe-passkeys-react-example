import { SafeAccountV0_3_0 as SafeAccount, fromWebAuthn } from 'abstractionkit';
import type {
  SendUseroperationResponse,
  UserOperationV7,
} from 'abstractionkit';

import type { PasskeyLocalStorageFormat } from './passkeys';

/**
 * Signs a SafeAccount UserOperation with a WebAuthn passkey and sends it to
 * the bundler, using abstractionkit's `fromWebAuthn` adapter.
 *
 * The adapter collapses the previous manual pipeline — parsing
 * `clientDataJSON`, assembling `WebauthnSignatureData`, calling
 * `createWebAuthnSignature`, wrapping a `SignerSignaturePair`, and calling
 * `formatSignaturesToUseroperationSignature` — into a single call to
 * `signUserOperationWithSigners`. The adapter's default `signFn` invokes
 * `navigator.credentials.get(...)` with the right
 * `publicKey.allowCredentials`, so there's no `ox` / `@simplewebauthn`
 * dependency on the signing path. `createPasskey` in `./passkeys.ts` still
 * uses `ox/WebAuthnP256` for registration, which the adapter doesn't
 * cover.
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
  userOp.signature = await smartAccount.signUserOperationWithSigners(
    userOp,
    [
      fromWebAuthn({
        credentialId: passkey.id,
        pubkey: passkey.pubkeyCoordinates,
      }),
    ],
    chainId,
  );

  return smartAccount.sendUserOperation(userOp, bundlerUrl);
}

export { signAndSendUserOp };
