# Mavrixfy Admin Dashboard - Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Mavrixfy Admin Dashboard                 │
│                    (Next.js 14 + TypeScript)                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Firebase   │    │   Firebase   │    │  Cloudinary  │
│     Auth     │    │  Firestore   │    │    Media     │
└──────────────┘    └──────────────┘    └──────────────┘
```

## Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI Library**: React 18
- **Styling**: Tailwind CSS + Custom glassmorphism
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Icons**: Lucide React
- **Notifications**: Sonner

### Backend
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Storage**: Firebase Storage + Cloudinary
- **Admin SDK**: Firebase Admin SDK (server-side)

### DevOps
- **Hosting**: Vercel (recommended)
- **CI/CD**: Vercel automatic deployments
- **Monitoring**: Vercel Analytics + Firebase
- **Version Control**: Git

---

## Project Structure

```
admin/
├── app/                          # Next.js App Router
│   ├── (auth)/                  # Authentication routes
│   │   └── login/
│   ├── (dashboard)/             # Protected dashboard routes
│   │   └── dashboard/
│   │       ├── page.tsx         # Overview
│   │       ├── songs/           # Song management
│   │       ├── playlists/       # Playlist management
│   │       ├── artists/         # Artist management
│   │       ├── discovery/       # Search & discovery
│   │       ├── moderation/      # Content moderation
│   │       ├── users/           # User management
│   │       ├── analytics/       # Analytics center
│   │       ├── flags/           # Feature flags
│   │       ├── promotions/      # Banners & campaigns
│   │       ├── notifications/   # Push notifications
│   │       └── roles/           # Admin roles
│   ├── api/                     # API routes
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Home redirect
│
├── components/                   # Reusable components
│   ├── ui/                      # Base UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Dialog.tsx
│   │   ├── Tabs.tsx
│   │   └── ...
│   ├── charts/                  # Chart components
│   │   ├── LineChart.tsx
│   │   ├── BarChart.tsx
│   │   └── PieChart.tsx
│   ├── forms/                   # Form components
│   │   ├── SongForm.tsx
│   │   ├── PlaylistForm.tsx
│   │   └── ...
│   ├── modules/                 # Feature-specific components
│   │   ├── SongTable.tsx
│   │   ├── PlaylistCard.tsx
│   │   └── ...
│   ├── Sidebar.tsx              # Navigation sidebar
│   ├── CommandPalette.tsx       # Global command palette
│   └── ...
│
├── hooks/                        # Custom React hooks
│   ├── useAuth.tsx              # Authentication hook
│   ├── useFirestore.ts          # Firestore operations
│   ├── useDebounce.ts           # Debounce utility
│   └── ...
│
├── lib/                          # Utilities & helpers
│   ├── firebase-admin.ts        # Firebase Admin SDK
│   ├── firebase-client.ts       # Firebase Client SDK
│   ├── permissions.ts           # RBAC logic
│   ├── utils.ts                 # General utilities
│   └── ...
│
├── stores/                       # Zustand stores
│   ├── useAdminStore.ts         # Admin state
│   ├── useSongStore.ts          # Song management
│   └── ...
│
├── types/                        # TypeScript types
│   └── index.ts                 # All type definitions
│
├── docs/                         # Documentation
│   ├── ARCHITECTURE.md          # This file
│   ├── DEPLOYMENT.md            # Deployment guide
│   ├── FIRESTORE_SCHEMA.md      # Database schema
│   └── API.md                   # API documentation
│
├── public/                       # Static assets
│   ├── images/
│   └── icons/
│
├── .env.example                  # Environment template
├── .gitignore
├── next.config.js
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

---

## Core Features

### 1. Overview Dashboard
- Real-time metrics (songs, playlists, users, streams)
- Growth charts and trends
- Top content rankings
- Activity feed
- System health monitoring

### 2. Song Management (Catalog CMS)
- Full CRUD operations
- Metadata editor (title, artist, album, genre, language, artwork, duration, popularity, release date, explicit flag)
- Bulk import support
- Song approval workflow (draft → review → published)
- Broken track detection
- Region/availability control
- Search and filtering

### 3. Playlist Management
- Create/edit editorial playlists
- Drag-drop song ordering
- Set trending scores
- Schedule publishing
- Category management
- Homepage placement controls
- Playlist analytics

### 4. Artist Management
- Artist profile editor
- Verified artist controls
- Discography management
- Artist analytics
- Social links

### 5. Search & Discovery Control
- Manage search ranking weights
- Trending keyword dashboard
- Search analytics
- Curated discovery boosts
- Typo/misspelling mapping
- Search token management

### 6. Content Moderation
- Reported content review queue
- Copyright takedown tools
- Duplicate song detection
- Fraud/abuse monitoring
- Case assignment and tracking
- Resolution workflow

### 7. User Management
- User list with filters
- Premium/free user stats
- User reports
- Account moderation actions
- User activity tracking

### 8. Analytics Center
- Streaming analytics
- Top songs/playlists
- Retention metrics
- Country/language insights
- Real-time activity dashboard
- Custom date ranges

### 9. Feature Flags / Remote Config
- Toggle features on/off
- Beta rollout controls (0-100%)
- Platform-specific flags (web/Android/iOS)
- User segment targeting
- Version gating

### 10. Banner / Promotions Manager
- Homepage banner management
- Campaign scheduling
- Audience targeting
- Click tracking
- A/B testing support

