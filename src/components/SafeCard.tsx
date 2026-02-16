import { useState, useEffect, useCallback, useMemo } from "react";
import {
	SafeMultiChainSigAccount as SafeAccount,
	AllowAllPaymaster,
	MetaTransaction,
	SocialRecoveryModule,
	SocialRecoveryModuleGracePeriodSelector
} from "abstractionkit";
import { generatePrivateKey, privateKeyToAddress } from "viem/accounts";

import { PasskeyLocalStorageFormat } from "../logic/passkeys";
import { signAndSendMultiChainUserOps } from "../logic/userOp";
import { getItem } from "../logic/storage";
import { chains } from "../logic/chains";

type Step = "idle" | "preparing" | "signing" | "pending" | "success";
type Tab = "signers" | "guardians";

interface ChainResult {
	userOpHash?: string;
	txHash?: string;
	error?: string;
}

interface ActionSummary {
	type: "add" | "remove";
	address: string;
	tab: Tab;
}

const ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/;

function SafeCard({ passkey }: { passkey: PasskeyLocalStorageFormat }) {
	const [owners, setOwners] = useState<string[]>([]);
	const [guardians, setGuardians] = useState<string[]>([]);
	const [moduleEnabled, setModuleEnabled] = useState(false);
	const [chainResults, setChainResults] = useState<ChainResult[]>(
		() => chains.map(() => ({})),
	);
	const [step, setStep] = useState<Step>("idle");
	const [error, setError] = useState<string>();
	const [actionSummary, setActionSummary] = useState<ActionSummary>();
	const [activeTab, setActiveTab] = useState<Tab>("signers");
	const [customAddress, setCustomAddress] = useState("");
	const [showCustomInput, setShowCustomInput] = useState(false);

	const accountAddress = getItem("accountAddress") as string;

	const passkeySignerAddress = useMemo(
		() =>
			SafeAccount.createWebAuthnSignerVerifierAddress(
				passkey.pubkeyCoordinates.x,
				passkey.pubkeyCoordinates.y,
			).toLowerCase(),
		[passkey.pubkeyCoordinates],
	);

	const socialRecoveryModule = useMemo(() => new SocialRecoveryModule(SocialRecoveryModuleGracePeriodSelector.After3Minutes), []);

	const fetchOwners = useCallback(async () => {
		if (!accountAddress) return;
		try {
			const safeAccount = new SafeAccount(accountAddress);
			const result = await safeAccount.getOwners(chains[0].jsonRpcProvider);
			setOwners(result);
		} catch {
			// Safe not deployed yet
		}
	}, [accountAddress]);

	const fetchGuardians = useCallback(async () => {
		if (!accountAddress) return;
		try {
			const safeAccount = new SafeAccount(accountAddress);
			const enabled = await safeAccount.isModuleEnabled(
				chains[0].jsonRpcProvider,
				socialRecoveryModule.moduleAddress,
			);
			setModuleEnabled(enabled);

			if (enabled) {
				const result = await socialRecoveryModule.getGuardians(
					chains[0].jsonRpcProvider,
					accountAddress,
				);
				setGuardians(result);
			} else {
				setGuardians([]);
			}
		} catch {
			setModuleEnabled(false);
			setGuardians([]);
		}
	}, [accountAddress, socialRecoveryModule]);

	useEffect(() => {
		fetchOwners();
		fetchGuardians();
	}, [fetchOwners, fetchGuardians]);

	const executeMultiChainOp = async (
		buildTxs: (
			safeAccount: InstanceType<typeof SafeAccount>,
		) => Promise<MetaTransaction[][]>,
	) => {
		setStep("preparing");
		setError(undefined);
		setChainResults(chains.map(() => ({})));

		const safeAccount = SafeAccount.initializeNewAccount([
			passkey.pubkeyCoordinates,
		]);

		const allTransactions = await buildTxs(safeAccount);

		const paymaster = new AllowAllPaymaster();
		const paymasterFields = await Promise.all(
			chains.map((chain) => paymaster.getPaymasterFieldsInitValues(chain.chainId)),
		);

		const userOps = await Promise.all(
			chains.map((chain, i) =>
				safeAccount.createUserOperation(
					allTransactions[i],
					chain.jsonRpcProvider,
					chain.bundlerUrl,
					{
						...paymasterFields[i],
						expectedSigners: [passkey.pubkeyCoordinates],
						isMultiChainSignature: true,
						preVerificationGasPercentageMultiplier: 150,
						verificationGasLimitPercentageMultiplier: 150,
					},
				),
			),
		);

		setStep("signing");

		const responses = await signAndSendMultiChainUserOps(
			chains.map((chain, i) => ({
				userOp: userOps[i],
				chainId: chain.chainId,
				bundlerUrl: chain.bundlerUrl,
			})),
			passkey,
		);

		setStep("pending");
		setChainResults(
			responses.map((r) => ({ userOpHash: r.userOperationHash })),
		);

		const promises = responses.map((response, i) =>
			response.included().then((receipt) => {
				setChainResults((prev) => {
					const next = [...prev];
					if (receipt.success) {
						next[i] = { ...next[i], txHash: receipt.receipt.transactionHash };
					} else {
						next[i] = { ...next[i], error: "Execution failed" };
					}
					return next;
				});
			}),
		);

		await Promise.all(promises);
		setStep("success");
		await fetchOwners();
		await fetchGuardians();
	};

	const resolveAddress = (): string | null => {
		if (showCustomInput) {
			const addr = customAddress.trim();
			if (!ADDRESS_REGEX.test(addr)) {
				setError("Please enter a valid Ethereum address (0x...)");
				return null;
			}
			return addr;
		}
		return privateKeyToAddress(generatePrivateKey());
	};

	const handleAddSigner = async () => {
		const signerAddress = resolveAddress();
		if (!signerAddress) return;

		setActionSummary({ type: "add", address: signerAddress, tab: "signers" });
		setCustomAddress("");
		setShowCustomInput(false);

		try {
			await executeMultiChainOp(async (safeAccount) => {
				const txsPerChain = await Promise.all(
					chains.map((chain) =>
						safeAccount.createAddOwnerWithThresholdMetaTransactions(
							signerAddress,
							1,
							{ nodeRpcUrl: chain.jsonRpcProvider },
						),
					),
				);
				return txsPerChain;
			});
		} catch (err) {
			if (err instanceof Error) {
				console.log(err);
				setError(err.message);
			} else {
				setError("Unknown error");
			}
			setStep("idle");
		}
	};

	const handleRemoveSigner = async (signerToRemove: string) => {
		setActionSummary({ type: "remove", address: signerToRemove, tab: "signers" });

		try {
			await executeMultiChainOp(async (safeAccount) => {
				const txsPerChain = await Promise.all(
					chains.map((chain) =>
						safeAccount.createRemoveOwnerMetaTransaction(
							chain.jsonRpcProvider,
							signerToRemove,
							1,
						).then((tx) => [tx]),
					),
				);
				return txsPerChain;
			});
		} catch (err) {
			if (err instanceof Error) {
				console.log(err);
				setError(err.message);
			} else {
				setError("Unknown error");
			}
			setStep("idle");
		}
	};

	const handleAddGuardian = async () => {
		const guardianAddress = resolveAddress();
		if (!guardianAddress) return;

		setActionSummary({ type: "add", address: guardianAddress, tab: "guardians" });
		setCustomAddress("");
		setShowCustomInput(false);

		try {
			await executeMultiChainOp(async () => {
				const newThreshold = BigInt(guardians.length + 1);
				const addGuardianTx =
					socialRecoveryModule.createAddGuardianWithThresholdMetaTransaction(
						guardianAddress,
						newThreshold,
					);

				if (!moduleEnabled) {
					const enableTx =
						socialRecoveryModule.createEnableModuleMetaTransaction(
							accountAddress,
						);
					return chains.map(() => [enableTx, addGuardianTx]);
				}

				return chains.map(() => [addGuardianTx]);
			});
		} catch (err) {
			if (err instanceof Error) {
				console.log(err);
				setError(err.message);
			} else {
				setError("Unknown error");
			}
			setStep("idle");
		}
	};

	const handleRemoveGuardian = async (guardianToRemove: string) => {
		setActionSummary({ type: "remove", address: guardianToRemove, tab: "guardians" });

		try {
			const newThreshold = BigInt(guardians.length - 1);

			await executeMultiChainOp(async () => {
				const txsPerChain = await Promise.all(
					chains.map((chain) =>
						socialRecoveryModule
							.createRevokeGuardianWithThresholdMetaTransaction(
								chain.jsonRpcProvider,
								accountAddress,
								guardianToRemove,
								newThreshold,
							)
							.then((tx) => [tx]),
					),
				);
				return txsPerChain;
			});
		} catch (err) {
			if (err instanceof Error) {
				console.log(err);
				setError(err.message);
			} else {
				setError("Unknown error");
			}
			setStep("idle");
		}
	};

	const cosigners = owners.filter(
		(o) => o.toLowerCase() !== passkeySignerAddress,
	);

	const renderChainStatusCard = (
		chainIndex: number,
		result: ChainResult,
	) => {
		const chain = chains[chainIndex];
		const isPending = result.userOpHash && !result.txHash && !result.error;
		const isSuccess = !!result.txHash;
		const isError = !!result.error;

		let statusClass = "";
		if (isPending) statusClass = "pending";
		else if (isSuccess) statusClass = "success";
		else if (isError) statusClass = "error";

		return (
			<div key={chainIndex} className="chain-status-card">
				<strong>{chain.chainName}</strong>
				<div className="chain-status-row">
					<span className={`status-dot ${statusClass}`} />
					<span>
						{isPending && "Pending..."}
						{isSuccess && "Confirmed"}
						{isError && result.error}
					</span>
				</div>
				{isSuccess && result.txHash && (
					<a
						className="chain-track-link"
						target="_blank"
						href={`${chain.explorerUrl}/tx/${result.txHash}`}
					>
						View transaction ↗
					</a>
				)}
			</div>
		);
	};

	const actionLabel = actionSummary
		? actionSummary.tab === "signers"
			? actionSummary.type === "add" ? "Signer added" : "Signer removed"
			: actionSummary.type === "add" ? "Guardian added" : "Guardian removed"
		: "";

	const handleAdd = activeTab === "signers" ? handleAddSigner : handleAddGuardian;
	const addLabel = activeTab === "signers"
		? "Add Signer Across All Chains"
		: "Add Recovery Guardian Across All Chains";

	const renderAddressInput = () => (
		<div className="address-input-section">
			{showCustomInput ? (
				<div className="address-input-row">
					<input
						type="text"
						className="address-input"
						placeholder="0x..."
						value={customAddress}
						onChange={(e) => setCustomAddress(e.target.value)}
					/>
					<button
						className="primary-button"
						onClick={handleAdd}
						disabled={!customAddress.trim()}
					>
						{addLabel}
					</button>
					<button
						className="secondary-button"
						onClick={() => { setShowCustomInput(false); setCustomAddress(""); setError(undefined); }}
					>
						Cancel
					</button>
				</div>
			) : (
				<div className="address-input-actions">
					<button className="primary-button" onClick={handleAdd}>
						{addLabel}
					</button>
					<button
						className="secondary-button"
						onClick={() => setShowCustomInput(true)}
					>
						Use custom address
					</button>
				</div>
			)}
		</div>
	);

	return (
		<div className="card action-card">
			{step === "idle" && accountAddress && (
				<>
					<div className="tab-bar">
						<button
							className={`tab-button ${activeTab === "signers" ? "tab-active" : ""}`}
							onClick={() => { setActiveTab("signers"); setError(undefined); setShowCustomInput(false); setCustomAddress(""); }}
						>
							Authorized Signers
						</button>
						<button
							className={`tab-button ${activeTab === "guardians" ? "tab-active" : ""}`}
							onClick={() => { setActiveTab("guardians"); setError(undefined); setShowCustomInput(false); setCustomAddress(""); }}
						>
							Recovery Guardians
						</button>
					</div>

					{activeTab === "signers" && (
						<>
							<div className="owner-list">
								<div className="owner-item">
									<span className="owner-label">Passkey (you)</span>
								</div>
								{cosigners.map((cosigner) => (
									<div key={cosigner} className="owner-item">
										<code className="owner-item-address">{cosigner}</code>
										<button
											className="remove-button"
											onClick={() => handleRemoveSigner(cosigner)}
										>
											Remove
										</button>
									</div>
								))}
							</div>
							<p className="action-description">
								Add or remove authorized signers across all chains. For shared business accounts.
							</p>
							{renderAddressInput()}
						</>
					)}

					{activeTab === "guardians" && (
						<>
							<div className="owner-list">
								{guardians.map((guardian) => (
									<div key={guardian} className="owner-item">
										<code className="owner-item-address">{guardian}</code>
										<button
											className="remove-button"
											onClick={() => handleRemoveGuardian(guardian)}
										>
											Remove
										</button>
									</div>
								))}
							</div>
							<p className="action-description">
								Set up account recovery across all chains.
								<br />
								<br />
								Guardians can be friends, family, a hardware wallet, or a service like Candide Guardian (email/SMS recovery). Configured once, enforced everywhere.
							</p>
							{renderAddressInput()}
						</>
					)}
				</>
			)}

			{step === "preparing" && (
				<p className="step-label">Preparing multichain operations…</p>
			)}

			{step === "signing" && (
				<p className="step-label">Authenticate with your passkey…</p>
			)}

			{(step === "pending" || step === "success") && (
				<>
					{step === "success" && actionSummary && (
						<div className="success-banner">
							<p>
								{actionLabel} across {chains.length} chains with a single signature
							</p>
							<code className="owner-address">
								{actionSummary.address}
							</code>
						</div>
					)}
					<div className="chain-results">
						{chainResults.map((result, i) =>
							renderChainStatusCard(i, result),
						)}
					</div>
					{step === "success" && (
						<>
							<div className="completion-metrics">
								<div className="metric">
									<span className="metric-value">1</span>
									<span className="metric-label">signature</span>
								</div>
								<div className="metric">
									<span className="metric-value">{chains.length}</span>
									<span className="metric-label">chains updated</span>
								</div>
							</div>
							<p className="metric-contrast">
								Without Unified Account: {chains.length} separate signatures, {chains.length} gas payments
							</p>
							<button
								className="primary-button"
								style={{ marginTop: "1rem" }}
								onClick={() => setStep("idle")}
							>
								Back to Account
							</button>
						</>
					)}
				</>
			)}

			{error && (
				<div className="error-message">
					<p>Error: {error}</p>
				</div>
			)}
		</div>
	);
}

export { SafeCard };
