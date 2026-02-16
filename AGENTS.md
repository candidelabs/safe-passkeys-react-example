# AGENTS.md

This file provides context to AI coding assistants working with this repository.

## Development Commands

- `npm run dev` — Start development server with Vite
- `npm run build` — Build for production (runs `tsc` then `vite build`)
- `npm run lint` — Run ESLint with TypeScript extensions
- `npm run preview` — Preview production build locally

## Project Structure

```
src/
├── App.tsx                       # Root component — passkey state, error handling
├── App.css / index.css           # Global styles (dark theme)
├── main.tsx                      # React entry point
├── utils.ts                      # hexStringToUint8Array helper
├── exports.d.ts                  # Ambient type declarations
├── vite-env.d.ts                 # Vite client types
├── components/
│   ├── PasskeyCard.tsx           # Account creation + address display with chain badges
│   ├── SafeCard.tsx              # Main action card — two tabs: Signers | Guardians
│   ├── CodeShowcase.tsx          # Collapsible multichain code snippet
│   ├── CtaCard.tsx               # CTA links (docs, source, schedule call)
│   └── FaqCard.tsx               # Educational FAQ section
├── hooks/
│   └── useLocalStorageState.ts   # Generic localStorage-backed React state hook
└── logic/
    ├── chains.ts                 # Dynamic N-chain config loader from env vars
    ├── passkeys.ts               # WebAuthn P-256 credential creation (ox library)
    ├── userOp.ts                 # Multichain UserOperation signing + submission
    └── storage.ts                # localStorage utilities with bigint serialization
```

## Architecture

React + Vite + TypeScript single-page app demonstrating **Safe Unified Account** — executing multichain operations with a single passkey signature.

**Key design decisions:**

