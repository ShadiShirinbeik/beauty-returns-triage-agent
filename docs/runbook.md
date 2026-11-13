# Runbook

What to do when the returns automation fails.

## How failures are handled

| Where it fails | What happens automatically |
|---|---|
| Gemini (timeout, rate limit, server error) | Slack alert in `#automation-alerts`, then Make retries up to 3 times |
| Gmail (expired connection, sending error) | Make retries up to 3 times. The case stays `new` in the Sheet until the email is sent |
| Anything else | Make stores the run as an incomplete execution and emails the account owner |

The scenario setting **Store incomplete executions** must stay on. Without it, the first unhandled error deactivates the scenario, because it starts with an instant webhook trigger.

## Common problems

| Symptom | Likely cause | Fix |
|---|---|---|
| Alerts with `429` | Gemini free tier rate limit | Wait, retries usually succeed. Use a Flash-Lite model if it repeats |
| Alerts with `503` or timeout | Gemini is overloaded | Wait for the retries |
| Gmail error after some days | Google OAuth token expired (app in Testing status) | Make > **Connections** > Gmail connection > **Reauthorize**, then retry the incomplete execution |
| Slack error `not_in_channel` | Make app was removed from the channel | Add the Make app to the channel again |
| Cases stay `new` | A run failed after the case was logged | Check Make > scenario > **Incomplete executions** and retry |
| No new cases at all | Scenario is off, or the Apps Script trigger is missing | Turn the scenario on, run `installTrigger` again |

## Retry a failed run

1. Open the scenario in Make and go to **Incomplete executions**.
2. Open the failed run and check the error.
3. Fix the cause, then click **Retry**.
