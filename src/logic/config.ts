function must(key: string): string {
	const value = import.meta.env[key];
	if (!value) {
		throw new Error(`Missing required env var: ${key}`);
	}
	return value;
}

export const chainId = BigInt(must("VITE_CHAIN_ID"));
export const chainName = must("VITE_CHAIN_NAME");
export const bundlerUrl = must("VITE_BUNDLER_URL");
export const jsonRpcProvider = must("VITE_JSON_RPC_PROVIDER");
export const paymasterUrl = must("VITE_PAYMASTER_URL");
