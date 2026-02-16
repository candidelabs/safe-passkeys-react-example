import Faq from "react-faq-component";

const data = {
	title: "Frequently Asked Questions",
	rows: [
		{
			title: "What is Safe Unified Account?",
			content: (
				<p>
					Safe Unified Account gives your users a single smart account
					across every EVM chain. Sign once, execute everywhere. Your user
					signs a single transaction that executes across multiple chains
					simultaneously. This is user-driven: each multichain action is
					an intentional operation, not automatic background syncing. Use cases
					include managing signers and recovery across chains, consolidating
					USDC balances from multiple chains to one destination, or depositing
					assets into protocols like Aave for the best yield.
				</p>
			),
		},
		{
			title: "What operations work multichain?",
			content: (
				<p>
					Any account management operation: add or remove authorized signers,
					set up recovery guardians (friends, family, hardware wallets, or
					services like Candide Guardian for email/SMS recovery), enable
					modules, change signing thresholds. In this demo, you can manage
					signers and configure account recovery across all chains with a
					single tap. Configure once, enforced everywhere.
				</p>
			),
		},
		{
			title: "How long does integration take?",
			content: (
				<p>
					The{" "}
					<a
						href="https://docs.candide.dev/account-abstraction/research/safe-unified-account/"
						target="_blank"
					>
						AbstractionKit SDK
					</a>{" "}
					provides a simple API surface: initialize an account, build
					transactions, sign once, send. The multichain demo you're looking at
					is under 200 lines of logic. Most teams can go from zero to a working
					prototype within a few days.
				</p>
			),
		},
		{
			title: "What chains are supported?",
			content: (
				<p>
					Safe Unified Account works across EVM-compatible chains. This demo
					runs on Ethereum Sepolia, Optimism Sepolia, and Arbitrum Sepolia.
					Mainnet support covers Ethereum, Optimism, Arbitrum, Base, Polygon,
					and more. See the{" "}
					<a
						href="https://docs.candide.dev/wallet/bundler/rpc-endpoints/"
						target="_blank"
					>
						docs
					</a>{" "}
					for the full list.
				</p>
			),
		},
		{
			title: "What about stablecoin transfers?",
			content: (
				<p>
					Multichain token transfers, including a unified stablecoin balance
					across all chains, are coming with the Ethereum Interoperability Layer
					(EIL). Once live, your users will see and spend from a single
					aggregated balance without manual bridging. Unified Account is
					designed for this from day one.
				</p>
			),
		},
		{
			title: "Is this production ready?",
			content: (
				<p>
					We are actively seeking feedback from integration partners before
					finalizing the audit. The SDK and protocol are functional on testnets
					today. If you're exploring this for production, we'd love to hear your
					requirements.{" "}
					<a href="https://cal.com/candidelabs/30mins" target="_blank">
						Schedule a call
					</a>{" "}.
				</p>
			),
		},
		{
			title: "How does the single signature work?",
			content: (
				<p>
					The system computes a Merkle root from the EIP-712 hashes of
					UserOperations on each target chain. Your user signs this single hash
					with their passkey. The signature is then expanded into per-chain
					proofs, so each chain's contract can independently verify against the
					shared root. One biometric prompt, every chain updated.
				</p>
			),
		},
		{
			title: "What are passkeys?",
			content: (
				<p>
					Passkeys use your device's biometric authentication (Touch ID, Face ID)
					or security keys to sign transactions. WebAuthn P-256 signatures are
					verified directly on-chain via EIP-7212 — no custodial intermediary.
					Your user's private key never leaves their device.
				</p>
			),
		},
	],
};

const styles = {
	bgColor: "#181818",
	titleTextColor: "white",
	rowTitleColor: "white",
	rowContentColor: "rgba(255, 255, 255, 0.7)",
	arrowColor: "white",
};

const config = {
	animate: true,
	arrowIcon: "v",
};

function FaqCard() {
	return (
		<div
			style={{
				maxWidth: "750px",
				margin: "70px auto 0 auto",
				bottom: "0",
				width: "100%",
			}}
		>
			<Faq data={data} styles={styles} config={config} />
		</div>
	);
}

export { FaqCard };
