# NDK Dispatch Portal

Static first pass for the NDK Dispatch company portal. It includes role-based login, dispatcher shift takeover, editable daily recap rows, owner visibility, admin user registration, client setup, shifts, announcements, and local password changes.

## Open

Open `index.html` in a browser, or run the local static server:

```bash
node server.mjs
```

Then visit `http://127.0.0.1:4173/`.

## Demo logins

- Admin: `manager@ndk-dispatch.com` / `admin123`
- Dispatcher: `dispatcher@ndk-dispatch.com` / `dispatch123`
- Owner: `owner@example.com` / `owner123`

## HOS alerts (owner)

- **≤ 60 minutes** on break, drive, duty, workday, or cycle (while on duty/driving): warning alert in the browser/PWA
- **≤ 30 minutes**: critical alert on phone (if enabled) **and** Telegram (if configured)
- Tap **Enable phone alerts** on the owner home or command center, then allow notifications when prompted
- For phone notifications: install the app to your home screen (PWA), keep notifications allowed
- Telegram works even when the portal is closed, as long as `node server.mjs` is running

### Telegram setup

Add to `.env` (see `.env.example`):

```
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

Restart the server. Critical HOS risks are sent automatically every ~2 minutes while the server runs.

## Notes

- Data is stored in browser `localStorage` for this prototype.
- Admin-created users get a temporary password and can change it from Settings.
- Daily recap supports separate days. Use the day selector to switch tables.
- Admins and dispatchers can import an Amazon Trips CSV. The portal imports rows that have a real `Trip ID`, groups load rows into recap rows by `Block ID + Trip ID`, imports VRIDs from `Load ID`, calculates requested start as 25 minutes before first upcoming arrival, creates the needed recap day, and leaves dispatcher-only fields blank.
- The next production step is to connect this UI to real authentication, database tables, file import for the Coda/Sheets daily recap, and role-scoped API endpoints.
