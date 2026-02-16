import { useState } from "react";

const faqItems = [
	{
		question: "What is Safe Unified Account?",
		answer: (
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
		question: "What operations work multichain?",
		answer: (
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
		question: "How long does integration take?",
		answer: (
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
		question: "What chains are supported?",
		answer: (
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
		question: "What about stablecoin transfers?",
		answer: (
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
		question: "Is this production ready?",
		answer: (
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
		question: "How does the single signature work?",
		answer: (
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
		question: "What are passkeys?",
		answer: (
			<p>
				Passkeys use your device's biometric authentication (Touch ID, Face ID)
				or security keys to sign transactions. WebAuthn P-256 signatures are
				verified directly on-chain via EIP-7212 — no custodial intermediary.
				Your user's private key never leaves their device.
			</p>
		),
	},
];

function FaqCard() {
	const [openIndex, setOpenIndex] = useState<number | null>(null);

	return (
		<div className="faq-section">
			<h2 className="faq-title">Frequently Asked Questions</h2>
			<div className="faq-list">
				{faqItems.map((item, i) => (
					<div
						key={i}
						className={`faq-item ${openIndex === i ? "faq-open" : ""}`}
					>
						<button
							className="faq-question"
							onClick={() => setOpenIndex(openIndex === i ? null : i)}
						>
							<span>{item.question}</span>
							<span className="faq-chevron">+</span>
						</button>
						{openIndex === i && (
							<div className="faq-answer">{item.answer}</div>
						)}
					</div>
				))}
			</div>
		</div>
	);
}

export { FaqCard };
