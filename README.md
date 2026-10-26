# VaultSync (React frontend, Phase 1)

**Secure document collection, verification and controlled sharing for organizations (colleges, companies, offices).**

Built with **React 18 + Vite + React Router**. The backend (Spring Boot) and database (PostgreSQL) are planned for the
next phase. Until then the browser's `localStorage` plays the role of the database, behind a small data layer
(`src/lib/store.js`) that will be swapped for real REST API calls later.

## The problem it solves
Organizations collect documents (fee receipts, certificates, ID proofs, internship letters) over WhatsApp, email and
paper. There is no single place to ask for and track them, no verification trail, personal files get forwarded to many
people, links never expire, and owners never know who opened their file.

VaultSync fixes this with a **privacy-first** design:
- Every person has a **private vault**. Nobody else, including Admin and Manager, can browse it.
- Staff create **document requests**. People submit **one chosen document** (consent-based); staff approve or reject with a reason.
- Files are shared with outsiders via **expiring, password-protected, download-limited links**.
- Owners see **who accessed their documents** (transparency log).
- Documents with a **validity date** (ID, certificates) trigger expiry warnings.
- **Announcements:** the Admin publishes organization-wide notices that every user can read.

## How to run
Requires Node.js 18 or newer.
```
npm install
npm run dev        # opens the app at http://localhost:5173
npm test           # data-layer tests (privacy, workflow, announcements, permissions)
npm run build      # production build into dist/
```
Pages use hash URLs (`#/dashboard`), so no server configuration is needed.

## Demo logins
| Role    | Email                  | Password   |
|---------|------------------------|------------|
| Admin   | admin@vaultsync.com    | admin123   |
| Manager | manager@vaultsync.com  | manager123 |
| User    | user@vaultsync.com     | user123    |
| User 2  | kabir@vaultsync.com    | user123    |

Demo share links (run the app, then open):
- `http://localhost:5173/#/share/demo1234abcd` (public, no password)
- `http://localhost:5173/#/share/secure5678xy` (password: `vault123`)

To reset the demo data: browser DevTools > Application > Local Storage > clear, then reload.

## Who can do what
| Action                                       | Admin        | Manager      | User |
|----------------------------------------------|--------------|--------------|------|
| Own private vault (upload, share, versions)  | Yes          | Yes          | Yes  |
| See other people's vault                     | No           | No           | No   |
| Create document requests                     | Yes          | Yes          | No   |
| Review / approve submissions                 | Own requests | Own requests | No   |
| See progress of all requests                 | Yes          | Own only     | No   |
| Manage users and roles                       | Yes          | No           | No   |
| **Read announcements**                       | **Yes**      | **Yes**      | **Yes** |
| **Create / edit / delete announcements**     | **Yes**      | **No**       | **No**  |
| **See expired announcements**                | **Yes**      | **No**       | **No**  |

## Announcements module
A simple organization-wide notice board.

- **Admin only** can create, edit and delete. Each announcement has a title (3 to 100 characters), a message (5 to 1000),
  an optional **Important** flag, an optional **expiry date**, and an automatic creation date.
- **Everyone logged in** sees the same active announcements, newest first.
- **Dashboard:** an "Announcements" card shows the latest **3 active** ones (title, message, posting date, Important badge)
  with a **View All** button. It looks the same for all three roles.
- **Announcements page** (sidebar, all roles): all active announcements. Once the expiry date passes, an announcement
  disappears for Managers and Users automatically. The Admin keeps seeing expired ones (greyed, "Expired" badge) with
  **All / Active / Expired** filters, and can edit, delete or reactivate them. To take one down immediately without
  deleting it, edit it and pick a past expiry date.
- Posting, editing and deleting are written to the Admin's organization audit log.
- **Not included by design:** email, SMS, push or real-time notifications, and read/unread tracking.
- Sample announcements (one Important, one expired) are seeded for the demo. Projects that already had demo data get
  them automatically without losing anything.

**Where the permission check lives.** The rules are enforced inside the data layer, not by hiding buttons.
`createAnnouncement`, `updateAnnouncement` and `deleteAnnouncement` in `src/lib/store.js` behave like API endpoints:
they identify the caller from the session, re-check the role against the users table (so a forged `role` in the
session is ignored), and throw `401` (not logged in), `403` (not Admin), `404` (unknown id) or `400` (invalid input,
with a message per field). The permission check runs *before* validation, so non-admins learn nothing about the data.
When the Spring Boot backend is added, the same four rules move to the controller (`@PreAuthorize("hasRole('ADMIN')")`
on POST, PUT and DELETE).

## Main workflow
```
Manager/Admin creates request (title, deadline, file types, people)
   → User sees it in Requests → picks ONE document from their vault → Submit
   → Reviewer downloads (logged, owner can see it) → Approve / Reject with reason
   → Rejected: user resubmits | Pending: user can withdraw
```

## Project structure
```
vaultsync-react/
├── index.html
├── package.json, vite.config.js
├── tests/                      node:test suites (no extra test dependency)
│   ├── announcements.test.js   CRUD, validation, expiry, roles, direct-call permission checks
│   ├── privacy-workflow.test.js  private vault, requests, activity privacy, links
│   └── helpers.js
└── src/
    ├── main.jsx, App.jsx       entry point and routes (HashRouter)
    ├── styles/style.css        one stylesheet (same design as the HTML version)
    ├── lib/
    │   ├── store.js            data layer: storage, rules, announcements "API"  (future: REST calls)
    │   ├── hooks.js            useData() re-renders components when data changes
    │   ├── format.js, download.js
    ├── components/             Layout (sidebar/top bar), Protected (route guard), Modal, Toast,
    │                           Badges, AnnouncementItem
    └── pages/                  Login, Dashboard, Documents (My Vault), Requests, Announcements,
                                Shared, SharePage (public link page), Activity, Users
```

### How the React version works (for the viva)
- **Routing:** React Router maps each URL to a page component. `Protected` redirects to login when there is no session
  and to the dashboard when the role is not allowed (for example, `#/users` for a non-Admin).
- **State:** components never touch `localStorage` directly. They call functions in `store.js`, which save and then
  notify subscribers. `useData()` (built on React's `useSyncExternalStore`) re-renders any component that reads data,
  so every screen stays in sync, including across browser tabs.
- **Components:** the old HTML pages became components; repeated pieces (modal, toast, sidebar, badges, announcement card)
  are written once and reused.
- **Why this prepares for the backend:** only `store.js` knows where the data lives. Replacing its functions with
  `fetch()` calls to Spring Boot changes no page component.

## Planned (next phase)
- Spring Boot REST backend, Spring Security with real JWT, server-side enforcement of all rules
- PostgreSQL (users, documents, versions, links, requests, submissions, announcements, audit logs)
- Real file storage (local, then AWS S3), hashed passwords
- Folder hierarchy, OCR search, duplicate detection, auto tags, email expiry reminders, QR sharing
- Redis cache, Docker deployment

## Known limits of the prototype (by design)
- Data lives in the browser only; file contents are not stored (downloads give a demo text file)
- Passwords are plain text in localStorage; the backend will hash them
- The session "token" is a placeholder, not a real JWT
- Because everything runs in the browser, anyone with DevTools can edit localStorage directly. The permission checks above
  are the contract the backend will enforce for real; they cannot protect data from the person who owns the browser
