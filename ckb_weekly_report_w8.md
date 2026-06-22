# Builder track weekly report - Week 8
**Name**: Felix Awere<br>
**Week Ending**: 22nd June 2026

## Courses Completed
-  **Builder Track foundations to a production-shaped dApp**: Extended the Rust type-script and CCC patterns from simple-todo / simple-lock into CKB Geo-Wars, a geo-political game with live testnet territory cells, JoyID signing, and indexer-driven map sync.
- **Nervos CKB Cell Model & Scripts (reference)**: Revisited UTXO state transitions (consume input cell → create output cell) to model Register (genesis mint) and Conquest (owned → new owner) as distinct tx shapes validated by one type script.
- **CCC (@ckb-ccc/connector-react)**: Used create-ccc-app-style stack (React + CCC signer) for JoyID on testnet: findCellsByType, getCellLive, completeFeeChangeToLock, and sendTransaction without pre-sign dry-run (JoyID witness placeholders break dry-run).


## Key Learnings
- **Shared 48-byte layout (Rust ↔ TypeScript)**: Territory `cell_data` is manually encoded (version, 32-byte owner lock hash, nation_id, price in shannons) so client and contract always agree.
- **Ownership vs lock script on cells**: Territory cells use `AlwaysSuccess` lock. owner identity lives in data `(owner_id = blake2b of JoyID lock)`. Conquest is permissionless at the lock layer. rules live in the type script.
- **Live UTXO discipline**: Conquer must spend the current live out-point from the indexer (getCellLive), not a cached pointer  stale UTXOs caused `cell not found` failures after register or rival conquests.
- **Real CKB vs game economics**: Listed price in data (~0.05 CKB) is separate from cell capacity (~61 CKB locked). On conquer, territory capacity is recycled; the buyer mainly pays fees + seller liquidation output (~61 CKB minimum CKB output to previous owner’s JoyID).
- **CI / Vercel (CI=true treats ESLint warnings as errors)** local builds can pass while Vercel fails on unused imports and react-hooks/exhaustive-deps.

## Practical Progress
- **Smart Contract (Rust)**: Written in clean modules; handles both territory registration and conquest with payment validation.
- **Contract Tests**: Six automated tests covering valid and invalid registration, valid and invalid conquest, and ownership change scenarios.
- **Testnet Deployment**: Contract deployed to CKB testnet.
- **React Frontend**: Interactive world map (amCharts), with demo and live testnet modes  supports wallet connection, territory registration/conquest, live map updates, and session memory.
- **Chain Integration Module**: Handles all blockchain reads/writes territory data, wallet resolution, transaction building, fund flow tracking, and debug logging.
- **Fund Flow Panel**: Shows users a clear breakdown of where CKB moves during each transaction including seller payouts when a territory is conquered.
- **Vercel Deployment**: Fixed all build warnings so the app deploys cleanly in CI mode.



- **vercel link**: https://ckb-geo-wars.vercel.app
- **Repository**: https://github.com/Felabs1/ckb-geo-wars
- **App Issue Link**: https://github.com/Nervos-Community-Catalyst/CKBuilder-projects/issues/23

## Issues
### Issue 1: Register Failed with Type Script Error Code 2
Initial territory registrations were rejected by the smart contract giving out this error according to the script  `DataTooShort`.

### Issue 1 Fix

The contract was incorrectly expecting all transactions to include existing territory data. Updated it to recognise a fresh registration (no prior data) and validate accordingly. Redeployed with updated settings.

Redeployed contract and updated `client/src/chain/config.ts` with new codeHash and deploy tx.


### Issue 2: Conquest Failed  `Territory cell not found` / Stale UTXO
Conquering a territory failed when the app was holding outdated location data from a previous transaction.

### Issue 2 Fix
Added `fetchLiveTerritoryByIso` + `resolveLiveTerritoryForConquest` with retries on getCellLive (indexer lag).

### Issue 3: Sync Crash  `Cannot convert undefined or null to object`
Indexer sometimes returned cells with null outputData, crashing bytesFrom.

### Issue 3 Fix

Added a safety check to skip over incomplete cells instead of crashing, with a logged warning for visibility.


### Issue 4: Conquest Crash on Registered Tiles (e.g. Kenya / KE)
Conquering registered countries threw encoding errors.

### Issue 4 Fix
Root cause: double-encoding - `encodeTerritoryCellData(encodeTerritory({...}), id)` instead of passing the plain territory object once.
Correct call: `encodeTerritoryCellData({ ownerId, nationId, price }, tile.id);` validate ownerId is `32` bytes.

### Issue 5: Vercel Build Failed (CI=true)
Deploy failed on ESLint warnings treated as errors.

### Issue 5 Fix

- Removed unused `encodeTerritory` import in `territoryCells.ts.`
- Added `isSimulating` to `registerTerritoryOnChain` useCallback dependency array in `GameContext.tsx`.
- Verified with `CI=true npm run build` locally.

