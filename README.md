# autosw

Express server that displays a live SyncWords caption iframe and supports remote page refresh.

## Setup

```bash
npm install
```

## Authentication

All endpoints except `/cap` and `/sse` require an `X-API-Key` header. Set the key via the `apiKey` environment variable (or in `ecosystem.config.js`).

If `apiKey` is not set, authentication is disabled.

```bash
curl -X POST http://localhost:3000/refresh \
  -H "X-API-Key: your-api-key"
```

Requests without a valid key receive a `401` response:
```json
{ "error": "Unauthorized" }
```

## Running

```bash
email=you@example.com password=yourpassword node index.js
```

## Running with PM2

Install PM2 globally if you haven't already:

```bash
npm install -g pm2
```

Fill in your credentials in `ecosystem.config.js`, then start the server:

```bash
pm2 start ecosystem.config.js
```

Or without the ecosystem file:

```bash
email=you@example.com password=yourpassword pm2 start index.js --name autosw
```

Useful commands:

```bash
pm2 logs autosw        # tail logs
pm2 status             # check running processes
pm2 restart autosw     # restart the server
pm2 stop autosw        # stop the server
```

To have PM2 restart the server automatically on reboot:

```bash
pm2 startup            # generates and prints a command — run the output command as instructed
pm2 save               # saves the current process list so it's restored on boot
```

## Launch Safari at a Specific Size

To open Safari at a specific size on login, create an AppleScript app and add it as a Login Item.

**1. Create the script**

Open Script Editor (Spotlight → "Script Editor"), paste the following, and adjust the dimensions as needed:

```applescript
tell application "Safari"
  activate
  open location "http://localhost:3000/cap"
  delay 1
  set bounds of front window to {0, 0, 1920, 1080}
end tell
```

`bounds` is `{left, top, right, bottom}` in pixels.

**2. Save it as an app**

File → Export → set File Format to **Application**. Save it somewhere permanent like `~/Applications/`.

**3. Add it as a Login Item**

System Settings → General → Login Items → click **+** and select the saved app.

---

## Launch at Login (no browser chrome)

On macOS Sonoma and later, Safari can save any page as a standalone web app with no title bar, address bar, or tabs.

**1. Add to Dock**

With the server running, open `http://localhost:3000/cap` in Safari, then go to File → Add to Dock. Give it a name and click Add.

**2. Add it as a Login Item**

System Settings → General → Login Items → click **+** and select the web app (it will appear in `~/Applications/` as the name you gave it).

The web app will launch automatically on login in its own frameless window with no browser chrome. Combined with `pm2 startup` + `pm2 save`, both the server and the display launch automatically on boot.

## Endpoints

### `GET /health`

Returns server health info — useful for uptime monitoring.

```bash
curl http://localhost:3000/health
```

Response:
```json
{ "ok": true, "uptime": 3600, "clients": 1, "timestamp": "2026-05-11T14:00:00.000Z" }
```

`uptime` is in seconds. `clients` is the number of currently connected SSE clients.

---

### `POST /system/shutdown`

Shuts down the host machine.

```bash
curl -X POST http://localhost:3000/system/shutdown
```

---

### `POST /system/restart`

Restarts the host machine.

```bash
curl -X POST http://localhost:3000/system/restart
```

---

### `GET /status`

Returns the current server status — updated after every operation. Check here for errors instead of reading response bodies.

```bash
curl http://localhost:3000/status
```

Response:
```json
{ "ok": true, "message": "Showing event: Sunday Service (EsoKid)", "timestamp": "2026-05-11T14:00:00.000Z" }
```

`ok` is `false` and `message` contains the error detail when something goes wrong.

---

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

### `POST /update`

Finds the event currently in progress and pushes its caption iframe URL to all connected clients, updating the iframe in place.

```bash
curl -X POST http://localhost:3000/update
```

Response:
```json
{ "slug": "EsoKid", "src": "https://live.syncwords.com/c-EsoKid?bg_color=000000&font_size=80px&font_color=ffffff", "pushed": 2 }
```

Returns `404` if no event is currently in progress.

---

### `POST /show/:id`

Looks up a specific event by ID, fetches its slug, and pushes the new caption iframe URL to all connected clients — updating the iframe in place without a full page reload.

```bash
curl -X POST http://localhost:3000/show/42416
```

Response:
```json
{ "slug": "EsoKid", "src": "https://live.syncwords.com/c-EsoKid?bg_color=000000&font_size=80px&font_color=ffffff", "pushed": 2 }
```

---

### `GET /sse`

Server-Sent Events stream used internally by `/cap` to receive reload signals. You don't need to call this directly.
