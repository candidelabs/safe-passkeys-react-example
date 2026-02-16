import { useState } from "react";

function CodeShowcase() {
	const [open, setOpen] = useState(false);

	return (
		<div className="code-showcase">
			<button
				className="code-showcase-toggle"
				onClick={() => setOpen(!open)}
			>
				<span className={`code-showcase-arrow ${open ? "open" : ""}`}>
					▶
				</span>
				The code behind this demo
			</button>
			{open && (
				<div className="code-block">
					<pre>
						<span className="code-comment">{"// 1. Initialize account with passkey\n"}</span>
						<span className="code-keyword">{"const "}</span>
						{"account = SafeMultiChainSigAccount."}
						<span className="code-fn">{"initializeNewAccount"}</span>
						{"([pubkey]);\n\n"}
						<span className="code-comment">{"// 2. Create user operations for each chain\n"}</span>
						<span className="code-keyword">{"const "}</span>
						{"ops = "}
						<span className="code-keyword">{"await "}</span>
						{"Promise."}
						<span className="code-fn">{"all"}</span>
						{"(\n  chains."}
						<span className="code-fn">{"map"}</span>
						{"(chain => account."}
						<span className="code-fn">{"createUserOperation"}</span>
						{"(txs, chain))\n);\n\n"}
						<span className="code-comment">{"// 3. Compute multichain hash (Merkle root)\n"}</span>
						<span className="code-keyword">{"const "}</span>
						{"hash = SafeMultiChainSigAccount\n  ."}
						<span className="code-fn">{"getMultiChainSingleSignatureUserOperationsEip712Hash"}</span>
						{"(ops);\n\n"}
						<span className="code-comment">{"// 4. Sign once with passkey — single biometric prompt\n"}</span>
						<span className="code-keyword">{"const "}</span>
						{"signature = "}
						<span className="code-keyword">{"await "}</span>
						{"WebAuthnP256."}
						<span className="code-fn">{"sign"}</span>
						{"({ challenge: hash });\n\n"}
						<span className="code-comment">{"// 5. Expand to per-chain signatures and send\n"}</span>
						<span className="code-keyword">{"const "}</span>
						{"sigs = SafeMultiChainSigAccount\n  ."}
						<span className="code-fn">{"formatSignaturesToUseroperationsSignatures"}</span>
						{"(ops, [signature]);\n"}
						<span className="code-keyword">{"await "}</span>
						{"Promise."}
						<span className="code-fn">{"all"}</span>
						{"(ops."}
						<span className="code-fn">{"map"}</span>
						{"((op, i) => "}
						<span className="code-fn">{"sendUserOperation"}</span>
						{"(op, sigs[i])));"}
					</pre>
				</div>
			)}
		</div>
	);
}

export { CodeShowcase };
