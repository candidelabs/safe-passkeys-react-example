// frontEnd/src/App.tsx
import safeLogo from "/safe-logo-white.svg";
import candideLogo from "/candide-atelier-logo.svg";
import "./App.css";

import { useState } from "react";
import {
  PasskeyLocalStorageFormat,
  createPasskey,
  toLocalStorageFormat,
} from "./logic/passkeys.ts";
import { PasskeyCard } from "./components/PasskeyCard.tsx";
import { SafeCard } from "./components/SafeCard.tsx";
import { FaqCard } from "./components/FaqCard.tsx";
import { createUser, loginUser } from "./logic/api.ts";

function App() {
  const [displayName, setDisplayName] = useState("");
  const [passkey, setPasskey] = useState<PasskeyLocalStorageFormat>();
  const [accountAddress, setAccountAddress] = useState<string>();
  const [error, setError] = useState<string>();

  // 1) Login flow
  const handleLogin = async () => {
    setError(undefined);
    if (!displayName.trim()) {
      setError("Please enter your name to log in.");
      return;
    }
    try {
      const { account_address, passkey } = await loginUser(displayName);
      setPasskey(passkey);
      setAccountAddress(account_address);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Login failed");
    }
  };

  // 2) Create-account flow (passed down into PasskeyCard)
  const handleCreatePasskeyClick = async () => {
    setError(undefined);
    if (!displayName.trim()) {
      setError("Please enter your name before creating an account.");
      return;
    }
    try {
      const generated = await createPasskey();
      const formatted = toLocalStorageFormat(generated);

      const { SafeAccountV0_3_0: SafeAccount } = await import("abstractionkit");
      const derivedAccountAddress = SafeAccount.createAccountAddress([
        formatted.pubkeyCoordinates,
      ]);

      await createUser(derivedAccountAddress, formatted, displayName);

      setPasskey(formatted);
      setAccountAddress(derivedAccountAddress);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Account creation failed");
    }
  };

  return (
    <>
      <header className="header">
        <a href="https://candide.dev" target="_blank" rel="noopener noreferrer">
          <img src={candideLogo} className="logo" alt="Candide logo" />
        </a>
        <a href="https://safe.global" target="_blank" rel="noopener noreferrer">
          <img src={safeLogo} className="logo" alt="Safe logo" />
        </a>
      </header>

      <h1>Safe Passkeys Demo</h1>

      {!passkey && (
        <div className="card">
          <label>
            Your name:
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name"
              style={{ marginLeft: 8 }}
            />
          </label>
          <div style={{ marginTop: 12 }}>
            <button onClick={handleLogin}>Login</button>
          </div>
          {error && (
            <p style={{ color: "red", marginTop: 8 }}>{error}</p>
          )}
        </div>
      )}

      {/* PasskeyCard still shows the original “Create Account” button */}
      <PasskeyCard
        passkey={passkey}
        handleCreatePasskeyClick={handleCreatePasskeyClick}
      />

      {accountAddress && <SafeCard accountAddress={accountAddress} />}

      <FaqCard />
      <br />
      <br />
    </>
  );
}

export default App;
