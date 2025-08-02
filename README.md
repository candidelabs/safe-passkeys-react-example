# Safe Passkeys Demo — Frontend

A Vite + React TypeScript demo that shows how to:

- Blockchain-safe account abstraction using `viem`, `ox` and Candide's `abstractionkit`.
- Create and **store** a WebAuthn-based passkey (credential) paired with an on-chain account address and a username.
- **Login** by username and re-use your passkey (no re-registration).
- **Mint an NFT** via a sponsored EIP-4337 UserOperation, all signed with your passkey.

You can adapt this UI to **any backend** or dataset that exposes these endpoints:

```ts
export type UserRecord = {
  id: number;
  account_address: string;               // on-chain account address
  username: string;                      // user’s display name
  pubkey_id: string;                     // passkey’s credential ID
  pubkey_coordinates: { x: string; y: string };  // raw hex strings
  timestamp: string;
  created_at: string;
  updated_at: string;
};
````

And if you prefer to use PostgreSQL, there’s a ready-made server you can point at:

> 🔗 [https://github.com/candidelabs/simple-passkeys-server](https://github.com/candidelabs/simple-passkeys-server)

---

### 📦 Quickstart

1. **Clone & install**

   ```bash
   cd safe-passkey-react-example
   npm install
   ```

2. **Configure**
   Copy & edit your env:

   ```bash
   cp .env.example .env
   ```

 Edit `.env` to configure the following:

* **Default Network:** Arbitrum Sepolia
* **VITE\_API\_BASE\_URL:** e.g. `http://localhost:3000`
* **VITE\_BUNDLER\_URL** / **VITE\_PAYMASTER\_URL**: default to public Candide endpoints or get your own from [Candide Dashboard](https://dashboard.candide.dev/)


3. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:5173](http://localhost:5173)

---

### 🚀 Features

* **Passkey creation** & storage on your DB.
* **Passwordless login** via WebAuthn.
* **Gasless minting** with EIP-4337 UserOperations and Candide Paymaster.

---

### 📚 Links

* Safe Passkeys Docs: [https://docs.candide.dev/wallet/plugins/passkeys/](https://docs.candide.dev/wallet/plugins/passkeys/)
* Candide Dashboard for API keys: [https://dashboard.candide.dev/](https://dashboard.candide.dev/)
* Ox/WebAuthnP256: [https://github.com/candide-oss/web-authn-p256](https://github.com/candide-oss/web-authn-p256)
* Vite: [https://vitejs.dev](https://vitejs.dev)
