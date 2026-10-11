# Contract: app "Report a problem" -> getkankan.com/contact

How the static site reads the report. There is no server, no POST, no spam check and no GitHub issue.

## Flow
1. The app opens `https://getkankan.com/contact#report=<payload>` in the default browser.
2. `contact.js` decodes the fragment in the browser only. Browsers never send the fragment to a server.
3. The page removes `#report=...` from the address bar, shows the report as plain text (`textContent`), and offers "Copy report" and "Email us" (a `mailto:` to support@getkankan.com).
4. The user copies the report and emails it. Nothing is sent by the page itself.

## Payload (version 1)
`<payload>` = base64url (RFC 4648 section 5, `-` and `_`; `=` padding optional, at most 2) of the UTF-8 bytes of one JSON object with exactly these 7 keys:

```json
{"v":1,"kind":"bug","appVersion":"1.4.0","build":"210","platform":"iOS","osVersion":"18.1","diagnostics":"free text, newlines allowed"}
```

| Field | Rule |
|---|---|
| `v` | number, must be `1` |
| `kind` | string, must be `"bug"` |
| `appVersion`, `build`, `platform`, `osVersion` | string, 1-32 chars from `A-Z a-z 0-9 space . _ + ( ) -` |
| `diagnostics` | string, at most 32 KB (32,768 bytes) of UTF-8, may be empty |

- No other keys, and none missing. Otherwise the report is rejected.
- The whole fragment payload is at most 65,536 characters.
- Invalid input (bad base64url, bad UTF-8, bad JSON, wrong field) shows a friendly error and no report.
- Standard base64 (`+` and `/`) is rejected. Use base64url.
- `diagnostics` must never contain card or board titles, notes or checklist text, names, email addresses or device identifiers. See privacy.html for the list of report contents.

## Changing the format
Add `"v": 2` instead of changing version 1, and keep accepting version 1.
