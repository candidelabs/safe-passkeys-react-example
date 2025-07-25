/*
 * Copyright (c) 2025 CANDIDE Labs. All rights reserved.
 *
 * This software contains confidential and proprietary information of CANDIDE Labs.
 * Any reproduction, modification, or distribution of this software, in whole or in part,
 * without the express written consent of CANDIDE Labs is strictly prohibited.
 */
import { useMemo } from "react";
import { SafeAccountV0_3_0 as SafeAccount } from "abstractionkit";
import type { PasskeyLocalStorageFormat } from "../logic/passkeys";

const chainName = import.meta.env.VITE_CHAIN_NAME as string;

export function PasskeyCard({
  passkey,
}: {
  passkey: PasskeyLocalStorageFormat;
}) {
  const accountAddress = useMemo(() => {
    return SafeAccount.createAccountAddress([passkey.pubkeyCoordinates]);
  }, [passkey]);

  return (
    <div className="card" style={{ maxWidth: 400, margin: "1rem auto" }}>
      <p>
        <strong>Account Address:</strong>{" "}
        <a
          href={`https://${chainName}.blockscout.com/address/${accountAddress}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {accountAddress}
        </a>
      </p>
    </div>
  );
}
