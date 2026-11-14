# Reading the limit study

This note describes the saved study displayed in the explorer. It is a reader's
guide, not a new experiment. The full numerical evidence and selected session
traces are included in `work/limit-study/evidence.json`.

## Model and comparison

The selected cell is `fixed_10k_unit10c/balance_fraction_5pct`: 2,500 simulated
players, each starting with $100, requesting 5% of current balance per bet,
subject to the selected stake cap, for up to 10,000 bets. The displayed win
chance is 49.50%. The frozen dice-v1 model uses raw-byte seeds, strict roll
comparisons and settlement floored to one millionth of a dollar. It is distinct
from the implementation used to replay historical Shuffle account records.

Three saved policies are displayed:

- `v1`: the model's $1,000 stake cap.
- `s100/clip`: a $100 cap; reduce an over-cap request and continue.
- `s100/stop`: a $100 cap; refuse the over-cap request and end the session.

The two tighter-cap policies affect 35 of 2,500 sessions. They are behavioral
scenarios, not measured proportions of customers who continue or leave.

| Policy | Largest peak player profit | 99th percentile | Maximum's session |
| --- | ---: | ---: | ---: |
| v1 | $38,644.03 | $2,352.64 | 2286 |
| s100/clip | $12,628.64 | $2,398.43 | 309 |
| s100/stop | $1,996.65 | $1,921.16 | 1649 |

Peak player profit is the maximum profit above the initial deposit during a
session. It is not ending profit, total balance or required capital for the
whole business. The continuing policy lowers the largest observed peak while
slightly increasing the 99th percentile. A sample maximum is not a future bound.

The explorer also separates realized house earnings from the sum of conditional
expected earnings over accepted stakes. The latter depends on the simulated
paths and resulting turnover. Neither is a forecast of Shuffle revenue, and
neither includes operating costs.

## What can be inspected

The aggregate figures come from the completed study. The explorer's existing
build reconstructed three original shards containing the selected extremes
(150 sessions) and checked their hashes and ledger totals. It then retained
nine traces: all three policies for sessions 2286, 309 and 1649.

The public package copies that explorer, its evidence and build record without
changing their bytes. It does not rerun the aggregate study or introduce new
seeds. Switch policy, inspect the corresponding maximum, follow a cap event,
and export the comparison or full simulated session ledger.

## What remains unestablished

The assumed limits are not confirmed live limits. Real player responses,
promotion behavior, commercial demand and causal effects have not been measured.
The model's currency precision, seed encoding and other rules should not be
treated as a description of Shuffle's current deployment.

The request-history analyzer supplies a next measurement step using a separate
synthetic example. Its normalized input contract is included as `work/INPUT.md`.
Actual use requires mapping a real export and checking its declared coverage.
