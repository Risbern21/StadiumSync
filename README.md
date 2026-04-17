# 🏟️ StadiumSync — Smart Stadium Experience Platform

> Real-time event coordination and seamless attendee experience for large-scale sporting venues.

---

## 🎯 Chosen Vertical

**Physical Event Experience** — Improving attendee experience at large-scale sporting venues through real-time coordination, crowd management, digital menus, and feedback collection.

---

## 🚀 Live Features

| Feature | Description | Google Service |
|---|---|---|
| 🎫 **Event Code Gate** | Coordinator generates a unique code; attendees must enter it to access event info | Firebase Firestore |
| 🗺️ **Venue Map** | Coordinators upload venue/seating maps; attendees view them live | Firebase Storage + Firestore |
| 🚪 **Exit Guide** | Coordinators broadcast stand-by-stand exit instructions in real time | Firebase Firestore |
| 📣 **Chant Broadcaster** | Coordinators send crowd chants; attendees see them live and can join | Firebase Firestore |
| 🍔 **Food Menus** | Coordinators manage stall menus with images; attendees browse all menus | Firebase Storage + Firestore |
| 📝 **Feedback Form** | Attendees submit star-rated, categorised feedback stored in Firestore | Firebase Firestore |

---

## 🛠️ Tech Stack

- **Frontend**: Vite + React (SPA)
- **Styling**: Vanilla CSS — dark-mode, glass-morphism, mobile-first responsive
- **Firebase Firestore**: Real-time data sync via `onSnapshot` listeners
- **Firebase Storage**: Image uploads (venue maps, stall photos)
- **Firebase Auth**: Email/password authentication for coordinator portal
- **Routing**: React Router v6

---

## 📐 Architecture & Logic

```
StadiumSync
├── / (Landing)              — Role selection (Coordinator / Attendee)
├── /coordinator/login       — Firebase Auth sign-in
├── /coordinator             — Protected dashboard
│   ├── Event Code           — Generate/activate unique code → Firestore config/eventCode
│   ├── Map Manager          — Upload map → Storage → URL in Firestore config/venueMap
│   ├── Exit Guide           — Write to Firestore config/egressMessage → live on attendee screens
│   ├── Chant Broadcaster    — Write to Firestore config/activeChant → live on attendee screens
│   ├── Menu Manager         — CRUD on Firestore menus/ collection + image uploads
│   └── Feedback Viewer      — Read and filter from Firestore feedback/ collection
├── /attendee (Gate)         — Attendee enters event code; validated against Firestore
│                              Valid code stored in sessionStorage
└── /attendee/view           — Gated view (redirects to gate if no session code)
    ├── Venue Map             — Reads config/venueMap
    ├── Exit Guide            — Reads config/egressMessage (pulsing alert when active)
    ├── Chants                — Reads config/activeChant (join button)
    ├── Food Menus            — Reads menus/ collection
    └── Feedback Form         — Writes to feedback/ collection
```

### Firestore Data Schema

```
config/
  eventCode      → { code, eventName, active, updatedAt }
  venueMap       → { imageUrl, updatedAt }
  egressMessage  → { message, active, updatedAt }
  activeChant    → { text, active, updatedAt }

menus/
  {stallId}      → { name, items:[{name,price}], imageUrl, createdAt }

feedback/
  {docId}        → { rating, comment, category, createdAt }
```

---

## ⚙️ Setup & Running Locally

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd <repo-folder>
npm install
```

### 2. Configure Firebase
1. Create a project at [Firebase Console](https://console.firebase.google.com)
2. Enable **Firestore**, **Storage**, and **Authentication** (Email/Password)
3. Copy `.env.example` → `.env` and fill in your credentials:

```bash
cp .env.example .env
```

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 3. Create a Coordinator Account
In the Firebase Console → Authentication → Add user (email + password). This account is used to log into the coordinator dashboard.

### 4. Set Firestore & Storage Rules
Firestore rules (for development):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /config/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /menus/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /feedback/{doc} {
      allow read: if request.auth != null;
      allow write: if true;
    }
  }
}
```

Storage rules:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### 5. Run the app
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

> **Mobile testing**: The dev server is also available on your local network IP (shown in terminal). Open it on any mobile device on the same WiFi.

---

## 📱 Responsive Design

The app is fully mobile-responsive:
- Sticky header with compact layout
- Horizontally scrollable tab navigation
- Touch-friendly tap targets
- Fluid typography (uses `clamp()`)
- Single-column layouts on small screens
- `100dvh` for correct height on mobile browsers

---

## 🔐 Assumptions

1. A single coordinator account is pre-created in Firebase Auth (no registration flow needed for the event scope).
2. Attendees do not require authentication — the attendee view is fully public.
3. Prices in menus are entered as free-text strings (e.g. "₹120" or "$5") to support any currency.
4. Feedback is actively synced; coordinators can view and filter ratings directly in their dashboard.
5. Only one active egress message and one active chant exist at a time (last write wins).

---

## 🏆 Evaluation Highlights

- **Code Quality**: Modular page/component structure, consistent naming, no dead code
- **Security**: Firebase Auth guards coordinator routes; Firestore rules separate read/write permissions
- **Efficiency**: `onSnapshot` listeners for real-time sync with automatic cleanup on unmount
- **Accessibility**: Semantic HTML, ARIA roles on tabs, labelled form inputs, keyboard-navigable
- **Google Services**: Firebase Firestore, Storage, and Auth used meaningfully throughout
- **Mobile-first**: Full responsiveness tested down to 320px width

---

*Built for the Smart Stadium Challenge — Google Antigravity Hackathon*
