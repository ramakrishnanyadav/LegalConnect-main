# Timezone Fix Documentation

## Problem Statement

The consultation booking system had critical timezone issues:

1. **Date and time stored separately**: The `date` and `time` fields were stored separately without timezone context
2. **Ambiguous time references**: Times like "9:00" could mean 9 AM in any timezone
3. **Server-side timezone bias**: The completion check used `setHours()` which operated in server's local timezone
4. **No timezone information**: User's timezone was never captured or used

### Example of the Problem

- User in India (UTC+5:30) books consultation for "Jan 15, 2026 at 10:00"
- Server in US (UTC-5) processes this differently
- Completion check would fire at wrong times

## Solution Implemented

### Backend Changes

#### 1. Updated Consultation Model

Added `scheduledDateTime` field to store complete UTC datetime:

```javascript
scheduledDateTime: {
  type: Date,
  required: true,
  index: true,  // For efficient querying
}
```

The existing `date` and `time` fields are kept for backward compatibility and display purposes.

#### 2. Helper Function for UTC Conversion

Created `createUTCDateTime()` function in consultationController.js:

```javascript
function createUTCDateTime(date, time, timezoneOffset = 0) {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);

  const localDate = new Date(year, month - 1, day, hours, minutes, 0, 0);

  if (timezoneOffset !== 0) {
    const utcTime = localDate.getTime() - timezoneOffset * 60000;
    return new Date(utcTime);
  }

  return new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
}
```

**How it works:**

- Takes date string (YYYY-MM-DD), time string (HH:MM), and timezone offset (in minutes)
- Creates a proper UTC datetime
- Timezone offset is negative of JavaScript's `getTimezoneOffset()` (e.g., IST is -330)

#### 3. Updated Controllers

**scheduleConsultation():**

- Now accepts `timezoneOffset` from frontend
- Creates `scheduledDateTime` using helper function
- Validates that scheduled time is in the future (UTC comparison)

**rescheduleConsultation():**

- Same timezone handling as scheduling
- Updates `scheduledDateTime` along with `date` and `time`

**markPastConsultationsCompleted():**

- Simplified to single database query
- Compares `scheduledDateTime` directly with current UTC time:

```javascript
await ConsultationModel.updateMany(
  {
    status: "accepted",
    scheduledDateTime: { $lte: now },
  },
  { status: "completed" },
);
```

Much more efficient than previous loop-based approach!

### Frontend Changes

#### 1. Send Timezone Offset

All consultation creation/rescheduling now sends user's timezone:

```javascript
const timezoneOffset = new Date().getTimezoneOffset();

await service.scheduleConsultation(lawyerId, {
  date,
  time,
  type,
  notes,
  timezoneOffset: -timezoneOffset, // Negate for correct sign
});
```

**Why negate?**
JavaScript's `getTimezoneOffset()` returns positive for west of UTC, negative for east.
We need opposite: positive for east (IST = +330), negative for west.

#### 2. Display Times in Local Timezone

Consultations now show formatted dates:

```javascript
const consultationDate = new Date(consultation.date);
const formattedDate = consultationDate.toLocaleDateString(undefined, {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "short",
});
```

This automatically displays in user's local timezone!

#### 3. UI Timezone Indicators

Added helpful text in modals:

```
"All times are in your local timezone (Asia/Kolkata)"
```

Uses `Intl.DateTimeFormat().resolvedOptions().timeZone` to show actual timezone name.

## Migration

### For Existing Data

Run the migration script to update existing consultations:

```bash
cd Backend
npm run migrate:timezones
```

This script:

1. Finds consultations without `scheduledDateTime`
2. Combines their `date` and `time` fields into UTC datetime
3. Updates the database
4. Shows progress and summary

**Important:** Run this once after deploying the timezone fix.

### Seed Script Updated

The `seedPaidConsultation.js` script now creates consultations with proper `scheduledDateTime`:

```javascript
const consultationDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const scheduledDateTime = new Date(consultationDate);
scheduledDateTime.setHours(10, 0, 0, 0);

await ConsultationModel.create({
  scheduledDateTime: scheduledDateTime,
  date: consultationDate,
  time: "10:00",
  // ... other fields
});
```

## Testing

### Test Scenarios

1. **Different Timezones:**
   - User in India books "Jan 15 at 10:00 AM"
   - User in US views same consultation - should see correct local time
   - Server correctly marks as completed after scheduled time passes (in UTC)

2. **Past Validation:**
   - Try booking consultation in the past → Should be rejected
   - Try rescheduling to past time → Should be rejected

3. **Auto-completion:**
   - Create consultation for 1 minute from now
   - Wait and refresh
   - Status should change to "completed" automatically

4. **Migration:**
   - Run on database with existing consultations
   - Verify `scheduledDateTime` field is populated
   - Check that times are sensible

## Benefits

1. ✅ **Timezone Accurate**: No more confusion about when consultations happen
2. ✅ **Efficient**: Single database query instead of loop for completion check
3. ✅ **User Friendly**: Times display in user's local timezone with clear indicators
4. ✅ **Backwards Compatible**: Existing `date` and `time` fields preserved
5. ✅ **Future Proof**: Can easily add features like "reminder 1 hour before"
6. ✅ **Validation**: Backend prevents booking in the past

## Future Enhancements

Potential improvements:

- Add timezone dropdown in booking form (override auto-detection)
- Email reminders using `scheduledDateTime`
- Calendar export (ICS files) with proper timezone data
- Show "X hours until consultation" countdown
- Handle daylight saving time transitions
