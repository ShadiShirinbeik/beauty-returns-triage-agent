// Sends every new Google Form response to the Make webhook,
// so the Make scenario runs instantly instead of polling the Sheet.
//
// Setup: see docs/setup.md, section 5.

// Runs automatically on every form submission (after installTrigger).
function sendToMake(e) {
  const webhookUrl = PropertiesService.getScriptProperties().getProperty("MAKE_WEBHOOK_URL");
  const answers = e.namedValues; // e.g. { "Order number": ["FL-1001"], ... }

  const payload = {
    submitted_at: new Date().toISOString(),
    email: answers["Email Address"][0],
    order_id: answers["Order number"][0].trim().toUpperCase(),
    message: answers["What happened?"][0],
  };

  UrlFetchApp.fetch(webhookUrl, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
  });
}

// Run this once by hand. It removes old triggers first,
// so running it twice still leaves exactly one trigger.
function installTrigger() {
  for (const trigger of ScriptApp.getProjectTriggers()) {
    ScriptApp.deleteTrigger(trigger);
  }

  ScriptApp.newTrigger("sendToMake")
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onFormSubmit()
    .create();
}

// Run this by hand to send a sample request without filling the form.
// Useful to check that the webhook URL and Make are working.
function testSendToMake() {
  sendToMake({
    namedValues: {
      "Email Address": ["test@example.com"],
      "Order number": ["FL-1002"],
      "What happened?": ["The perfume bottle arrived broken and the box was wet."],
    },
  });
}
