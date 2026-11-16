// Rules for the nightly SLA check.
// No Google or Slack code here, so these functions are easy to test.

export type Case = {
  caseId: string;
  receivedAt: Date;
  orderId: string;
  status: string;
};

// Make handles a new case within a minute or two.
// If it is still "new" after 1 hour, the automation probably failed.
export const STUCK_AFTER_HOURS = 1;

// Escalated cases are the team's job. They should be closed within 48 hours.
// "waiting_photo" cases are not checked: they wait for the customer, not the team.
export const OVERDUE_AFTER_HOURS = 48;

export function hoursSince(date: Date, now: Date) {
  return (now.getTime() - date.getTime()) / (60 * 60 * 1000);
}

export function findStuckCases(cases: Case[], now: Date) {
  return cases.filter(
    (c) => c.status === "new" && hoursSince(c.receivedAt, now) > STUCK_AFTER_HOURS,
  );
}

export function findOverdueCases(cases: Case[], now: Date) {
  return cases.filter(
    (c) => c.status === "escalated" && hoursSince(c.receivedAt, now) > OVERDUE_AFTER_HOURS,
  );
}

// Google Sheets returns a date either as text ("2026-11-13T19:28:00.000Z")
// or as a serial number (days since 1899-12-30). Returns null if it is neither.
export function parseSheetDate(value: unknown) {
  if (typeof value === "number") {
    const daysFrom1899To1970 = 25569;
    return new Date((value - daysFrom1899To1970) * 24 * 60 * 60 * 1000);
  }
  if (typeof value === "string" && value !== "") {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
}

// One row of the Cases tab, columns A to L.
// A = case_id, B = received_at, C = order_id, L = status
export function rowToCase(row: unknown[]): Case | null {
  const receivedAt = parseSheetDate(row[1]);
  if (!receivedAt) return null;
  return {
    caseId: String(row[0] ?? ""),
    receivedAt,
    orderId: String(row[2] ?? ""),
    status: String(row[11] ?? ""),
  };
}

export function buildSlackMessage(stuck: Case[], overdue: Case[], now: Date) {
  let text = ":alarm_clock: *Daily returns check*\n";

  if (overdue.length > 0) {
    text += `\n*Escalated and still open after ${OVERDUE_AFTER_HOURS} hours (${overdue.length}):*\n`;
    for (const c of overdue) {
      text += `• ${c.orderId} (${c.caseId}), waiting ${Math.floor(hoursSince(c.receivedAt, now))} hours\n`;
    }
  }

  if (stuck.length > 0) {
    text += `\n*Stuck in "new", the automation may have failed (${stuck.length}):*\n`;
    for (const c of stuck) {
      text += `• ${c.orderId} (${c.caseId}), received ${Math.floor(hoursSince(c.receivedAt, now))} hours ago\n`;
    }
    text += "See docs/runbook.md\n";
  }

  return text;
}
