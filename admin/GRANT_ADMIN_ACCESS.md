# Grant Admin Access to Existing Users

You can grant admin access to any existing Mavrixfy user without creating new accounts.

---

## Method 1: Add Admin Role to Existing User (Recommended)

### Step 1: Find Your User

1. Sign in to your Mavrixfy app with your regular account
2. Note your email address
3. Go to [Firebase Console](https://console.firebase.google.com/)
4. Select project: **spotify-8fefc**
5. Go to **Authentication** → **Users**
6. Find your user and **copy the UID**

### Step 2: Update User Document

1. Go to **Firestore Database**
2. Find the `users` collection
3. Find your user document (Document ID = your UID)
4. Click **Edit** (pencil icon)
5. Add these fields:

```
Field Name          | Type      | Value
--------------------|-----------|----------------------------------
role                | string    | admin
isAdmin             | boolean   | true
adminRole           | string    | super_admin
```

Optional - for custom permissions:
```
adminPermissions    | array     | (add permission strings - see below)
```

6. Click **Update**

### Step 3: Sign In to Admin Dashboard

1. Go to http://localhost:3001/login
2. Sign in with your **existing Mavrixfy credentials**
3. You now have admin access! 🎉

---

## Method 2: Use Dedicated Admins Collection

If you prefer to keep admin access separate from user profiles:

1. Go to **Firestore Database**
2. Create/find the `admins` collection
3. Create a document with ID = your user UID
4. Add these fields:

```
uid                 | string    | (your UID)
email               | string    | (your email)
name                | string    | (your name)
role                | string    | super_admin
status              | string    | active
permissions         | array     | (see below)
createdAt           | timestamp | (current time)
updatedAt           | timestamp | (current time)
```

---

## Admin Roles

Choose one of these roles:

### super_admin (Full Access)
- All permissions
- Can manage other admins
- Access to all modules

### content_editor
- Manage songs, playlists, artists
- View analytics
- No user management

### moderator
- Content moderation
- User management
- View analytics

### analyst
- View analytics only
- Read-only access

---

## Permissions List

If you want custom permissions, add these to `adminPermissions` array:

**Core Permissions:**
- `overview.view` - Dashboard overview
- `catalog.manage` - Song management
- `playlists.manage` - Playlist management
- `artists.manage` - Artist management
- `discovery.manage` - Search & discovery
- `moderation.manage` - Content moderation
- `users.manage` - User management
- `analytics.view` - Analytics access
- `flags.manage` - Feature flags
- `promotions.manage` - Banners & promotions
- `notifications.manage` - Push notifications
- `roles.manage` - Admin role management

---

## Quick Examples

### Example 1: Make Yourself Super Admin

Update your user document in `users/{your-uid}`:
```json
{
  "role": "admin",
  "isAdmin": true,
  "adminRole": "super_admin"
}
```

### Example 2: Content Editor Access

Update user document:
```json
{
  "role": "admin",
  "isAdmin": true,
  "adminRole": "content_editor"
}
```

### Example 3: Custom Permissions

Update user document:
```json
{
  "role": "admin",
  "isAdmin": true,
  "adminRole": "super_admin",
  "adminPermissions": [
    "overview.view",
    "catalog.manage",
    "analytics.view"
  ]
}
```

---

## How It Works

The admin dashboard checks for admin access in this order:

1. **User Document** (`users/{uid}`)
   - Checks if `role === "admin"` OR `isAdmin === true`
   - Uses `adminRole` for role type (defaults to `super_admin`)
   - Uses `adminPermissions` if provided, otherwise uses role defaults

2. **Admin Document** (`admins/{uid}`)
   - Dedicated admin collection
   - Separate from user profiles

3. **Firebase Custom Claims**
   - Checks `admin: true` claim
   - Uses `role` claim for role type

---

## Remove Admin Access

To revoke admin access:

### Method 1: Update User Document
1. Go to `users/{uid}` in Firestore
2. Delete or set to false:
   - `isAdmin: false`
   - Remove `role: "admin"`

### Method 2: Delete Admin Document
1. Go to `admins/{uid}` in Firestore
2. Delete the document

---

## Security Notes

- Admin access is checked on every page load
- Firestore security rules enforce permissions server-side
- All admin actions are logged to `audit_logs` collection
- Users without admin access will see "Access Denied" page

---

## Troubleshooting

### "Admin access denied" error

**Solution**: Make sure you added the admin fields to your user document:
```
role: "admin"
isAdmin: true
adminRole: "super_admin"
```

### Can't see certain modules

**Solution**: Check your permissions. Super admins have access to everything. Other roles have limited access.

### Changes not taking effect

**Solution**: 
1. Sign out of the admin dashboard
2. Clear browser cache
3. Sign in again

---

## Multiple Admins

You can grant admin access to multiple users:

1. Repeat the process for each user
2. Assign different roles based on responsibilities
3. Use `content_editor` for catalog managers
4. Use `moderator` for content reviewers
5. Use `analyst` for read-only analytics access

---

**That's it!** You can now use your existing Mavrixfy account to access the admin dashboard. No need to create separate admin accounts.
