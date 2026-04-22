import { useMemo } from 'react'
import { SafeAccountV0_3_0 as SafeAccount } from 'abstractionkit'

import type { PasskeyLocalStorageFormat } from '../logic/passkeys'
import { chainName } from '../logic/config'

function PasskeyCard({ passkey, handleCreatePasskeyClick }: { passkey?: PasskeyLocalStorageFormat; handleCreatePasskeyClick: () => void }) {
  const accountAddress = useMemo(
    () => (passkey ? SafeAccount.createAccountAddress([passkey.pubkeyCoordinates]) : undefined),
    [passkey],
  )

  return passkey ? (
    <div className="card">
      <p>Account Address:{" "}
        <a
          target="_blank"
          rel="noopener noreferrer"
          href={`https://${chainName}.blockscout.com/address/${accountAddress}`}
        >
          {accountAddress}
        </a>
      </p>
    </div>
  ) : (
    <div className="card">
      <p>First, you need to create a passkey which will be used to sign transactions</p>
      <button onClick={handleCreatePasskeyClick}>Create Account</button>
    </div>
  )
}

export { PasskeyCard }
