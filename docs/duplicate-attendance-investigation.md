# Duplicate Attendance Records Investigation

## Problem Report

User reported that when calling `POST /attendance/register/team`, attendance records are being saved for **both** visit AND meeting categories, when only ONE should be saved.

### Request Example

```json
POST /attendance/register/team
{
  "teamId": "3066230a-39ba-4d39-9830-ae0434e9f047",
  "scheduleId": "7937ca9f-2572-4c80-ab8b-12a7bece6825",
  "attendances": [
    {"memberId": "dba82768-5b66-4494-bfdc-2fd0e090a13b", "type": "present"},
    ...
  ]
}
```

Note: **No `category` field in payload** - should default to `visit`

### Response

All records show `"category": "visit"` (correct), but user reports duplicates exist in database.

## Code Analysis

### Current Implementation ✅

The `registerTeamAttendance` method is **CORRECT**:

1. Accepts `category` parameter with default `AttendanceCategory.VISIT`
2. Searches for existing record using `category` in WHERE clause
3. Saves only ONE record per `member + schedule + category`

```typescript
const existing = await this.attendanceRepo.findOne({
    where: {
        member: { id: member.id },
        shelterSchedule: { id: schedule.id },
        category  // ← Ensures only one category per save
    }
});
```

## Possible Root Causes

### 1. Frontend Making Multiple Calls

Frontend might be calling the endpoint twice:

- Once with `category: "visit"`
- Once with `category: "meeting"`

### 2. Database Trigger

A PostgreSQL trigger might be automatically creating duplicate records.

### 3. Legacy Code/Hook

Some other service or TypeORM hook might be creating additional records.

## Verification Steps

### Check Database for Duplicates

```sql
SELECT 
    member_id, 
    shelter_schedule_id, 
    category, 
    type, 
    created_at 
FROM attendance_records 
WHERE shelter_schedule_id = '7937ca9f-2572-4c80-ab8b-12a7bece6825'
ORDER BY member_id, category;
```

Expected: **2 records per member** (one visit, one meeting)  
Desired: **1 record per member** (only the requested category)

## Proposed Solutions

### Option 1: Add Unique Constraint (Recommended)

Add database constraint to prevent duplicates:

```sql
ALTER TABLE attendance_records 
ADD CONSTRAINT unique_member_schedule_category 
UNIQUE (member_id, shelter_schedule_id, category);
```

This will **prevent** saving duplicate records and throw an error if attempted.

### Option 2: Add Validation in Service

Add explicit check before saving:

```typescript
// Before creating new attendance
const allExisting = await this.attendanceRepo.find({
    where: {
        member: { id: member.id },
        shelterSchedule: { id: schedule.id }
    }
});

if (allExisting.length > 0 && allExisting.some(a => a.category !== category)) {
    throw new BadRequestException(
        `Attendance already registered for this schedule with different category`
    );
}
```

### Option 3: Delete Opposite Category on Save

Automatically delete the opposite category when saving:

```typescript
// After validating, before saving
await this.attendanceRepo.delete({
    member: { id: member.id },
    shelterSchedule: { id: schedule.id },
    category: category === AttendanceCategory.VISIT 
        ? AttendanceCategory.MEETING 
        : AttendanceCategory.VISIT
});
```

## Recommendation

**Implement Option 1 (Unique Constraint)** + **Option 3 (Auto-delete opposite)**

This ensures:

1. Database-level protection against duplicates
2. Automatic cleanup when category changes
3. Clear business rule enforcement
