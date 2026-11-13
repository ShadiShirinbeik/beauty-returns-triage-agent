# Setup guide

## 1. Generate mock data

Requires Node.js 20 or newer.

```bash
npm install
npm run generate-data
```

This writes `sample-data/orders.csv`. Delivery dates are relative to today, so rerun it before testing if the data is older than a few days.

## 2. Create the Google Sheet

Create a new Google Sheet named **Beauty Returns** with two tabs:

| Tab | How to fill it |
|---|---|
| `Orders` | File > Import > Upload `sample-data/orders.csv` > Replace current sheet |
| `Cases` | Import `sample-data/cases-template.csv` the same way. It only contains the header row |

Keep **Convert text to numbers, dates, and formulas** ticked when importing, so the `days_since_delivery` column becomes a live formula.

`Orders` is the mock order database. `Cases` is where the Make scenario logs every request and its decision.

### Cases columns

| Column | Meaning |
|---|---|
| `case_id` | Unique ID created by Make |
| `received_at` | When the request arrived |
| `order_id`, `customer_email`, `message` | Copied from the form |
| `reason` | From Gemini: `damaged`, `wrong_item`, `changed_mind` or `other` |
| `sentiment` | From Gemini: `positive`, `neutral` or `angry` |
| `summary` | One-sentence summary from Gemini |
| `order_value`, `days_since_delivery` | Looked up from the `Orders` tab |
| `decision` | `auto_approve`, `request_photo` or `escalate` |
| `status` | `new`, `approved`, `waiting_photo`, `escalated` or `closed` |

## 3. Create the Google Form

Create a Google Form named **Return request** with these settings and questions:

- Settings > Responses > Collect email addresses: **Responder input**
- **Order number**: short answer, required. Response validation: regular expression, matches `FL-\d{4}`
- **What happened?**: paragraph, required

In the Responses tab, click **Link to Sheets** and choose the **Beauty Returns** spreadsheet. This adds a third tab where every answer appears as a new row.

## 4. Test requests

`sample-data/test-requests.csv` has one example message per order, with the decision the workflow should make. Submit them through the form with your own email address so you receive the replies.

## 5. Connect the form to Make

### Create the webhook in Make

1. In Make, create a new scenario named **Returns triage**.
2. Add the module **Webhooks > Custom webhook** as the trigger.
3. Click **Add**, name the webhook `Return request from form`, and save.
4. Copy the webhook URL. Make now waits for the first request to learn the data structure.

### Install the Apps Script

1. Open the **Beauty Returns** Sheet and go to **Extensions > Apps Script**.
2. Replace the default code with `apps-script/form-to-make.js`.
3. Go to **Project Settings > Script Properties** and add `MAKE_WEBHOOK_URL` with the webhook URL as the value.
4. In the editor, select the function `installTrigger` and click **Run**. Approve the permissions when asked.
5. Submit a test request through the form. Make should show **Successfully determined**.

The webhook sends this JSON to Make:

```json
{
  "submitted_at": "2026-11-12T09:30:00.000Z",
  "email": "you@example.com",
  "order_id": "FL-1001",
  "message": "The lipstick shade is much darker than on the website."
}
```

The webhook URL is kept in Script Properties, not in the code, so it never ends up on GitHub.

## 6. Classify with Gemini and log the case

Add these modules after the webhook, in this order:

| # | Module | Settings |
|---|---|---|
| 1 | Webhooks > Custom webhook | Already created in section 5 |
| 2 | Google Sheets > Search Rows | Sheet `Orders`, filter `order_id` equal to the webhook `order_id`, limit 1 |
| 3 | Google Gemini AI > Generate a response | A Flash model, prompt from `make/gemini-prompt.txt` with `{{message}}` mapped from the webhook |
| 4 | JSON > Parse JSON | JSON string is the Gemini response text, data structure with `reason`, `sentiment`, `summary` |
| 5 | Google Sheets > Add a Row | Sheet `Cases`, columns mapped as below |

| Cases column | Value |
|---|---|
| `case_id` | `C-{{formatDate(now; "YYMMDD-HHmmss")}}` |
| `received_at` | Webhook `submitted_at` |
| `order_id`, `customer_email`, `message` | Webhook fields |
| `reason`, `sentiment`, `summary` | Parse JSON output |
| `order_value` | Search Rows `amount_eur` |
| `days_since_delivery` | Search Rows `days_since_delivery` |
| `decision` | Empty for now, filled by the router later |
| `status` | `new` |

