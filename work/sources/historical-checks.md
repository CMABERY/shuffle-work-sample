# Historical Dice checks: scope and result

These checks use the author's retained Shuffle.us account history. They are
separate from the simulated sessions in the limit explorer and the constructed
requests in the analyzer. The public package contains aggregate findings only.

## Outcome replay

On 13 November 2026, a local recheck reproduced all 25,054 revealed outcomes,
with zero recorded-seed-hash, HMAC-digest or displayed-outcome mismatches.
The 819 outcomes whose server seeds were unrevealed were not replayed.

Matching replay establishes consistency of those records with that calculation.
It does not establish prior publication of commitments, unbiased seed selection,
independence of outcomes, source authenticity, or completeness outside the export.

## Candidate-pattern search

The original search considered 2,988 candidates, including 996 next-roll
definitions. It covered streaks, recent ratios, cumulative deviations, momentum,
alternation and oriented raw-roll means across specified populations, history
definitions, directions and horizons.

Thirty-four development selections were frozen before the original holdout
evaluation. None passed the declared two-stage criterion. The primary
whole-search development p-value was 0.5552 and the selection-adjusted holdout
p-value was 0.0571. A prespecified joint diagnostic of 0.0255 remains a suggestive
result; it was not the finding criterion and cannot replace it after the fact.

The archive had already been explored in earlier work, so this is retrospective
analysis, not prospective replication. The next-20-outcome diagnostic used
overlapping windows: 113 holdout triggers covered 239 distinct future rolls.
It did not trigger during the remembered recovery episode. Later exploratory
extensions followed inspection of the holdout and are not fresh validation.

Power was weak for small advantages. The result establishes no validated
predictive signal; it does not exclude every small effect or prove that no
strategy could ever find one. The public summary does not describe 2,988
independent prospective tests.

Aggregate counts and source-document identities are recorded in
`work/historical-checks.json`. Raw account records are not bundled.
