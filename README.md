# Beauty Returns Triage Agent

An AI-powered workflow that reads customer return and complaint requests for a beauty e-commerce shop, decides what to do with each one, and acts on it automatically.

## The problem

A support agent reads every return request by hand, checks the order, decides whether to approve it, and writes a reply. It is slow, repetitive, and easy to miss urgent cases.

## How it works

```mermaid
flowchart LR
    A[Customer fills<br>Google Form] --> B[Make scenario<br>triggered]
    B --> C[Gemini classifies<br>reason and sentiment]
    C --> D{Router}
    D -->|Simple and eligible| E[Auto-approve<br>Gmail reply]
    D -->|Damaged product| F[Request photo<br>Gmail reply]
    D -->|Angry or high value| G[Escalate<br>Slack alert]
    E --> H[(Google Sheets<br>case log)]
    F --> H
    G --> H
    H -.->|Every night| I[GitHub Actions<br>SLA check]
    I -.-> J[Slack summary of<br>overdue cases]
```

1. A customer submits a return request through a Google Form.
2. A Make scenario picks it up and sends the message to Gemini.
3. Gemini returns structured JSON with the return reason, customer sentiment and a short summary.
4. A router sends the case to one of three branches based on the rules below.
5. Every case is logged in Google Sheets with its status.
6. A nightly GitHub Actions job finds cases waiting longer than 48 hours and posts a summary to Slack.

## Decision rules

| Condition | Action |
|---|---|
| Customer is angry, or order value is above €150 | Escalate to the team in Slack |
| Product arrived damaged | Ask the customer for a photo |
| Wrong item or changed mind, within 14 days of delivery | Auto-approve and send return instructions |
| Anything else | Escalate to the team in Slack |

## Tech stack

| Area | Tools |
|---|---|
| Workflow orchestration | Make |
| AI classification | Google Gemini API |
| Intake form | Google Forms |
| Data store | Google Sheets |
| Notifications | Gmail, Slack API |
| Scheduled jobs and CI | GitHub Actions |
| Scripts | TypeScript, Node.js |
| Testing | Vitest |

## Project structure

```
make/          Exported Make scenario blueprints (JSON)
src/           TypeScript scripts, such as the nightly SLA check
tests/         Unit tests for the decision and SLA logic
sample-data/   Mock orders and example customer requests
docs/          Screenshots and process diagrams
.github/       GitHub Actions workflows
```

## Status

- [x] Project setup and README
- [ ] Mock data and Google Sheet
- [ ] Make scenario: form, Gemini, Sheet log
- [ ] Router with three branches, Gmail and Slack
- [ ] Error handling and failure alerts
- [ ] Nightly SLA check in TypeScript with GitHub Actions
- [ ] Unit tests and CI

## Author

**Shadi Shirinbeikmohaje** · [LinkedIn](https://www.linkedin.com/in/shadishirinbeik/)
