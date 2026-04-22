# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with Vite
- `npm run build` - Build for production (runs TypeScript check then Vite build)
- `npm run preview` - Preview production build locally

## Architecture Overview

React + TypeScript + Vite app demonstrating WebAuthn passkeys as the owner of a Safe Account on Arbitrum Sepolia, with paymaster-sponsored gas.

### File layout

- **src/App.tsx** - Top-level wiring; manages the passkey in local storage
- **src/components/**
  - `PasskeyCard.tsx` - "Create passkey" button / account-address display
  - `SafeCard.tsx` - Mint-NFT flow; models progress with a discriminated `Step` union
  - `FaqCard.tsx` - Static FAQ
- **src/logic/**
  - `config.ts` - Validated env-var loading (`chainId: bigint`, etc.)
  - `passkeys.ts` - `ox/WebAuthnP256` credential creation + local-storage shape
  - `userOp.ts` - Signs a UserOperation with a WebAuthn passkey and sends it to the bundler; takes `chainId` + `bundlerUrl` as explicit args
  - `storage.ts` - `localStorage` helpers with bigint-safe JSON
- **src/hooks/useLocalStorageState.ts** - `useState` mirrored to `localStorage`

### Key Dependencies

- **abstractionkit** - Safe account abstraction, `SafeAccountV0_3_0`, `CandidePaymaster`
- **ox** (^0.8.4) - WebAuthn P-256 credential creation and signing
- **react-faq-component** - FAQ UI

### Environment Configuration

Required (`src/logic/config.ts` throws at module load if missing):
- `VITE_CHAIN_ID` - Target chain id
- `VITE_CHAIN_NAME` - Chain slug for block-explorer URLs
- `VITE_BUNDLER_URL` - ERC-4337 bundler RPC
- `VITE_JSON_RPC_PROVIDER` - JSON-RPC endpoint
- `VITE_PAYMASTER_URL` - Paymaster RPC

Default `.env.example` targets Arbitrum Sepolia with public Candide endpoints.

### WebAuthn Integration

- P-256 (secp256r1) via the ox library
- `createCredential`: `residentKey: 'required'`, `userVerification: 'required'`, no `authenticatorAttachment` restriction — works with both platform authenticators (Touch ID, Face ID) and cross-platform ones (security keys, password managers)
- Stored per passkey: `id` and `pubkeyCoordinates: { x: bigint, y: bigint }`

### Safe Account Integration

- Owner = WebAuthn public-key coordinates (one signer, threshold 1)
- Signing path: `getUserOperationEip712Hash` → `ox.sign` → `createWebAuthnSignature` → `formatSignaturesToUseroperationSignature`
- Sponsorship: `CandidePaymaster.createSponsorPaymasterUserOperation(smartAccount, userOp, bundlerUrl)` (note: `smartAccount` is the first arg since abstractionkit 0.3.0)

### UserOp Flow (SafeCard mint)

1. Derive `accountAddress` from the passkey's public-key coords (pure; no network call).
2. Build the `mint(address)` MetaTransaction targeting the demo NFT contract.
3. `SafeAccount.initializeNewAccount([pubkeyCoords])` → `createUserOperation(...)`.
4. Sponsor via `CandidePaymaster`.
5. Hash with `getUserOperationEip712Hash`, sign via WebAuthn, format and attach.
6. `sendUserOperation` → poll `included()` for the receipt.

SafeCard models the above as a `Step` union (`idle | preparing | pending | success | error`); the render branches on `step.kind`.
