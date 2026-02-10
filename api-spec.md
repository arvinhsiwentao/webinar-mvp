# API Specification

## Webinar Endpoints

### GET /api/webinars/:id
Get webinar details for display.

**Response:**
```json
{
  "id": "abc123",
  "title": "AIC雙風口機遇講座",
  "speaker": {
    "name": "王大明",
    "avatar": "https://cdn.example.com/speaker.jpg"
  },
  "startTime": "2026-02-15T14:00:00+08:00",
  "status": "scheduled" | "live" | "ended",
  "registrationCount": 1234
}
```

### POST /api/webinars
Create new webinar (admin only).

**Request:**
```json
{
  "title": "課程標題",
  "speakerName": "講者名稱",
  "videoUrl": "https://cdn.example.com/video.m3u8",
  "sessions": [
    { "startTime": "2026-02-15T14:00:00+08:00" },
    { "startTime": "2026-02-15T20:00:00+08:00" }
  ]
}
```

### GET /api/webinars/:id/config
Get frontend config (CTA, auto-chat, etc).

**Response:**
```json
{
  "videoUrl": "https://cdn.example.com/video.m3u8",
  "autoChat": [
    { "time": 30, "name": "Alex", "message": "開始了！" },
    { "time": 60, "name": "小美", "message": "期待" }
  ],
  "cta": [
    {
      "showAtSec": 3600,
      "hideAtSec": 4500,
      "buttonText": "立即購買",
      "url": "https://shop.example.com/checkout",
      "promoText": "原價 $9,900 → 限時 $4,900",
      "showCountdown": true
    }
  ],
  "viewerConfig": {
    "baseCount": 50,
    "multiplier": 2
  }
}
```

## Registration Endpoints

### POST /api/webinars/:id/register
Register for a webinar.

**Request:**
```json
{
  "name": "使用者名稱",
  "email": "user@example.com",
  "phone": "+886912345678",
  "sessionId": "session-abc"
}
```

**Response:**
```json
{
  "success": true,
  "registrationId": "reg-xyz",
  "joinUrl": "https://live.example.com/join/abc123?token=xxx",
  "calendarLinks": {
    "google": "https://calendar.google.com/...",
    "ical": "https://live.example.com/ical/abc123.ics"
  }
}
```

### GET /api/webinars/:id/registrations
List registrations (admin only).

**Query params:**
- `limit` (default: 50)
- `offset` (default: 0)
- `format` (json | csv)

## WebSocket Events

### Connection
```javascript
const socket = io('wss://live.example.com', {
  query: { 
    webinarId: 'abc123',
    token: 'user-token'
  }
});
```

### Client → Server

**join** — Join the webinar room
```json
{ "userName": "Alex" }
```

**message** — Send a chat message
```json
{ "content": "Hello everyone!" }
```

**reaction** — Send an emoji reaction
```json
{ "emoji": "👍" }
```

### Server → Client

**viewers** — Viewer count update
```json
{ "count": 234 }
```

**message** — New chat message
```json
{
  "id": "msg-123",
  "userName": "Alex",
  "content": "Hello!",
  "timestamp": 1707552000000,
  "isAdmin": false
}
```

**system** — System announcement
```json
{
  "type": "announcement",
  "content": "直播即將開始"
}
```

## Admin Endpoints

### PUT /api/webinars/:id
Update webinar settings.

### DELETE /api/webinars/:id
Delete webinar (soft delete).

### GET /api/webinars/:id/analytics
Get webinar analytics.

**Response:**
```json
{
  "registrations": 500,
  "attendance": 200,
  "peakViewers": 180,
  "avgWatchTime": 2400,
  "ctaClicks": 45,
  "conversions": 12,
  "conversionRate": 0.06
}
```

### POST /api/webinars/:id/broadcast
Send announcement to all viewers.

**Request:**
```json
{
  "message": "限時優惠即將結束！"
}
```

## Error Responses

```json
{
  "error": {
    "code": "WEBINAR_NOT_FOUND",
    "message": "Webinar not found"
  }
}
```

Common error codes:
- `WEBINAR_NOT_FOUND` (404)
- `SESSION_FULL` (400)
- `REGISTRATION_CLOSED` (400)
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
