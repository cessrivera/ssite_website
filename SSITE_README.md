# SSITE Web Management System 🎓

**Student Society on Information Technology Education** - Complete web-based information and content management system.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

Visit `http://localhost:5173`

---

## 🔥 Firebase Setup (Already Configured)

Your Firebase project is connected! Here's what's enabled:
- **Authentication**: Email/Password
- **Firestore Database**: Real-time NoSQL database
- **Storage**: For images/files (ready to use)

---

## 👤 Create Your First Admin Account

1. Go to `http://localhost:5173/login`
2. Click **"Admin Login →"**
3. Click **"First time? Set up admin account"**
4. Enter email and password
5. Login and start managing!

---

## ✨ Features Implemented

### Public Pages (No Login Required)
| Page | Path | Features |
|------|------|----------|
| **Home** | `/` | Hero, quick access, featured announcements |
| **Announcements** | `/announcements` | Search, filter by category, view all |
| **Events** | `/events` | Calendar view, upcoming events |
| **Officers** | `/officers` | Officer profiles, filter by year |
| **Polls** | `/polls` | Active polls, results visualization |
| **Contact** | `/contact` | Contact form, social links |
| **Membership** | `/membership` | Registration form |
| **Login** | `/login` | Member & admin authentication |

### Admin Dashboard (Requires Admin Login)
| Page | Path | Features |
|------|------|----------|
| **Dashboard** | `/admin` | Overview, stats, recent activity |
| **Announcements** | `/admin/announcements` | ✅ Create, Edit, Delete |
| **Events** | `/admin/events` | ✅ Create, Edit, Delete |
| **Officers** | `/admin/officers` | ✅ Create, Edit, Delete |
| **Polls** | `/admin/polls` | Create, Edit, Close |
| **Members** | `/admin/members` | View, approve registrations |
| **Settings** | `/admin/settings` | Change password |

---

## 📁 Project Structure

```
ssite/
├── src/
│   ├── components/
│   │   ├── admin/
│   │   │   └── AdminLayout.jsx       # Admin dashboard layout
│   │   ├── auth/
│   │   │   └── ProtectedRoute.jsx    # Route protection
│   │   └── layout/
│   │       ├── Navbar.jsx            # Main navigation
│   │       ├── Footer.jsx            # Footer
│   │       └── Layout.jsx            # Page wrapper
│   ├── config/
│   │   ├── firebase.js               # Firebase configuration
│   │   └── setupAdmin.js             # Admin setup script
│   ├── contexts/
│   │   └── AuthContext.jsx           # Auth state management
│   ├── pages/
│   │   ├── Home.jsx                  # Landing page
│   │   ├── Announcements.jsx         # Public announcements
│   │   ├── Events.jsx                # Public events
│   │   ├── Officers.jsx              # Public officers
│   │   ├── Polls.jsx                 # Public polls
│   │   ├── Contact.jsx               # Contact page
│   │   ├── Membership.jsx            # Membership form
│   │   ├── Login.jsx                 # Login page
│   │   └── admin/
│   │       ├── Dashboard.jsx         # Admin dashboard
│   │       ├── Announcements.jsx     # Manage announcements
│   │       ├── Events.jsx            # Manage events
│   │       ├── Officers.jsx          # Manage officers
│   │       ├── Polls.jsx             # Manage polls
│   │       ├── Members.jsx           # Manage members
│   │       └── Settings.jsx          # Admin settings
│   ├── services/
│   │   ├── announcementService.js    # Announcement CRUD
│   │   ├── eventService.js           # Event CRUD
│   │   ├── officerService.js         # Officer CRUD
│   │   └── pollService.js            # Poll CRUD
│   ├── App.jsx                       # Main app component
│   └── main.jsx                      # Entry point
├── package.json
└── vite.config.js
```

---

## 🔐 Authentication System

### User Roles
- **Public**: View-only access to all public pages
- **Member**: Registered students (future feature)
- **Admin**: Full CRUD access to admin dashboard

### Protected Routes
- Admin routes automatically redirect to login if not authenticated
- Role-based access control via Firestore

---

## 💾 Firestore Database Collections

### Collections Created:
```
/announcements
  ├── title: string
  ├── date: string
  ├── time: string
  ├── category: Academic | Achievement | Competition | Event
  ├── content: string
  ├── status: Published | Draft
  ├── createdAt: timestamp
  └── updatedAt: timestamp

/events
  ├── title: string
  ├── date: string
  ├── time: string
  ├── venue: string
  ├── description: string
  ├── createdAt: timestamp
  └── updatedAt: timestamp

/officers
  ├── name: string
  ├── role: string
  ├── course: string
  ├── section: string
  ├── year: string
  ├── order: number
  ├── createdAt: timestamp
  └── updatedAt: timestamp

/polls
  ├── question: string
  ├── options: array
  ├── endDate: string
  ├── votes: object
  ├── status: Active | Closed
  ├── createdAt: timestamp
  └── updatedAt: timestamp

/users
  ├── email: string
  ├── role: admin | member
  ├── name: string
  ├── status: active | pending
  ├── studentNumber: string (for members)
  └── createdAt: timestamp
```

---

## 🎨 Tech Stack

- **Frontend**: React 19 + Vite
- **Routing**: React Router v7
- **Styling**: Tailwind CSS v4
- **Backend**: Firebase (Auth + Firestore)
- **State Management**: React Context API

---

## 📝 Usage Guide

### For Admins

1. **Login**: Go to `/login` → Click "Admin Login"
2. **Create Announcement**:
   - Navigate to `/admin/announcements`
   - Click "+ Add Announcement"
   - Fill form and submit
3. **Add Officer**:
   - Navigate to `/admin/officers`
   - Click "+ Add Officer"
   - Fill form and submit
4. **Create Event**:
   - Navigate to `/admin/events`
   - Click "+ Add Event"
   - Fill form and submit

### For Members (Coming Soon)
- Register via `/membership`
- Wait for admin approval
- Login to view member-only content

---

## 🛠️ Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

---

## 📌 Next Steps / Future Enhancements

- [ ] Image upload for announcements and officers
- [ ] Member authentication and profiles
- [ ] Poll voting system for members
- [ ] Email notifications
- [ ] Advanced search and filtering
- [ ] Analytics dashboard
- [ ] Export data to PDF/CSV
- [ ] Dark mode support

---

## 🐛 Troubleshooting

### Firebase Connection Issues
1. Check that Firebase config in `src/config/firebase.js` is correct
2. Verify Firestore database is in "test mode" or has proper rules
3. Ensure Authentication is enabled for Email/Password

### Admin Can't Login
1. Make sure you created admin account via setup screen
2. Check Firestore → `users` collection → verify `role: 'admin'`

---

## 📄 License

MIT License - Built for SSITE

---

## 👨‍💻 Developed by

**GitHub Copilot** in collaboration with the SSITE development team

**Last Updated**: January 14, 2026
