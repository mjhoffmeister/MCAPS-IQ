# M365 Data Helpers

Reusable Node.js CLI scripts for normalizing, scoring, and formatting M365 data from MCP tool responses. Eliminates inline code generation during agent workflows.

## Scripts

| Script | Purpose | Input | Output |
|---|---|---|---|
| `normalize-calendar.js` | Normalize raw `ListCalendarView` JSON | MCP calendar JSON | Compact event array |
| `score-meetings.js` | Priority-score events + detect conflicts | Normalized calendar JSON | Scored events + conflict groups |
| `normalize-mail.js` | Normalize raw `SearchMessages` JSON | MCP mail JSON | Compact mail items + summary |
| `build-workiq-query.js` | Build properly scoped WorkIQ prompts | CLI flags | Structured query text |

## Common Workflow

### Calendar (morning triage)
```bash
# 1. Have @m365-actions save raw ListCalendarView JSON to file
# 2. Normalize
node scripts/helpers/normalize-calendar.js /tmp/cal-raw.json --tz America/Chicago --user-email jin.lee@microsoft.com > /tmp/cal-normalized.json

# 3. Score + detect conflicts
node scripts/helpers/score-meetings.js /tmp/cal-normalized.json --vip-list "$VAULT_DIR/_lcg/vip-list.md" > /tmp/cal-scored.json
```

### Mail (morning triage)
```bash
# 1. Have @m365-actions save raw SearchMessages JSON to file
# 2. Normalize + classify
node scripts/helpers/normalize-mail.js /tmp/mail-raw.json --vip-list "$VAULT_DIR/_lcg/vip-list.md" > /tmp/mail-normalized.json
```

### WorkIQ (scoped queries)
```bash
# Build a properly scoped query instead of ad-hoc prompts
node scripts/helpers/build-workiq-query.js \
  --goal "action items from PriorAuth sync" \
  --sources meetings,chats \
  --entities "Adam Ziesmer,Blue KC" \
  --time-window 7d \
  --topic "PriorAuth" \
  --output-shape actions
```

## Pipeline Pattern

Scripts compose via pipes:
```bash
cat /tmp/cal-raw.json \
  | node scripts/helpers/normalize-calendar.js --tz America/Chicago \
  | node scripts/helpers/score-meetings.js --vip-list "$VAULT_DIR/_lcg/vip-list.md" \
  > /tmp/cal-scored.json
```
