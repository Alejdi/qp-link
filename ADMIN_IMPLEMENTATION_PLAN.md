# Admin Panel Implementation Plan

## Overview
Create a comprehensive admin dashboard that gives you complete control over the QP Link platform - user management, analytics, real-time monitoring, and system controls.

---

## Phase 1: Database Schema & Authentication

### 1.1 Add Admin Fields to Users Table (Supabase)
```sql
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';
ALTER TABLE users ADD COLUMN is_banned BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN banned_at TIMESTAMP;
ALTER TABLE users ADD COLUMN ban_reason TEXT;
ALTER TABLE users ADD COLUMN last_active TIMESTAMP;
ALTER TABLE users ADD COLUMN current_page TEXT;
ALTER TABLE users ADD COLUMN subscription_tier TEXT DEFAULT 'free';
ALTER TABLE users ADD COLUMN subscription_expires_at TIMESTAMP;
```

### 1.2 Create Banned IPs Table
```sql
CREATE TABLE banned_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL UNIQUE,
  reason TEXT,
  banned_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 1.3 Create Activity Logs Table
```sql
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  page TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 1.4 Update NextAuth Session
- Add `role` to JWT token
- Add `role` to session object
- Check for banned status on sign-in

---

## Phase 2: Admin API Routes

### 2.1 Admin Middleware Helper
Create `/lib/admin.ts`:
- `isAdmin(session)` - Check if user is admin
- `requireAdmin(session)` - Throw if not admin
- Your email will be hardcoded as the super admin

### 2.2 Admin API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/users` | GET | List all users with filters |
| `/api/admin/users/[id]` | GET | Get user details |
| `/api/admin/users/[id]/ban` | POST | Ban/unban user |
| `/api/admin/users/[id]/role` | PUT | Change user role |
| `/api/admin/analytics` | GET | Platform-wide analytics |
| `/api/admin/analytics/realtime` | GET | Real-time user activity |
| `/api/admin/ips` | GET | List banned IPs |
| `/api/admin/ips/ban` | POST | Ban IP address |
| `/api/admin/ips/[ip]/unban` | DELETE | Unban IP |
| `/api/admin/transactions` | GET | All transactions |
| `/api/admin/products` | GET | All products/invoices |
| `/api/admin/activity` | GET | Activity logs |

---

## Phase 3: Admin Dashboard Pages

### 3.1 Admin Layout (`/app/admin/layout.tsx`)
- Separate layout from user dashboard
- Admin-specific navigation
- Quick stats header
- Real-time notifications

### 3.2 Admin Pages Structure

```
/app/admin/
├── page.tsx                 # Main dashboard with overview
├── layout.tsx               # Admin-specific layout
├── users/
│   ├── page.tsx            # Users list with search/filter
│   └── [id]/page.tsx       # Individual user details
├── analytics/
│   ├── page.tsx            # Platform analytics
│   └── realtime/page.tsx   # Live user tracking
├── transactions/
│   └── page.tsx            # All payments/withdrawals
├── products/
│   └── page.tsx            # All invoices/products
├── security/
│   ├── page.tsx            # Banned IPs, security logs
│   └── activity/page.tsx   # Activity logs
└── settings/
    └── page.tsx            # Platform settings
```

---

## Phase 4: Admin Dashboard Features

### 4.1 Main Dashboard (`/admin`)
- **Quick Stats Cards:**
  - Total users (today/week/month)
  - Active users right now
  - Total revenue
  - Total transactions today
  - New signups today
  - Pending KYC reviews

- **Charts:**
  - User registrations over time
  - Revenue over time
  - Geographic distribution map
  - Device breakdown

- **Recent Activity Feed:**
  - Latest signups
  - Recent transactions
  - Security alerts

### 4.2 Users Management (`/admin/users`)
- **Table Columns:**
  - Avatar, Name, Email
  - Phone number
  - Role (user/admin)
  - Subscription tier
  - KYC status
  - Total revenue generated
  - Products count
  - Last active
  - Current page (real-time)
  - Status (active/banned)
  - Actions

- **Filters:**
  - By role
  - By subscription
  - By KYC status
  - By date range
  - Search by name/email

- **Actions:**
  - View details
  - Ban/Unban user
  - Change role
  - Change subscription
  - View user's products
  - View user's transactions
  - Impersonate (login as user)

### 4.3 User Details (`/admin/users/[id]`)
- Full profile information
- ID documents (front/back images)
- KYC approval/rejection
- Activity history
- All products created
- All transactions
- Login history
- Current session info

### 4.4 Analytics (`/admin/analytics`)
- **User Analytics:**
  - Signups by day/week/month
  - User retention
  - Active users over time
  - Geographic distribution

- **Revenue Analytics:**
  - Total revenue by period
  - Revenue by user
  - Average transaction value
  - Payment success rate

- **Product Analytics:**
  - Products created over time
  - Most popular products
  - Conversion rates

### 4.5 Real-time Monitoring (`/admin/analytics/realtime`)
- Live user count
- Users currently online (list)
- What page each user is on
- Live activity stream
- Geographic map with live dots

### 4.6 Transactions (`/admin/transactions`)
- All payments across platform
- Filter by status, date, user
- Mark as paid/pending
- View payment details
- Export to CSV

### 4.7 Security (`/admin/security`)
- Banned IPs list
- Ban new IP
- Activity logs with filters
- Failed login attempts
- Suspicious activity alerts

---

## Phase 5: Real-time Features

### 5.1 User Activity Tracking
- Track page views
- Store current page in user record
- Last active timestamp
- Create context/hook for tracking

### 5.2 Real-time Updates (Optional Enhancement)
- Supabase Realtime subscriptions
- Live dashboard updates
- Instant notifications

---

## Phase 6: Security Measures

### 6.1 Admin Access Control
- Only your email can access admin
- All admin actions logged
- IP verification for admin access
- Rate limiting on admin APIs

### 6.2 Middleware Protection
- Update middleware to block `/admin/*` routes
- Check for admin role
- Block banned IPs platform-wide

---

## Implementation Order

1. **Database Changes** - Add new tables and columns
2. **Auth Updates** - Update NextAuth to include role
3. **Admin Helper** - Create admin check utilities
4. **API Routes** - Build admin APIs one by one
5. **Admin Layout** - Create the admin shell
6. **Main Dashboard** - Overview page with stats
7. **Users Page** - List and manage users
8. **User Details** - Individual user management
9. **Analytics Pages** - Platform statistics
10. **Security Pages** - IP bans and logs
11. **Real-time Tracking** - Activity monitoring
12. **Transactions Page** - Payment management

---

## Your Admin Email
I'll need your email address to set as the super admin. This email will be hardcoded as having admin access.

---

## Estimated Components
- ~15 new pages
- ~12 new API routes
- ~5 new database tables/columns
- ~3 new contexts/hooks
- ~10 reusable admin components
