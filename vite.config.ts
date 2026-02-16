import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'

const REQUIRED_PER_CHAIN = ['ID', 'BUNDLER_URL', 'JSON_RPC_PROVIDER']

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())

  // Detect configured chains and validate required vars
  let chainCount = 0
  for (let n = 1; ; n++) {
    const hasId = !!env[`VITE_CHAIN${n}_ID`]
    if (!hasId) break

    for (const suffix of REQUIRED_PER_CHAIN) {
      const key = `VITE_CHAIN${n}_${suffix}`
      if (!env[key]) {
        throw new Error(`Environment variable ${key} is missing`)
      }
    }
    chainCount++
  }

  if (chainCount < 2) {
    throw new Error(
      `At least 2 chains must be configured. Found ${chainCount}. ` +
      'Set VITE_CHAIN1_ID, VITE_CHAIN1_BUNDLER_URL, VITE_CHAIN1_JSON_RPC_PROVIDER (and same for CHAIN2+).'
    )
  }

  return {
    plugins: [react()],
  }
})
