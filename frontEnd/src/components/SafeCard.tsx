// frontEnd/src/components/SafeCard.tsx
import { useEffect, useState } from "react";
// Import AbstractionKit as a namespace to avoid import errors
import * as AbstractionKit from "abstractionkit";
import type { MetaTransaction } from "abstractionkit";
import type { PasskeyLocalStorageFormat } from "../logic/passkeys";
// Use the existing helper that returns PasskeyLocalStorageFormat directly
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
  const [passkey,      setPasskey]      = useState<PasskeyLocalStorageFormat>();
  const [userOpHash,   setUserOpHash]   = useState<string>();
  const [deployed,     setDeployed]     = useState<boolean>(false);
  const [loadingTx,    setLoadingTx]    = useState<boolean>(false);
  const [error,        setError]        = useState<string>();
  const [txHash,       setTxHash]       = useState<string>();
  const [gasSponsor,   setGasSponsor]   = useState<{ name: string; description: string; url: string; icons: string[] }>();

  const client = createPublicClient({ transport: http(jsonRPCProvider) });

  useEffect(() => {
    (async () => {
      try {
        // Fetch the passkey format directly from backend
        const fetched = await fetchPasskeyFromDB(accountAddress);
        setPasskey(fetched);

        // Check if Safe contract is deployed
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
      // Destructure the runtime exports
      const {
        SafeAccountV0_3_0: SafeAccount,
        getFunctionSelector,
        createCallData,
        CandidePaymaster,
      } = AbstractionKit;

      // Prepare the mint transaction
      const nftAddress = "0x9a7af758aE5d7B6aAE84fe4C5Ba67c041dFE5336";
      const selector   = getFunctionSelector("mint(address)");
      const data       = createCallData(selector, ["address"], [accountAddress]);
      const mintTxn: MetaTransaction = { to: nftAddress, value: 0n, data };

      // Initialize SafeAccount and create user operation
      const safeAccount = SafeAccount.initializeNewAccount([passkey.pubkeyCoordinates]);
      let userOp = await safeAccount.createUserOperation(
        [mintTxn], jsonRPCProvider, bundlerUrl,
        {
          expectedSigners: [passkey.pubkeyCoordinates],
          preVerificationGasPercentageMultiplier: 120,
          verificationGasLimitPercentageMultiplier: 120,
        }
      );

      // Sponsor via paymaster
      const paymaster = new CandidePaymaster(paymasterUrl);
      const [sponsoredOp, sponsorMetadata] = await paymaster.createSponsorPaymasterUserOperation(userOp, bundlerUrl);
      setGasSponsor(sponsorMetadata);
      userOp = sponsoredOp;

      // Sign & send the operation
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
    <div className="card">
      {userOpHash && (
        <p>
          Your account setup is in progress. Sponsored by {gasSponsor?.name}
          <a
            href={gasSponsor?.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ marginLeft: 5 }}
          >
            <img
              src={gasSponsor?.icons[0]}
              alt="logo"
              style={{ width: 25, height: 25, verticalAlign: "middle" }}
            />
          </a>
          <br />
          Track on{' '}
          <a
            target="_blank"
            href={`https://${chainName.toLowerCase()}.blockscout.com/op/${userOpHash}`}
          >
            explorer
          </a>
        </p>
      )}

      {txHash && (
        <p>
          NFT minted successfully!<br />
          <a
            target="_blank"
            href={`https://${chainName}.blockscout.com/tx/${txHash}`}
          >
            View on explorer
          </a>
        </p>
      )}

      {loadingTx && !userOpHash ? (
        <p>Preparing transaction...</p>
      ) : (
        accountAddress && (
          <button onClick={handleMintNFT} disabled={!!userOpHash}>
            Mint NFT
          </button>
        )
      )}

      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
    </div>
  );
}
