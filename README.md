# Passkeys Safe Example

This minimalistic example application demonstrates how to use **Passkeys as an authentication mechanism for a Safe Account**. It leverages the WebAuthn API to interact directly with the user's device credentials. A paymaster is configured to sponsor the user operation gas fees.

## Quickstart

Follow these steps to get the example running:

1.  **Clone the Repo**

    ```bash
    git clone git@github.com/candidelabs/safe-passkeys-react-example.git
    ```

2.  **Install Dependencies**

    ```bash
    cd safe-passkeys-react-example
    npm install
    ```

3.  **Configure Environment Variables**

    ```bash
    cp .env.example .env
    ```

    * **Default Network:** Examples run on Arbitrum Sepolia. Change your `.env` if you prefer another network.
    * **Endpoints:** `BUNDLER_URL` and `PAYMASTER_URL` use public endpoints. You can get your own dedicated endpoints from [Candide Dashboard](https://dashboard.candide.dev/).

3.  **Run the app**

    ```bash
    npm run dev
    ```

## Resources

Safe Passkeys documentation can be found [here](https://docs.candide.dev/wallet/plugins/passkeys/).