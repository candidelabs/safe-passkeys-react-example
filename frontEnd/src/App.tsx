import safeLogo from "/safe-logo-white.svg";
import candideLogo from "/candide-atelier-logo.svg";
import "./App.css";

import { useEffect, useState } from "react";
import {
  PasskeyLocalStorageFormat,
  createPasskey,
  toLocalStorageFormat,
} from "./logic/passkeys.ts";
import { PasskeyCard } from "./components/PasskeyCard.tsx";
import { SafeCard } from "./components/SafeCard.tsx";
import { FaqCard } from "./components/FaqCard.tsx";
import { createUser } from "./logic/api.ts";

function App() {
  const [passkey, setPasskey] = useState<PasskeyLocalStorageFormat | undefined>();
  const [accountAddress, setAccountAddress] = useState<string | undefined>();
  const [error, setError] = useState<string>();

  const handleCreatePasskeyClick = async () => {
    setError(undefined);
    try {
      const generated = await createPasskey();
      const formatted = toLocalStorageFormat(generated);

      // Dynamically import to avoid SSR/bundle issues
      const { SafeAccountV0_3_0: SafeAccount } = await import("abstractionkit");
      const derivedAccountAddress = SafeAccount.createAccountAddress([formatted.pubkeyCoordinates]);

      // Save to DB
      await createUser(derivedAccountAddress, formatted);

      // Set local state
      setPasskey(formatted);
      setAccountAddress(derivedAccountAddress);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  return (
    <>
      <header className="header">
        <a href="https://candide.dev" target="_blank">
          <img src={candideLogo} className="logo" alt="Candide logo" />
        </a>
        <a href="https://safe.global" target="_blank">
          <img src={safeLogo} className="logo" alt="Safe logo" />
        </a>
      </header>

      <h1>Safe Passkeys Demo</h1>

      <PasskeyCard
        passkey={passkey}
        handleCreatePasskeyClick={handleCreatePasskeyClick}
      />

      {accountAddress && <SafeCard accountAddress={accountAddress} />}

      {error && (
        <div className="card">
          <p>Error: {error}</p>
        </div>
      )}

      <FaqCard />
      <br />
      <br />
    </>
  );
}

export default App;
