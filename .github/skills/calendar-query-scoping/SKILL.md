---
name: calendar-query-scoping
description: 'Calendar MCP query scoping: efficient event retrieval, meeting time discovery, room booking, and scheduling patterns for the native Calendar MCP server. Prevents unbounded event listing and unnecessary API calls. Triggers: calendar search, find meeting, list events, schedule meeting, book room, find meeting time, calendar view, today meetings, upcoming meetings, Calendar MCP, create event.'
argument-hint: 'Describe what calendar data you need — events for a date range, scheduling a meeting, finding available times, or room booking'
---

# Calendar Query Scoping

Efficient patterns for the native `calendar:*` MCP tools. Prevents unbounded event retrieval and unnecessary scheduling calls.

## Purpose

Provides clear retrieval and scheduling patterns for the Calendar MCP server. The key distinction — `ListCalendarView` (time-bounded) vs `ListEvents` (unbounded) — prevents the most common calendar query mistake.

## When to Use

- Retrieving upcoming meetings/events for a date range
- Scheduling new meetings or finding available times
- Room discovery and booking
- Managing event responses (accept/decline/tentative)
- Any direct `calendar:*` tool call

## MCP Tools

### Read Tools

| Tool | Purpose | Payload Risk |
|---|---|---|
| `calendar:ListCalendarView` | Events within a specific time window | LOW-MEDIUM (bounded by window) |
| `calendar:ListEvents` | All events (potentially unbounded) | **HIGH** — use `ListCalendarView` instead |
| `calendar:GetUserDateAndTimeZoneSettings` | User's date/time/timezone preferences | LOW |
| `calendar:GetRooms` | Available meeting rooms | LOW |
| `calendar:FindMeetingTimes` | Suggests available meeting slots for participants | LOW |

### Write Tools

| Tool | Purpose | Notes |
|---|---|---|
| `calendar:CreateEvent` | Create a new calendar event | Sends invitations to attendees |
| `calendar:UpdateEvent` | Modify an existing event | |
| `calendar:ForwardEvent` | Forward event to additional attendees | |
| `calendar:CancelEvent` | Cancel an event (as organizer) | Sends cancellation to attendees |
| `calendar:DeleteEventById` | Delete an event | DESTRUCTIVE — no cancellation notice |
| `calendar:AcceptEvent` | Accept a meeting invitation | |
| `calendar:DeclineEvent` | Decline a meeting invitation | |
| `calendar:TentativelyAcceptEvent` | Tentatively accept an invitation | |

## Critical Distinction: CalendarView vs Events

| | `ListCalendarView` | `ListEvents` |
|---|---|---|
| **Time-bounded** | Yes — requires start/end datetime | No — returns all events |
| **Recurring events** | Expanded into individual occurrences | Returns series master only |
| **Payload risk** | Bounded by time window | Unbounded, can be massive |
| **Use when** | You know the date range | Almost never — prefer CalendarView |

**Rule: Always use `ListCalendarView` with explicit start/end datetimes.** `ListEvents` should only be used when you specifically need series master records (rare).

## Retrieval Patterns

### Pattern 1: Today's Schedule

```
1. calendar:GetUserDateAndTimeZoneSettings() → get timezone
2. calendar:ListCalendarView({
     startDateTime: "<today-start-ISO>",
     endDateTime: "<today-end-ISO>"
   })
```

**Timezone awareness**: Always resolve the user's timezone first. Use ISO 8601 format with timezone offset.

### Pattern 2: This Week's Schedule

```
calendar:ListCalendarView({
  startDateTime: "<monday-ISO>",
  endDateTime: "<friday-end-ISO>"
})
```

For multi-day ranges, a single `ListCalendarView` call is more efficient than one call per day.

### Pattern 3: Specific Meeting Lookup

```
1. calendar:ListCalendarView({ startDateTime, endDateTime })
2. Filter results by subject, organizer, or attendees
```

There is no direct "search by subject" tool — use `ListCalendarView` with a narrow time range and filter client-side.

### Pattern 4: Find Available Meeting Time

```
1. calendar:FindMeetingTimes({
     attendees: [{ emailAddress: "<email>" }],
     timeConstraint: {
       startDateTime: "<range-start>",
       endDateTime: "<range-end>"
     },
     meetingDuration: "PT1H"  // ISO 8601 duration
   })
2. Present suggested times to user
3. calendar:CreateEvent with selected time
```

**Duration format**: Use ISO 8601 duration — `PT30M` (30 min), `PT1H` (1 hour), `PT1H30M` (90 min).

