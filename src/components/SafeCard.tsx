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
import { getItem } from "../logic/storage";
import { createPublicClient, http, formatUnits, parseUnits } from 'viem';
import { getCode, readContract } from 'viem/actions';


const jsonRPCProvider = import.meta.env.VITE_JSON_RPC_PROVIDER;
const bundlerUrl = import.meta.env.VITE_BUNDLER_URL;
const paymasterUrl = import.meta.env.VITE_PAYMASTER_URL;
const chainId = import.meta.env.VITE_CHAIN_ID;
const chainName = import.meta.env.VITE_CHAIN_NAME as string;
const erc20TokenAddress = "0xd077A400968890Eacc75cdc901F0356c943e4fDb" as `0x${string}`;

// ERC-20 ABI for the functions we need
const ERC20_ABI = [
	{
		inputs: [],
		name: "name",
		outputs: [{ name: "", type: "string" }],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [],
		name: "symbol",
		outputs: [{ name: "", type: "string" }],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [],
		name: "decimals",
		outputs: [{ name: "", type: "uint8" }],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [{ name: "account", type: "address" }],
		name: "balanceOf",
		outputs: [{ name: "", type: "uint256" }],
		stateMutability: "view",
		type: "function"
	}
] as const;

function SafeCard({ passkey }: { passkey: PasskeyLocalStorageFormat }) {
	const [userOpHash, setUserOpHash] = useState<string>();
	const [deployed, setDeployed] = useState<boolean>(false);
	const [loadingTx, setLoadingTx] = useState<boolean>(false);
	const [error, setError] = useState<string>();
	const [txHash, setTxHash] = useState<string>();
	const [recipientAddress, setRecipientAddress] = useState<string>("");
	const [transferAmount, setTransferAmount] = useState<string>("");
	const [tokenBalance, setTokenBalance] = useState<string>("0");
	const [tokenName, setTokenName] = useState<string>("");
	const [tokenSymbol, setTokenSymbol] = useState<string>("");
	const [tokenDecimals, setTokenDecimals] = useState<number>(18);
	const [loadingTokenInfo, setLoadingTokenInfo] = useState<boolean>(false);
	const [gasSponsor, setGasSponsor] = useState<
		| {
			name: string;
			description: string;
			url: string;
			icons: string[];
		}
		| undefined
	>(undefined);

	const accountAddress = getItem("accountAddress") as string;
	const client = createPublicClient({
		transport: http(import.meta.env.VITE_JSON_RPC_PROVIDER),
	});

	const isDeployed = async () => {
		if (!accountAddress || !accountAddress.startsWith('0x')) {
			throw new Error(`Invalid address: ${accountAddress}`);
		}

		const safeCode = await getCode(client, {
			address: accountAddress as `0x${string}`
		});
		setDeployed(safeCode !== null && safeCode !== '0x');
	};

	const fetchTokenInfo = async () => {
		if (!accountAddress) return;

		setLoadingTokenInfo(true);
		try {
			// Fetch token info in parallel using viem readContract
			const [name, symbol, decimals, balance] = await Promise.all([
				readContract(client, {
					address: erc20TokenAddress,
					abi: ERC20_ABI,
					functionName: 'name',
				}),
				readContract(client, {
					address: erc20TokenAddress,
					abi: ERC20_ABI,
					functionName: 'symbol',
				}),
				readContract(client, {
					address: erc20TokenAddress,
					abi: ERC20_ABI,
					functionName: 'decimals',
				}),
				readContract(client, {
					address: erc20TokenAddress,
					abi: ERC20_ABI,
					functionName: 'balanceOf',
					args: [accountAddress as `0x${string}`],
				}),
			]);

			setTokenName(name as string);
			setTokenSymbol(symbol as string);
			setTokenDecimals(Number(decimals));
			setTokenBalance(formatUnits(balance as bigint, Number(decimals)));
		} catch (error) {
			console.error("Error fetching token info:", error);
			setTokenName("Unknown Token");
			setTokenSymbol("UNK");
			setTokenBalance("0");
		} finally {
			setLoadingTokenInfo(false);
		}
	};

	const handleTransferERC20 = async () => {
		if (!recipientAddress || !transferAmount) {
			setError("Please provide both recipient address and transfer amount");
			return;
		}

		// Validate transfer amount doesn't exceed balance
		if (parseFloat(transferAmount) > parseFloat(tokenBalance)) {
			setError(`Insufficient balance. Maximum: ${tokenBalance} ${tokenSymbol}`);
			return;
		}

		setLoadingTx(true);
		setTxHash("");
		setError("");

		// ERC-20 token transfer
		const transferFunctionSignature = "transfer(address,uint256)";
		const transferFunctionSelector = getFunctionSelector(transferFunctionSignature);

		// Convert amount to wei using actual token decimals
		const amountInWei = parseUnits(transferAmount, tokenDecimals);

		const transferTransactionCallData = createCallData(
			transferFunctionSelector,
			["address", "uint256"],
			[recipientAddress, amountInWei],
		);
		const transferTransaction: MetaTransaction = {
			to: erc20TokenAddress,
			value: 0n,
			data: transferTransactionCallData,
		};

		const safeAccount = SafeAccount.initializeNewAccount([
			passkey.pubkeyCoordinates,
		]);

		try {
			let userOperation = await safeAccount.createUserOperation(
				[transferTransaction],
				jsonRPCProvider,
				bundlerUrl,
				{
					expectedSigners: [passkey.pubkeyCoordinates],
					preVerificationGasPercentageMultiplier: 120,
					verificationGasLimitPercentageMultiplier: 120,
				},
			);

			let paymaster: CandidePaymaster = new CandidePaymaster(paymasterUrl);
			let [userOperationSponsored, sponsorMetadata] =
				await paymaster.createSponsorPaymasterUserOperation(
					userOperation,
					bundlerUrl,
				);
			setGasSponsor(sponsorMetadata);
			userOperation = userOperationSponsored;
			const bundlerResponse = await signAndSendUserOp(
				safeAccount,
				userOperation,
				passkey,
				chainId,
			);
			setUserOpHash(bundlerResponse.userOperationHash);
			let userOperationReceiptResult = await bundlerResponse.included();
			if (userOperationReceiptResult.success) {
				setTxHash(userOperationReceiptResult.receipt.transactionHash);
				console.log(
					"ERC-20 tokens transferred successfully. Transaction hash: " +
					userOperationReceiptResult.receipt.transactionHash,
				);
				setUserOpHash("");
				// Clear form after successful transfer
				setRecipientAddress("");
				setTransferAmount("");
				// Refresh token balance
				await fetchTokenInfo();
			} else {
				setError("User operation execution failed");
			}
		} catch (error) {
			if (error instanceof Error) {
				console.log(error);
				setError(error.message);
			} else {
				setError("Unknown error");
			}
		}
		setLoadingTx(false);
	};

	useEffect(() => {
		if (accountAddress) {
			async function initializeAccountInfo() {
				await isDeployed();
				await fetchTokenInfo();
			}
			initializeAccountInfo();
		}
	}, [deployed, accountAddress]);

	return (
		<div className="card">
			{userOpHash && (
				<p>
					Your account setup is in progress. This operation gas is sponsored by{" "}
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
							style={{ width: "25px", height: "25px", verticalAlign: "middle" }}
						/>
					</a>
					<br />
					<br />
					Track your operation on{" "}
					<a
						target="_blank"
						href={`https://${chainName.toLowerCase()}.etherscan.io/tx/${userOpHash}`}
					>
						the block explorer
					</a>
				</p>
			)}
			{txHash && (
				<>
					ERC-20 tokens transferred successfully! Transaction secured with your Safe Account & authenticated
					by your Device Passkeys.
					<br />
					<br />
					View more on{" "}
					<a
						target="_blank"
						href={`https://${chainName}.etherscan.io/tx/${txHash}`}
					>
						the block explorer
					</a>
					<br />
				</>
			)}
			{loadingTx && !userOpHash ? (
				<p>"Preparing transaction.."</p>
			) : (
				accountAddress && (
					<div className="card">
						<br />
						{/* Token Information Display */}
						<div style={{
							marginBottom: '20px',
							padding: '10px',
							backgroundColor: '#333',
							borderRadius: '8px',
							border: '1px solid #555'
						}}>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
								<h3 style={{ margin: '0', color: '#fff' }}>Token Information</h3>
								<button
									onClick={fetchTokenInfo}
									disabled={loadingTokenInfo}
									style={{
										padding: '4px 8px',
										fontSize: '0.8em',
										backgroundColor: '#555',
										color: '#fff',
										border: '1px solid #777',
										borderRadius: '4px',
										cursor: loadingTokenInfo ? 'not-allowed' : 'pointer'
									}}
								>
									{loadingTokenInfo ? '⟳' : '↻'} Refresh
								</button>
							</div>
							{loadingTokenInfo ? (
								<p style={{ margin: '5px 0', color: '#ccc' }}>Loading token information...</p>
							) : (
								<>
									<p style={{ margin: '5px 0', color: '#ccc' }}>
										<strong>Token:</strong> {tokenName} ({tokenSymbol})
									</p>
									<p style={{ margin: '5px 0', color: '#ccc' }}>
										<strong>Your Balance:</strong> {tokenBalance} {tokenSymbol}
									</p>
									<p style={{ margin: '5px 0', color: '#999', fontSize: '0.9em' }}>
										Chain: {chainName}
									</p>
								</>
							)}
						</div>

						{/* Transfer Form */}
						<div style={{ marginBottom: '10px' }}>
							<input
								type="text"
								placeholder="Recipient Address (0x...)"
								value={recipientAddress}
								onChange={(e) => setRecipientAddress(e.target.value)}
								style={{ width: '100%', padding: '8px', marginBottom: '8px' }}
								disabled={!!userOpHash}
							/>
							<input
								type="number"
								placeholder={`Amount (in ${tokenSymbol || 'tokens'})`}
								value={transferAmount}
								onChange={(e) => setTransferAmount(e.target.value)}
								style={{ width: '100%', padding: '8px' }}
								disabled={!!userOpHash}
								min="0"
								step="any"
								max={tokenBalance}
							/>
						</div>
						<button
							onClick={handleTransferERC20}
							disabled={!!userOpHash || !recipientAddress || !transferAmount || parseFloat(transferAmount || '0') > parseFloat(tokenBalance)}
						>
							Transfer {tokenSymbol || 'ERC-20'} Tokens
						</button>
						{parseFloat(transferAmount || '0') > parseFloat(tokenBalance) && transferAmount && (
							<p style={{ color: '#ff6b6b', fontSize: '0.9em', marginTop: '5px' }}>
								Insufficient balance. Maximum: {tokenBalance} {tokenSymbol}
							</p>
						)}
					</div>
				)
			)}{" "}
			{error && (
				<div className="card">
					<p>Error: {error}</p>
				</div>
			)}
		</div>
	);
}

export { SafeCard };
