// Nightly SLA check, run by GitHub Actions (.github/workflows/sla-check.yml).
// Reads the Cases tab, finds stuck and overdue cases, and posts a summary to Slack.
//
// Environment variables (GitHub secrets):
//   GOOGLE_SERVICE_ACCOUNT_JSON  key file of a service account with read access to the Sheet
//   SPREADSHEET_ID               the long ID in the Sheet URL
//   SLACK_WEBHOOK_URL            Slack incoming webhook. If missing, the message is only printed.
//
// Run: npm run sla-check
import { GoogleAuth } from "google-auth-library";
import { buildSlackMessage, findOverdueCases, findStuckCases, rowToCase, type Case } from "./sla.ts";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

// 1. Read the Cases tab with a read-only service account.
const auth = new GoogleAuth({
  credentials: JSON.parse(requireEnv("GOOGLE_SERVICE_ACCOUNT_JSON")),
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});
const client = await auth.getClient();

const range = encodeURIComponent("Cases!A2:L");
const url =
  `https://sheets.googleapis.com/v4/spreadsheets/${requireEnv("SPREADSHEET_ID")}/values/${range}` +
  "?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER";
const response = await client.request<{ values?: unknown[][] }>({ url });
const rows = response.data.values ?? [];

// 2. Turn rows into cases and apply the rules.
const cases: Case[] = [];
for (const row of rows) {
  const c = rowToCase(row);
  if (c) cases.push(c);
}

const now = new Date();
const stuck = findStuckCases(cases, now);
const overdue = findOverdueCases(cases, now);
console.log(`Checked ${cases.length} cases: ${overdue.length} overdue, ${stuck.length} stuck.`);

// 3. Post to Slack, but only when something needs attention.
if (stuck.length === 0 && overdue.length === 0) {
  console.log("Nothing to report.");
} else {
  const text = buildSlackMessage(stuck, overdue, now);
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.log("SLACK_WEBHOOK_URL is not set, so the message is only printed:\n" + text);
  } else {
    const slack = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!slack.ok) throw new Error(`Slack returned ${slack.status}`);
    console.log("Summary posted to Slack.");
  }
}