### Pattern 5: Room Booking

```
1. calendar:GetRooms() → list available rooms
2. Include room as attendee/location in CreateEvent
```

## Scheduling Patterns

### Creating a Meeting
```
calendar:CreateEvent({
  subject: "Meeting Title",
  start: { dateTime: "<ISO-datetime>", timeZone: "<timezone>" },
  end: { dateTime: "<ISO-datetime>", timeZone: "<timezone>" },
  attendees: [
    { emailAddress: "<email>", type: "required" },
    { emailAddress: "<email>", type: "optional" }
  ],
  body: { content: "Agenda...", contentType: "text" },
  location: { displayName: "Room Name" },
  isOnlineMeeting: true
})
```

**Online meetings**: Set `isOnlineMeeting: true` to auto-generate a Teams meeting link.

### Responding to Invitations
```
calendar:AcceptEvent({ eventId, comment: "Looking forward to it" })
calendar:DeclineEvent({ eventId, comment: "Conflict — can we reschedule?" })
calendar:TentativelyAcceptEvent({ eventId, comment: "Checking availability" })
```

### Canceling vs Deleting
- **`CancelEvent`**: Sends cancellation to attendees. Use when you're the organizer.
- **`DeleteEventById`**: Silently removes from your calendar. Use for events you received (removes without notifying).

## Decision Logic

```
Need to see schedule? → ListCalendarView (ALWAYS with time bounds)
  └ Today → start/end = today's date boundaries
  └ This week → start = Monday, end = Friday
  └ Specific date → start/end = that day's boundaries

Need to schedule? → FindMeetingTimes first, then CreateEvent
  └ Know the time already? → CreateEvent directly
  └ Need to find availability? → FindMeetingTimes with attendees + range

Need a room? → GetRooms → include in CreateEvent location/attendees

Need to respond? → AcceptEvent / DeclineEvent / TentativelyAcceptEvent

Need to modify? → UpdateEvent with eventId + changed fields

Need to cancel? → CancelEvent (organizer) or DeleteEventById (attendee)
```

## OrderBy Property Names

The Calendar MCP `orderby` parameter uses **PascalCase property names** — not OData nested paths. Using Graph API OData paths like `start/dateTime` will fail.

| Correct | Incorrect |
|---|---|
| `Start` | `start/dateTime` |
| `End` | `end/dateTime` |
| `Subject` | `subject` |
| `CreatedDateTime` | `createdDateTime` |
| `LastModifiedDateTime` | `lastModifiedDateTime` |

**Valid `orderby` properties** (subset of most useful):
`Start`, `End`, `Subject`, `CreatedDateTime`, `LastModifiedDateTime`, `Importance`, `IsAllDay`, `Sensitivity`, `ShowAs`, `Type`

Example:
```
calendar:ListCalendarView({
  startDateTime: "<start-ISO>",
  endDateTime: "<end-ISO>",
  orderby: "Start asc"
})
```

**Do NOT use**: `start/dateTime`, `end/dateTime`, or any lowercase/nested path form.

## Common Pitfalls

| Pitfall | Prevention |
|---|---|
| Using `ListEvents` instead of `ListCalendarView` | `ListEvents` is unbounded and doesn't expand recurring events. Always use `ListCalendarView`. |
| Missing timezone in datetime | Always include timezone. Get it from `GetUserDateAndTimeZoneSettings` if unknown. |
| Not expanding recurring events | `ListCalendarView` auto-expands recurrences. `ListEvents` returns only the series master. |
| `DeleteEventById` when you're the organizer | Use `CancelEvent` to notify attendees. `DeleteEventById` is silent. |
| Hard-coding timezone | Always resolve dynamically via `GetUserDateAndTimeZoneSettings`. |
| Using `start/dateTime` in `orderby` | Calendar MCP uses PascalCase names (`Start`, `End`), not OData nested paths. See **OrderBy Property Names** above. |

## Chaining

- **From morning-brief**: The morning brief uses calendar data for today's meetings. This skill provides the retrieval pattern.
- **From customer-evidence-pack**: Match meetings to opportunities by cross-referencing attendee emails with CRM opportunity contacts.
- **To mail**: After finding a meeting, search for related pre-reads or follow-up emails via `mail:SearchMessages({ query: "subject:<meeting-subject>" })`.
- **To Teams**: Meeting chats are auto-created — find them via `teams:ListChats` (filter by `chatType: meeting`).
