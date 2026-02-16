export interface ChainConfig {
  chainId: bigint;
  bundlerUrl: string;
  jsonRpcProvider: string;
  chainName: string;
  explorerUrl: string;
}

function loadChains(): ChainConfig[] {
  const result: ChainConfig[] = [];

  for (let n = 1; ; n++) {
    const id = import.meta.env[`VITE_CHAIN${n}_ID`];
    const bundlerUrl = import.meta.env[`VITE_CHAIN${n}_BUNDLER_URL`];
    const jsonRpcProvider = import.meta.env[`VITE_CHAIN${n}_JSON_RPC_PROVIDER`];

    if (!id || !bundlerUrl || !jsonRpcProvider) break;

    result.push({
      chainId: BigInt(id),
      bundlerUrl,
      jsonRpcProvider,
      chainName: (import.meta.env[`VITE_CHAIN${n}_NAME`] as string) ?? '',
      explorerUrl: (import.meta.env[`VITE_CHAIN${n}_EXPLORER_URL`] as string) ?? '',
    });
  }

  return result;
}

export const chains: ChainConfig[] = loadChains();
