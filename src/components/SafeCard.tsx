import { useMemo, useState } from "react";
import {
	SafeAccountV0_3_0 as SafeAccount,
	getFunctionSelector,
	createCallData,
	CandidePaymaster,
} from "abstractionkit";
import type { MetaTransaction } from "abstractionkit";

import type { PasskeyLocalStorageFormat } from "../logic/passkeys";
import { signAndSendUserOp } from "../logic/userOp";
import {
	chainId,
	chainName,
	bundlerUrl,
	jsonRpcProvider,
	paymasterUrl,
} from "../logic/config";

type SponsorMetadata = {
	name: string;
	description: string;
	url: string;
	icons: string[];
};

type Step =
	| { kind: "idle" }
	| { kind: "preparing" }
	| { kind: "pending"; userOpHash: string; sponsor?: SponsorMetadata }
	| { kind: "success"; txHash: string }
	| { kind: "error"; message: string };

function SafeCard({ passkey }: { passkey: PasskeyLocalStorageFormat }) {
	const [step, setStep] = useState<Step>({ kind: "idle" });

	const accountAddress = useMemo(
		() => SafeAccount.createAccountAddress([passkey.pubkeyCoordinates]),
		[passkey.pubkeyCoordinates],
	);

	const handleMintNFT = async () => {
		setStep({ kind: "preparing" });

		const nftContractAddress = "0x9a7af758aE5d7B6aAE84fe4C5Ba67c041dFE5336";
		const mintFunctionSelector = getFunctionSelector("mint(address)");
		const mintTransaction: MetaTransaction = {
			to: nftContractAddress,
			value: 0n,
			data: createCallData(mintFunctionSelector, ["address"], [accountAddress]),
		};

		const safeAccount = SafeAccount.initializeNewAccount([
			passkey.pubkeyCoordinates,
		]);

		try {
			const unsignedOp = await safeAccount.createUserOperation(
				[mintTransaction],
				jsonRpcProvider,
				bundlerUrl,
				{
					expectedSigners: [passkey.pubkeyCoordinates],
					preVerificationGasPercentageMultiplier: 120,
					verificationGasLimitPercentageMultiplier: 120,
				},
			);

			const paymaster = new CandidePaymaster(paymasterUrl);
			const [sponsoredOp, sponsor] =
				await paymaster.createSponsorPaymasterUserOperation(
					safeAccount,
					unsignedOp,
					bundlerUrl,
				);

			const bundlerResponse = await signAndSendUserOp(
				safeAccount,
				sponsoredOp,
				passkey,
				chainId,
				bundlerUrl,
			);
			setStep({
				kind: "pending",
				userOpHash: bundlerResponse.userOperationHash,
				sponsor,
			});

			const receipt = await bundlerResponse.included();
			if (receipt && receipt.success) {
				setStep({ kind: "success", txHash: receipt.receipt.transactionHash });
			} else {
				setStep({ kind: "error", message: "UserOperation execution failed" });
			}
		} catch (err) {
			console.error(err);
			const message = err instanceof Error ? err.message : "Unknown error";
			setStep({ kind: "error", message });
		}
	};

	return (
		<div className="card">
			{step.kind === "pending" && (
				<p>
					Your account setup is in progress. This operation gas is sponsored by{" "}
					{step.sponsor?.name}
					<a
						href={step.sponsor?.url}
						target="_blank"
						rel="noopener noreferrer"
						style={{ marginLeft: "5px" }}
					>
						<img
							src={step.sponsor?.icons[0]}
							alt="logo"
							style={{ width: "25px", height: "25px", verticalAlign: "middle" }}
						/>
					</a>
					<br />
					<br />
					Track your operation on{" "}
					<a
						target="_blank"
						rel="noopener noreferrer"
						href={`https://${chainName.toLowerCase()}.blockscout.com/op/${step.userOpHash}`}
					>
						the block explorer
					</a>
				</p>
			)}

			{step.kind === "success" && (
				<>
					You collected an NTF, secured with your Safe Account & authenticated
					by your Device Passkeys.
					<br />
					<br />
					View more on{" "}
					<a
						target="_blank"
						rel="noopener noreferrer"
						href={`https://${chainName}.blockscout.com/tx/${step.txHash}`}
					>
						the block explorer
					</a>
					<br />
				</>
			)}

			{step.kind === "preparing" && <p>"Preparing transaction.."</p>}

			{(step.kind === "idle" || step.kind === "success" || step.kind === "error") && (
				<div className="card">
					<br />
					<button onClick={handleMintNFT}>Mint NFT</button>
				</div>
			)}

			{step.kind === "error" && (
				<div className="card">
					<p>Error: {step.message}</p>
				</div>
			)}
		</div>
	);
}

export { SafeCard };
