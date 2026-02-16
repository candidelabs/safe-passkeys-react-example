# Safe Unified Account - Passkeys React Example

This example application demonstrates **Safe Unified Account** — multichain operations authenticated with a single passkey signature. A user creates a passkey, then adds a new owner to their Safe account on **two chains simultaneously** (Ethereum Sepolia + Optimism Sepolia) with just one biometric authentication.

## Quickstart

Follow these steps to get the example running:

1.  **Clone the Repo**

    ```bash
    git clone git@github.com:candidelabs/safe-unified-account-passkeys-react-example.git
    ```

2.  **Install Dependencies**

    ```bash
    cd safe-unified-account-passkeys-react-example
    npm install
    ```

3.  **Configure Environment Variables**

    ```bash
    cp .env.example .env
    ```

    * **Default Networks:** Ethereum Sepolia and Optimism Sepolia.
    * **Endpoints:** Uses public Candide bundler endpoints. You can get your own dedicated endpoints from [Candide Dashboard](https://dashboard.candide.dev/).

4.  **Run the app**

    ```bash
    npm run dev
    ```

## How It Works

1. **Create a Passkey** — WebAuthn credential using device biometrics (Touch ID, Face ID, etc.)
2. **Click "Add Owner on Both Chains"** — generates a random new owner address
3. **Single passkey authentication** — signs a multichain Merkle root hash covering both chains
4. **Dual execution** — UserOperations are sent to both chains concurrently, gas sponsored by AllowAllPaymaster

## Resources

- [Safe Unified Account documentation](https://docs.candide.dev/account-abstraction/research/safe-unified-account)
- [AbstractionKit documentation](https://docs.candide.dev)
- [Passkeys integration guide](https://docs.candide.dev/wallet/plugins/passkeys/)