- **logic/ separated from components/** — all blockchain interaction is in `logic/`, UI components only call into it
- **Dynamic N-chain configuration** — chains are loaded in a loop from numbered env vars (`VITE_CHAIN1_*`, `VITE_CHAIN2_*`, …); minimum 2 chains enforced at build time in `vite.config.ts`
- **Two-tab UI in SafeCard** — "Authorized Signers" (add/remove owners) and "Recovery Guardians" (social recovery module)
- **Per-chain status tracking** — each chain gets independent status (preparing → signing → pending → success) with userOpHash, txHash, and error states

### Component hierarchy

```
App.tsx
├── PasskeyCard          — create passkey or show account address + chain badges
├── SafeCard             — (shown after passkey exists) signer & guardian management
├── CodeShowcase         — collapsible pseudocode of the multichain flow
├── CtaCard              — links to docs, source, cal.com
└── FaqCard              — react-faq-component with dark theme
```

## Environment Variables

Pattern: `VITE_CHAIN{N}_*` where N starts at 1 and increments.

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_CHAIN{N}_ID` | Yes | Blockchain chain ID |
| `VITE_CHAIN{N}_BUNDLER_URL` | Yes | Bundler endpoint |
| `VITE_CHAIN{N}_JSON_RPC_PROVIDER` | Yes | JSON-RPC provider URL |
| `VITE_CHAIN{N}_NAME` | No | Human-readable name for UI |
| `VITE_CHAIN{N}_EXPLORER_URL` | No | Block explorer base URL |

Validation in `vite.config.ts` loops through chains and throws if any required var is missing or fewer than 2 chains are configured. Default setup targets Ethereum Sepolia + Optimism Sepolia with public Candide bundler endpoints.

## Key SDK Patterns

### Dependencies

| Package | Purpose |
|---------|---------|
| `abstractionkit` (^0.2.35) | Safe Unified Account SDK — account management, multichain signing, paymaster, social recovery |
| `ox` (^0.8.4) | WebAuthn P-256 credential creation and signing (`ox/WebAuthnP256`) |
| `viem` (^2.31.7) | Random address generation (`generatePrivateKey` + `privateKeyToAddress` from `viem/accounts`) |

### Multichain User Operation Flow

This is the core flow in `logic/userOp.ts` → `signAndSendMultiChainUserOps()`:

1. **Initialize account** — `SafeMultiChainSigAccount.initializeNewAccount([pubkeyCoordinates])`
2. **Build MetaTransactions** — e.g. `createAddOwnerWithThresholdMetaTransactions()` or guardian operations
3. **Create UserOperations per chain** — `safeAccount.createUserOperation(txs, rpc, bundler, { ...paymasterInitFields })` — paymaster init fields are spread into the options
4. **Compute Merkle root hash** — `SafeAccount.getMultiChainSingleSignatureUserOperationsEip712Hash(userOperationsToSign)`
5. **Sign once with WebAuthn** — single `ox/WebAuthnP256.sign({ challenge: multiChainHash })` call, one biometric prompt
6. **Expand to per-chain signatures** — `SafeAccount.formatSignaturesToUseroperationsSignatures(userOperationsToSign, [signerSignaturePair], { isInit })`
7. **Apply paymaster data AFTER signatures** — `AllowAllPaymaster.getApprovedPaymasterData(userOp)` (order matters: signatures must be set first)
8. **Send concurrently** — `Promise.all()` submitting all chains in parallel, then wait for inclusion

### Signer Management (SafeCard.tsx — Signers tab)

```typescript
// Add owner (returns MetaTransaction[])
safeAccount.createAddOwnerWithThresholdMetaTransactions(ownerAddress, threshold, { nodeRpcUrl })

// Remove owner (returns MetaTransaction)
safeAccount.createRemoveOwnerMetaTransaction(rpc, ownerAddress, threshold)

// Read current owners
safeAccount.getOwners(rpc)
```

### Social Recovery / Guardians (SafeCard.tsx — Guardians tab)

```typescript
const socialRecoveryModule = new SocialRecoveryModule(
  SocialRecoveryModuleGracePeriodSelector.After3Minutes
);

// Auto-enable module on first guardian add
socialRecoveryModule.createEnableModuleMetaTransaction(accountAddress)

// Add guardian
socialRecoveryModule.createAddGuardianWithThresholdMetaTransaction(guardian, threshold)

// Revoke guardian
socialRecoveryModule.createRevokeGuardianWithThresholdMetaTransaction(rpc, account, guardian, threshold)

// Read guardians
socialRecoveryModule.getGuardians(rpc, accountAddress)

// Check if module is enabled
safeAccount.isModuleEnabled(rpc, socialRecoveryModule.moduleAddress)
```

### WebAuthn / Passkeys (logic/passkeys.ts)

- **Create credential** — `ox/WebAuthnP256.createCredential({ name })` with `residentKey: 'required'`, `userVerification: 'required'`, no `authenticatorAttachment` (supports both platform and cross-platform authenticators)
- **Stored format** — `{ id: string, pubkeyCoordinates: { x: bigint, y: bigint } }`
- **Sign** — `ox/WebAuthnP256.sign({ challenge, credentialId })` — returns `{ metadata: { authenticatorData, clientDataJSON }, signature: { r, s } }`
- **Signature assembly** — `authenticatorData`, post-challenge `clientDataFields` (regex-extracted from clientDataJSON), and `[r, s]` are combined into `WebauthnSignatureData`

### Paymaster

```typescript
const paymaster = new AllowAllPaymaster();

// Step 1: Get init fields (spread into createUserOperation options)
const initFields = paymaster.getPaymasterFieldsInitValues(chainId);

// Step 2: After signatures are set, get approved data
paymaster.getApprovedPaymasterData(userOp);
```

## Key Files Reference

| File | Key export / responsibility |
|------|---------------------------|
| `src/logic/userOp.ts` | `signAndSendMultiChainUserOps()` — core multichain signing orchestrator |
| `src/logic/chains.ts` | `chains: ChainConfig[]` — dynamic chain config from env vars |
| `src/logic/passkeys.ts` | `createPasskey()`, `toLocalStorageFormat()` — WebAuthn credential management |
| `src/logic/storage.ts` | `setItem()`, `getItem()` — localStorage with bigint→hex serialization |
| `src/components/SafeCard.tsx` | Main UI — `executeMultiChainOp()`, signer/guardian tabs, per-chain status |
| `src/components/PasskeyCard.tsx` | Account creation, address display, chain explorer badges |
| `src/hooks/useLocalStorageState.ts` | `useLocalStorageState<T>()` — generic localStorage-backed hook |
| `vite.config.ts` | Build config + env var validation (enforces ≥ 2 chains) |
