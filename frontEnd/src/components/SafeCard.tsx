import { useEffect, useState } from "react";
import {
  SafeAccountV0_3_0 as SafeAccount,
  getFunctionSelector,
  createCallData,
  MetaTransaction,
  CandidePaymaster,
} from "abstractionkit";

import { PasskeyLocalStorageFormat } from "../logic/passkeys";
import { signAndSendUserOp } from "../logic/userOp";
import { createPublicClient, http } from "viem";
import { getCode } from "viem/actions";
import { fetchPasskeyFromDB } from "../logic/api";

const jsonRPCProvider = import.meta.env.VITE_JSON_RPC_PROVIDER;
const bundlerUrl = import.meta.env.VITE_BUNDLER_URL;
const paymasterUrl = import.meta.env.VITE_PAYMASTER_URL;
const chainId = import.meta.env.VITE_CHAIN_ID;
const chainName = import.meta.env.VITE_CHAIN_NAME as string;

type SafeCardProps = {
  accountAddress: string;
};

function SafeCard({ accountAddress }: SafeCardProps) {
  const [passkey, setPasskey] = useState<PasskeyLocalStorageFormat>();
  const [userOpHash, setUserOpHash] = useState<string>();
  const [deployed, setDeployed] = useState<boolean>(false);
  const [loadingTx, setLoadingTx] = useState<boolean>(false);
  const [error, setError] = useState<string>();
  const [txHash, setTxHash] = useState<string>();
  const [gasSponsor, setGasSponsor] = useState<
    | {
        name: string;
        description: string;
        url: string;
        icons: string[];
      }
    | undefined
  >(undefined);

  const client = createPublicClient({
    transport: http(jsonRPCProvider),
  });

  useEffect(() => {
    const load = async () => {
      try {
        const fetched = await fetchPasskeyFromDB(accountAddress);
        setPasskey(fetched);

        const safeCode = await getCode(client, {
          address: accountAddress as `0x${string}`,
        });
        setDeployed(safeCode !== null && safeCode !== "0x");
      } catch (err) {
        console.error(err);
        setError("Failed to fetch passkey or check deployment.");
      }
    };
    load();
  }, [accountAddress]);

  const handleMintNFT = async () => {
    if (!passkey) return;

    setLoadingTx(true);
    setTxHash("");
    setError("");

    const nftContractAddress = "0x9a7af758aE5d7B6aAE84fe4C5Ba67c041dFE5336";
    const mintFunctionSelector = getFunctionSelector("mint(address)");
    const mintTransactionCallData = createCallData(
      mintFunctionSelector,
      ["address"],
      [accountAddress]
    );
    const mintTransaction: MetaTransaction = {
      to: nftContractAddress,
      value: 0n,
      data: mintTransactionCallData,
    };

    const safeAccount = SafeAccount.initializeNewAccount([
      passkey.pubkeyCoordinates,
    ]);

    try {
      let userOperation = await safeAccount.createUserOperation(
        [mintTransaction],
        jsonRPCProvider,
        bundlerUrl,
        {
          expectedSigners: [passkey.pubkeyCoordinates],
          preVerificationGasPercentageMultiplier: 120,
          verificationGasLimitPercentageMultiplier: 120,
        }
      );

      const paymaster = new CandidePaymaster(paymasterUrl);
      const [userOperationSponsored, sponsorMetadata] =
        await paymaster.createSponsorPaymasterUserOperation(
          userOperation,
          bundlerUrl
        );
      setGasSponsor(sponsorMetadata);
      userOperation = userOperationSponsored;

      const bundlerResponse = await signAndSendUserOp(
        safeAccount,
        userOperation,
        passkey,
        chainId
      );

      setUserOpHash(bundlerResponse.userOperationHash);

      const receipt = await bundlerResponse.included();
      if (receipt.success) {
        setTxHash(receipt.receipt.transactionHash);
        setUserOpHash("");
      } else {
        setError("User operation execution failed");
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unknown error");
    }

    setLoadingTx(false);
  };

  return (
    <div className="card">
      {userOpHash && (
        <p>
          Your account setup is in progress. Sponsored by{" "}
          {gasSponsor?.name}
          <a
            href={gasSponsor?.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ marginLeft: "5px" }}
          >
            <img
              src={gasSponsor?.icons[0]}
              alt="logo"
              style={{
                width: "25px",
                height: "25px",
                verticalAlign: "middle",
              }}
            />
          </a>
          <br />
          Track on{" "}
          <a
            target="_blank"
            href={`https://${chainName.toLowerCase()}.blockscout.com/op/${userOpHash}`}
          >
            explorer
          </a>
        </p>
      )}
      {txHash && (
        <>
          <p>
            NFT minted successfully!
            <br />
            <a
              target="_blank"
              href={`https://${chainName}.blockscout.com/tx/${txHash}`}
            >
              View on explorer
            </a>
          </p>
        </>
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
      {error && <p>Error: {error}</p>}
    </div>
  );
}

export { SafeCard };
