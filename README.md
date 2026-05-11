# autosw

Express server that displays a live SyncWords caption iframe and supports remote page refresh.

## Setup

```bash
npm install
```

## Running

```bash
email=you@example.com password=yourpassword node index.js
```

## Endpoints

### `GET /cap`

Logs into SyncWords, finds the next upcoming event, and serves an HTML page with a captions iframe.

```
http://localhost:3000/cap
```

The iframe loads:
```
https://live.syncwords.com/c-{eventSlug}?bg_color=000000&font_size=80px&font_color=ffffff
```

The page also opens a persistent SSE connection to `/sse` and will automatically reload itself when a refresh is triggered.

---

### `POST /refresh`

Sends a refresh signal to all clients currently viewing `/cap`, causing their browsers to reload the page.

```bash
curl -X POST http://localhost:3000/refresh
```

Response:
```json
{ "refreshed": 2 }
```

The `refreshed` value is the number of connected clients that were notified.

---

### `GET /sse`

Server-Sent Events stream used internally by `/cap` to receive reload signals. You don't need to call this directly.
