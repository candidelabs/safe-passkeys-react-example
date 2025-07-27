/*
 * Copyright (c) 2025 CANDIDE Labs. All rights reserved.
 *
 * This software contains confidential and proprietary information of CANDIDE Labs.
 * Any reproduction, modification, or distribution of this software, in whole or in part,
 * without the express written consent of CANDIDE Labs is strictly prohibited.
 */

import safeLogo from "/safe-logo-white.svg";
import candideLogo from "/candide-atelier-logo.svg";
import "./App.css";
import { sign } from 'ox/WebAuthnP256';
import type { Hex as OxHex } from 'ox/Hex';

import { useState } from "react";
import {
  PasskeyLocalStorageFormat,
  createPasskey,
  toLocalStorageFormat,
} from "./logic/passkeys";
import { SafeCard } from "./components/SafeCard";
import { FaqCard } from "./components/FaqCard";
import { createUser, loginUser } from "./logic/api";

function App() {
  const [displayName, setDisplayName] = useState("");
  const [passkey, setPasskey] = useState<PasskeyLocalStorageFormat>();
  const [accountAddress, setAccountAddress] = useState<string>();
  const [error, setError] = useState<string>();

  // LOGIN existing user
  const handleLogin = async () => {
    setError(undefined);
    if (!displayName.trim()) {
      setError("Please enter your name to log in.");
      return;
    }
    try {
      const { account_address, passkey } = await loginUser(displayName);

      await sign({
        challenge: account_address as OxHex,
        credentialId: passkey.id as OxHex,
      });

      setPasskey(passkey);
      setAccountAddress(account_address);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  };

  // CREATE new account
  const handleCreate = async () => {
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

      {/* Login / Create Card */}
      {!passkey && (
        <div className="card" style={{ maxWidth: 400, margin: "1rem auto" }}>
          <label style={{ display: "block", marginBottom: "1rem" }}>
            Your name:
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name"
              style={{
                width: "100%",
                padding: "0.5rem",
                marginTop: "0.5rem",
                boxSizing: "border-box",
              }}
            />
          </label>

          <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
            <button onClick={handleLogin} style={{ flex: 1, padding: "0.5rem" }}>
              Login
            </button>
            <button onClick={handleCreate} style={{ flex: 1, padding: "0.5rem" }}>
              Create Account
            </button>
          </div>

          <p style={{ fontSize: "0.9rem", color: "#ccc", marginBottom: "0.5rem" }}>
            If it’s your first time, hit “Create Account.”<br />
            Otherwise, type your UserName above and hit “Login.”
          </p>

          {error && <p style={{ color: "red", marginTop: "0.5rem" }}>{error}</p>}
        </div>
      )}

      {/* SafeCard only shows once logged in */}
      {passkey && accountAddress && (
        <SafeCard accountAddress={accountAddress} />
      )}

      <FaqCard />
      <br />
      <br />
    </>
  );
}

export default App;
