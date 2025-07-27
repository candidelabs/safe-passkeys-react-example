/*
 * Copyright (c) 2025 CANDIDE Labs. All rights reserved.
 *
 * This software contains confidential and proprietary information of CANDIDE Labs.
 * Any reproduction, modification, or distribution of this software, in whole or in part,
 * without the express written consent of CANDIDE Labs is strictly prohibited.
 */
import { useEffect, useState } from "react";
import * as AbstractionKit from "abstractionkit";
import type { MetaTransaction } from "abstractionkit";
import type { PasskeyLocalStorageFormat } from "../logic/passkeys";
import { fetchPasskeyFromDB } from "../logic/api";
import { signAndSendUserOp } from "../logic/userOp";
import { createPublicClient, http } from "viem";
import { getCode } from "viem/actions";

const jsonRPCProvider = import.meta.env.VITE_JSON_RPC_PROVIDER!;
const bundlerUrl       = import.meta.env.VITE_BUNDLER_URL!;
const paymasterUrl     = import.meta.env.VITE_PAYMASTER_URL!;
const chainId          = Number(import.meta.env.VITE_CHAIN_ID!);
const chainName        = import.meta.env.VITE_CHAIN_NAME as string;

type SafeCardProps = {
  accountAddress: string;
};

export function SafeCard({ accountAddress }: SafeCardProps) {
  const [passkey,    setPasskey]    = useState<PasskeyLocalStorageFormat>();
  const [userOpHash, setUserOpHash] = useState<string>();
  const [deployed,   setDeployed]   = useState<boolean>(false);
  const [loadingTx,  setLoadingTx]  = useState<boolean>(false);
  const [error,      setError]      = useState<string>();
  const [txHash,     setTxHash]     = useState<string>();
  const [gasSponsor, setGasSponsor] = useState<{ name: string; description: string; url: string; icons: string[] }>();

  const client = createPublicClient({ transport: http(jsonRPCProvider) });

  useEffect(() => {
    (async () => {
      try {
        const fetched = await fetchPasskeyFromDB(accountAddress);
        setPasskey(fetched);

        const code = await getCode(client, { address: accountAddress as `0x${string}` });
        setDeployed(code !== null && code !== "0x");
      } catch (err) {
        console.error(err);
        setError("Failed to fetch passkey or check deployment.");
      }
    })();
  }, [accountAddress]);

  const handleMintNFT = async () => {
    if (!passkey) return;
    setLoadingTx(true);
    setUserOpHash("");
    setTxHash("");
    setError("");

    try {
      const {
        SafeAccountV0_3_0: SafeAccount,
        getFunctionSelector,
        createCallData,
        CandidePaymaster,
      } = AbstractionKit;

      const nftAddress = "0x9a7af758aE5d7B6aAE84fe4C5Ba67c041dFE5336";
      const selector   = getFunctionSelector("mint(address)");
      const data       = createCallData(selector, ["address"], [accountAddress]);
      const mintTxn: MetaTransaction = { to: nftAddress, value: 0n, data };

      const safeAccount = SafeAccount.initializeNewAccount([passkey.pubkeyCoordinates]);
      let userOp = await safeAccount.createUserOperation(
        [mintTxn], jsonRPCProvider, bundlerUrl,
        {
          expectedSigners: [passkey.pubkeyCoordinates],
          preVerificationGasPercentageMultiplier: 120,
          verificationGasLimitPercentageMultiplier: 120,
        }
      );

      const paymaster = new CandidePaymaster(paymasterUrl);
      const [sponsoredOp, sponsorMetadata] = await paymaster.createSponsorPaymasterUserOperation(userOp, bundlerUrl);
      setGasSponsor(sponsorMetadata);
      userOp = sponsoredOp;

      const bundlerRes = await signAndSendUserOp(safeAccount, userOp, passkey, chainId);
      setUserOpHash(bundlerRes.userOperationHash);

      const receipt = await bundlerRes.included();
      if (receipt.success) {
        setTxHash(receipt.receipt.transactionHash);
        setUserOpHash("");
      } else {
        setError("User operation execution failed");
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoadingTx(false);
    }
  };

  return (
    <div
      className="card"
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}
    >
      <p style={{ textAlign: 'center', fontWeight: 500 }}>
        Account Address:<br />
        <a
          href={`https://${chainName}.blockscout.com/address/${accountAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ wordBreak: 'break-all', color: '#3b82f6' }}
        >
          {accountAddress}
        </a>
      </p>

      {loadingTx && !userOpHash && <p>Preparing transaction...</p>}

      {!loadingTx && (
        <button onClick={handleMintNFT} disabled={!!userOpHash}>
          Mint NFT
        </button>
      )}

      {userOpHash && (
        <p style={{ textAlign: 'center' }}>
          Your account setup is in progress. Sponsored by {gasSponsor?.name}
          {/* ... */}
        </p>
      )}

      {txHash && (
        <p style={{ textAlign: 'center' }}>
          You collected an NFT, secured with your Safe Account & authenticated by your Device Passkeys.<br />
          <a
            target="_blank"
            href={`https://${chainName}.blockscout.com/tx/${txHash}`}
          >
            View on block explorer
          </a>
        </p>
      )}

      {error && <p style={{ color: 'red', textAlign: 'center' }}>Error: {error}</p>}
    </div>
  );
}