The Gemini API key is stored in a Make connection, never in this repository.

## 7. Route each case

Add a **Router** after the **Add a Row** module. Make sends a case down every route whose filter passes, so the filters must not overlap. The escalation route is the fallback: it only runs when no other route matches.

| Route | Filter (all conditions must be true) | Actions |
|---|---|---|
| Request photo | `reason` equal to `damaged`, `sentiment` not equal to `angry`, `order_value` less than or equal to `150` | Update the row: `decision` = `request_photo`, `status` = `waiting_photo` |
| Auto-approve | `reason` matches pattern `^(wrong_item\|changed_mind)$`, `sentiment` not equal to `angry`, `order_value` less than or equal to `150`, `days_since_delivery` less than or equal to `14` | Update the row: `decision` = `auto_approve`, `status` = `approved` |
| Escalate (fallback) | None | Slack **Create a Message** in `#returns-escalations` using `templates/slack-escalation.txt`, then update the row: `decision` = `escalate`, `status` = `escalated` |

Each **Update a Row** module uses the row number returned by **Add a Row**. Fields left empty are not changed.

### Slack connection

1. In Slack, create the channel `#returns-escalations`.
2. In the Slack module, create a connection with the type **Slack (bot)**, so messages come from the Make app and not from a personal account. Leave **Additional Scopes** empty.
3. Add the Make app to the channel (channel name > **Integrations** > **Add apps**, or type `/invite @Make` in the channel). Without this, Slack returns `not_in_channel`.
4. After saving the fallback filter, open it again and check it has no conditions. Make sometimes adds an empty condition, which blocks every case.

### Expected results for the test requests

| Order | Route |
|---|---|
| FL-1001, FL-1008 | Auto-approve |
| FL-1002, FL-1006 | Request photo |
| FL-1003 (angry), FL-1004 (over €150), FL-1005 (30 days), FL-1007 (other) | Escalate |

## 8. Email the customer

The request-photo and auto-approve routes send an email with the **Gmail > Send an Email** module, placed before **Update a Row**. If the email fails, the status stays `new`, so no case is lost.

### Google Cloud OAuth client

Make needs your own OAuth client to send from a personal `@gmail.com` account.

1. In [Google Cloud Console](https://console.cloud.google.com/), create a project, for example `make-returns`.
2. **APIs & Services > Library**: enable **Gmail API**.
3. **APIs & Services > OAuth consent screen > Get started**: app name `Make`, audience **External**, your Gmail as support and contact email.
4. **Branding > Authorized domains**: add `make.com` and `integromat.com`.
5. **Audience > Test users**: add your Gmail address.
6. **Data Access > Add or remove scopes**: add
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.compose`
   - `https://www.googleapis.com/auth/gmail.send`
7. **Clients > Create client**: type **Web application**, redirect URI `https://www.make.com/oauth/cb/google-email`. Copy the Client ID and Client secret.
8. In Make, create a Gmail connection, turn on **Advanced settings**, paste the Client ID and secret, and sign in with Google.

The client secret stays in Make and Google Cloud, never in this repository. While the app is in Testing status, Google may ask you to reauthorize the connection after a few days (Make > **Connections** > **Reauthorize**).

### Email modules

| Route | To | Subject and content |
|---|---|---|
| Request photo | Webhook `email` | `templates/email-request-photo.txt` |
| Auto-approve | Webhook `email` | `templates/email-auto-approve.txt` |

The content field is HTML, so the templates use `<p>` tags for paragraphs. Replace `{{order_id}}` with the webhook `order_id` pill.

## 9. Handle errors

1. Scenario settings (gear icon): turn on **Store incomplete executions**.
2. In Slack, create the channel `#automation-alerts` and add the Make app to it.
3. Right-click the **Gemini** module > **Add error handler**:
   - **Slack > Create a Message** in `#automation-alerts`, using `templates/slack-error-alert.txt`. Map `error_message` to the error message of the Gemini module.
   - Then a **Retry** handler (called **Break** in older Make versions): 3 attempts, 15 minutes apart.
4. Right-click each **Gmail** module > **Add error handler** > **Retry**, with the same settings.

To test it, temporarily change the Gemini model to a name that does not exist, submit the form, and check that the alert arrives in Slack and the run appears in **Incomplete executions**. Then change the model back and delete the test run.

See [runbook.md](runbook.md) for what to do when something fails.
