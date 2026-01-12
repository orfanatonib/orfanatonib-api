# Attendance Records Endpoint

## Endpoint

```
GET /attendance/records
```

## Description

Returns a paginated list of attendance records with comprehensive filtering options. This endpoint allows querying attendance data by schedule, team, member, date range, and attendance type.

## Authentication

Requires JWT authentication via `JwtAuthGuard`.

## Query Parameters

### Pagination

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number (1-indexed) |
| `limit` | number | 20 | Number of records per page |

### Filters

| Parameter | Type | Optional | Description |
|-----------|------|----------|-------------|
| `scheduleId` | UUID | Yes | Filter by specific schedule ID |
| `teamId` | UUID | Yes | Filter by team ID |
| `memberId` | UUID | Yes | Filter by member (member) ID |
| `memberName` | string | Yes | Partial search on member name |
| `type` | enum | Yes | Attendance type: `present` or `absent` |
| `category` | enum | Yes | Attendance category: `visit` or `meeting` |
| `startDate` | ISO Date | Yes | Filter records from this date onwards |
| `endDate` | ISO Date | Yes | Filter records up to this date |

### Sorting

| Parameter | Type | Default | Options | Description |
|-----------|------|---------|---------|-------------|
| `sortBy` | string | `createdAt` | `createdAt`, `visitDate`, `meetingDate` | Field to sort by |
| `sortOrder` | string | `desc` | `asc`, `desc` | Sort direction |

## Response DTO

### PaginatedResponseDto<AttendanceRecordDto>

```typescript
{
  data: AttendanceRecordDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

### AttendanceRecordDto

```typescript
{
  id: string;                    // Attendance record UUID
  type: "present" | "absent";    // Attendance type
  category: "visit" | "meeting"; // Attendance category
  comment?: string;              // Optional comment
  memberId: string;              // Member UUID
  memberName: string;            // Member name
  memberEmail?: string;          // Member email
  scheduleId: string;            // Schedule UUID
  visitNumber: number;           // Visit sequence number
  visitDate?: string;            // ISO date string
  meetingDate?: string;          // ISO date string
  lessonContent?: string;        // Lesson description
  observation?: string;          // Schedule observation
  meetingRoom?: string;          // Meeting room name
  teamName: string;              // Team description
  shelterName: string;           // Shelter name
  createdAt: Date;               // Record creation timestamp
  updatedAt: Date;               // Record update timestamp
}
```

## Examples

### Basic Request

```bash
GET /attendance/records?page=1&limit=20
```

### Filter by Schedule

```bash
GET /attendance/records?scheduleId=fc59e33a-d4fe-49cf-a668-64bfc08218dd
```

### Filter by Member Name

```bash
GET /attendance/records?memberName=Member&limit=50
```

### Filter by Attendance Type

```bash
GET /attendance/records?type=present
```

### Combined Filters

```bash
GET /attendance/records?scheduleId=fc59e33a-d4fe-49cf-a668-64bfc08218dd&type=absent&limit=100
```

### Date Range Filter

```bash
GET /attendance/records?startDate=2026-01-01&endDate=2026-01-31&sortBy=visitDate&sortOrder=asc
```

## Response Example

```json
{
  "data": [
    {
      "id": "5571bc31-08c9-4176-b28e-666ad4954f3f",
      "type": "present",
      "category": "visit",
      "comment": null,
      "memberId": "d83c55be-f00b-42fa-963b-c6eaba943cfe",
      "memberName": "Auto Member Extra 30",
      "memberEmail": "auto_member_extra_30_1768075072553@teste.com",
      "scheduleId": "fc59e33a-d4fe-49cf-a668-64bfc08218dd",
      "visitNumber": 2,
      "visitDate": "2026-01-09T10:00:00.000Z",
      "meetingDate": "2026-01-08T10:00:00.000Z",
      "lessonContent": "A Arca de Noe",
      "observation": null,
      "meetingRoom": "Sala 210",
      "teamName": "Equipe 2",
      "shelterName": "ITV - Instituto Tranformando Vidas",
      "createdAt": "2026-01-12T00:23:37.106Z",
      "updatedAt": "2026-01-12T00:23:37.106Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 100,
    "total": 5,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

## Access Control

- **Admin users**: Can view all attendance records across all teams
- **Non-admin users**: Can only view records for teams they belong to (as member or leader)

## Notes

- The `memberName` filter performs a partial, case-sensitive LIKE search
- Date filters apply to both `visitDate` and `meetingDate` fields
- Empty result sets return `data: []` with appropriate metadata
- Total count reflects filtered results, not all records
