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