### 11. Notifications Manager
- Push notification composer
- Segment targeting
- Scheduling
- Delivery tracking
- Open rate analytics

### 12. Admin Roles & Permissions
- Role-based access control (RBAC)
- Permission management
- Audit logs
- Activity timeline
- Security monitoring

---

## Advanced Features

### Global Command Palette (⌘K / Ctrl+K)
- Quick navigation
- Search across modules
- Keyboard shortcuts
- Action execution

### Content Approval Workflow
- **Draft**: Initial creation
- **Review**: Pending approval
- **Published**: Live on platform
- **Scheduled**: Timed release

### Bulk Actions
- Multi-select operations
- Batch updates
- Bulk delete
- CSV export/import

### Internal Notes System
- Collaboration tool
- Context-specific notes
- Audit trail
- Team communication

### Media Upload Manager
- Cloudinary integration
- Image optimization
- Drag-drop upload
- Progress tracking

### Dark/Light Preview Simulator
- Preview content in both themes
- Responsive design testing
- Accessibility checks

### Real-time Firestore Sync
- Live data updates
- Optimistic UI updates
- Conflict resolution
- Offline support

---

## Security Architecture

### Authentication Flow

```
1. User enters credentials
2. Firebase Auth validates
3. Check admins/{uid} document
4. Verify role and permissions
5. Create session
6. Grant access to allowed modules
```

### Role Hierarchy

1. **Super Admin**
   - Full access to all modules
   - Can manage other admins
   - Access to security settings

2. **Content Editor**
   - Catalog management (songs, playlists, artists)
   - Analytics (read-only)
   - No user management

3. **Moderator**
   - Content moderation
   - User management
   - Analytics (read-only)

4. **Analyst**
   - Analytics (read-only)
   - Overview dashboard
   - No write permissions

### Permission System

```typescript
type AdminPermission =
  | 'overview.view'
  | 'catalog.manage'
  | 'playlists.manage'
  | 'artists.manage'
  | 'discovery.manage'
  | 'moderation.manage'
  | 'users.manage'
  | 'analytics.view'
  | 'flags.manage'
  | 'promotions.manage'
  | 'notifications.manage'
  | 'roles.manage';
```

### Firestore Security Rules

- All admin operations require authentication
- Role-based document access
- Field-level security
- Audit log immutability
- Rate limiting on writes

---

## Data Flow

### Read Operations

```
Component → Hook → Firestore Query → Cache → UI Update
```

### Write Operations

```
User Action → Validation → Firestore Write → Audit Log → UI Update → Toast Notification
```

### Real-time Updates

```
Firestore onSnapshot → Store Update → Component Re-render
```

---

## Performance Optimizations

### Frontend
- Server-side rendering (SSR)
- Static generation where possible
- Code splitting
- Lazy loading
- Image optimization
- Debounced search
- Virtualized lists

### Backend
- Firestore composite indexes
- Query result caching
- Batch operations
- Denormalized data
- Pagination
- Connection pooling

### Caching Strategy
- Client-side: React Query / SWR
- Server-side: Next.js caching
- Database: Firestore cache
- CDN: Static assets

---

## Error Handling

### Client-side
- Error boundaries
- Toast notifications
- Retry mechanisms
- Fallback UI
- Logging to console

### Server-side
- Try-catch blocks
- Firebase error codes
- Custom error messages
- Audit logging
- Alert notifications

---

## Testing Strategy

### Unit Tests
- Component testing
- Hook testing
- Utility function testing

### Integration Tests
- API route testing
- Firestore operation testing
- Authentication flow testing

### E2E Tests
- Critical user flows
- Admin workflows
- Permission checks

---

## Deployment Pipeline

```
1. Code push to GitHub
2. Vercel detects changes
3. Run build process
4. Run tests
5. Deploy to preview URL
6. Manual approval
7. Deploy to production
8. Health checks
9. Rollback if needed
```

---

## Monitoring & Observability

### Metrics
- Page load times
- API response times
- Error rates
- User sessions
- Feature usage

### Logging
- Application logs
- Audit logs
- Error logs
- Performance logs

### Alerts
- Error rate threshold
- Performance degradation
- Security events
- System health

---

## Scalability Considerations

### Horizontal Scaling
- Stateless architecture
- Load balancing
- Multi-region deployment

### Database Scaling
- Firestore auto-scaling
- Read replicas
- Sharding strategy

### Caching
- Redis for sessions
- CDN for static assets
- Query result caching

---

## Future Enhancements

### Planned Features
- Advanced analytics dashboard
- AI-powered content recommendations
- Automated moderation
- Multi-language support
- Mobile app (React Native)
- GraphQL API
- Webhook integrations
- Export/import tools
- Custom reporting
- Role templates

### Technical Improvements
- WebSocket for real-time updates
- Service workers for offline support
- Progressive Web App (PWA)
- Advanced caching strategies
- Performance monitoring
- A/B testing framework

---

## Contributing

### Code Style
- TypeScript strict mode
- ESLint + Prettier
- Conventional commits
- Component documentation

### Pull Request Process
1. Create feature branch
2. Implement changes
3. Write tests
4. Update documentation
5. Submit PR
6. Code review
7. Merge to main

---

## License

Proprietary - Mavrixfy Internal Tool

---

## Contact

For questions or support:
- Email: admin@mavrixfy.com
- Documentation: `/admin/docs/`
- GitHub: [Repository URL]
