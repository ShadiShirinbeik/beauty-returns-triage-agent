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
| `status` | `approved`, `waiting_photo`, `escalated` or `closed` |

## 3. Create the Google Form

Create a Google Form named **Return request** with these settings and questions:

- Settings > Responses > Collect email addresses: **Responder input**
- **Order number**: short answer, required. Response validation: regular expression, matches `FL-\d{4}`
- **What happened?**: paragraph, required

In the Responses tab, click **Link to Sheets** and choose the **Beauty Returns** spreadsheet. This adds a third tab where every answer appears as a new row.

## 4. Test requests

`sample-data/test-requests.csv` has one example message per order, with the decision the workflow should make. Submit them through the form with your own email address so you receive the replies.
