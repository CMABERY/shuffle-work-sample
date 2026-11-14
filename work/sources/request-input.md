# Request export contract

The response analyzer accepts one JSON bundle in `dice-limit-response/1` format.
It is an application-owned normalized format, not a native Shuffle export or an
automatic platform connection. `example.json` is a complete synthetic example.
Map existing exported fields to this contract while retaining source identifiers.
The browser reads the selected local file; it makes no upload or network request.

Required top-level fields:

- `schema`: `dice-limit-response/1`.
- `data_origin`: `synthetic` or `export`. This is a supplied label, not authentication.
- `platform`: source name; `currency`: one currency code; `currency_decimals`: 0–8.
  Do not mix currencies or convert them without a separate sourced valuation.
- `coverage`: `status` (`complete`, `partial`, `unknown`), `games` (`all`,
  `dice_only`), `from`, `until`, and a nonempty `basis` explaining the declaration.
  All records must lie in the half-open interval `[from, until)`.
- `events`: at most 200,000 immutable request events. Outcome revisions must be
  resolved by the exporter with their original evidence; conflicting versions
  of one request are not silently selected here.

Each event requires `event_id`, `player_id`, `at`, `game`, `outcome`,
`requested_stake`, `accepted_stake`, and `stake_cap`.

Timestamps include a timezone and have at most millisecond precision. Events
with equal timestamps for one player need distinct optional `sequence` values
from a source that establishes their order. Array position is not proof of order.
IDs are scoped to one player in this single-platform bundle. Byte-equivalent or
semantically identical duplicate requests are counted once and retain all input
event references. Conflicting copies block analysis.

Money is unsigned decimal text at the declared precision; floating-point JSON
numbers, exponent notation, silent rounding and mixed currencies are rejected.
The analysis uses integer units. `accepted_stake` means the amount actually
admitted, not a payout or net result. The cap must be the effective stake cap for
that request, not the current policy applied retrospectively.

| Outcome | Required relationship |
| --- | --- |
| `accepted` | Positive requested stake equals accepted stake and does not exceed the cap. |
| `limit_clipped` | Request exceeds the stake cap; accepted stake equals that cap. |
| `limit_refused` | Request exceeds the stake cap; accepted stake is zero. |
| `other_refused` | Accepted stake is zero; this event does not create a limit encounter. |

This first version concerns stake caps. Do not map payout-limit refusals,
insufficient funds, responsible-gambling restrictions or arbitrary errors to
`limit_refused` unless the source actually establishes this stake-cap condition.

## What the analyzer computes

One cohort member per player: the first qualifying Dice limit encounter in the
supplied interval. The user can include both refusals and clipping, or refusals
only. This is not the player's first lifetime encounter and not a per-request
response rate. Repeated requests by one player do not inflate the denominator.

For a selected number of minutes after that encounter, inspect subsequent
requests in source order and strictly before `encounter time + window`.
The first subsequent accepted record determines the activity category: Dice
under the same cap, Dice under a changed cap, or another game. The first clipped
request itself is excluded from follow-up turnover. All later accepted stakes
inside the window are summed, across games, in the single declared currency.

A window is covered only if input coverage is declared complete across all
games and the export extends to its terminal boundary. With no accepted record,
an uncovered window is **Follow-up incomplete**. A covered window can establish
only **No accepted bet observed**. It does not establish departure, intent,
causation or the reason for inactivity. Even positive categories describe the
next recorded accepted request; partial data may omit earlier activity.
Every percentage uses all cohort players, including incomplete follow-up.

The output preserves assumptions, coverage, source-event references and the
original input's SHA256. It does not estimate a treatment effect, simulate a new
policy, predict lifetime value, calculate realized casino profit, or validate
the authenticity/completeness of an export. A real evaluation would require
actual mapped records and a comparison design agreed before evaluating outcomes.
