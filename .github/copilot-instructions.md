# PBL LMS - AI Agent Instructions

## Architecture Overview

**Stack**: MERN (MongoDB, Express, React 18, Node.js) + Socket.io + Redux Toolkit + Material-UI v5
**Deployment**: Backend on Render, Frontend on Vercel
**Language**: Arabic UI (RTL) with English code. All user-facing text in Arabic.

### Directory Structure
```
backend/
  ├── controllers/    # Business logic (assessment.controller.js is 1700+ lines)
  ├── models/        # Mongoose schemas with Arabic field descriptions
  ├── routes/        # Express routes with protect/authorize middleware
  ├── middleware/    # auth.middleware.js (JWT), rateLimiter.js, errorHandler.js
  ├── services/      # cloudinary.service.js, socket.service.js
  └── server.js      # Socket.io integration + route mounting

frontend/
  ├── src/
  │   ├── redux/slices/    # Redux Toolkit: authSlice, projectSlice, progressSlice
  │   ├── services/api.js  # Axios instance with JWT interceptors
  │   ├── components/      # Reusable components (ObservationCardBuilder, BadgeCelebrationPopup)
  │   ├── pages/           # Route pages (all end with Page.jsx)
  │   └── theme.js         # MUI theme with RTL + Arabic typography
```

## Critical Patterns

### 1. Authentication & Authorization
- **JWT in localStorage**: `localStorage.getItem('token')` auto-attached via axios interceptors
- **Middleware chain**: `protect` (verify JWT) → `authorize('teacher', 'admin')` (check role)
- **2FA Support**: OTP routes (`/api/otp/*`) with QR code generation (speakeasy + qrcode)
- **Auth state race condition fix**: In `authSlice.js`, initial `loading` state MUST check `!!localStorage.getItem('token')` to prevent redirect loops on page refresh

### 2. Assessment System (Complex!)
**Dual-Phase Evaluation** for team projects:
1. **Group Phase**: Evaluated by `observation-card` with phase=`group`
2. **Individual + Oral Phase**: Evaluated with phase=`individual_oral`

**Key Files**:
- `backend/controllers/assessment.controller.js`: 1700+ lines handling observation cards, evaluation attempts, final scoring, badge awarding, level progression
- `frontend/src/components/ObservationCardBuilder.jsx`: Dynamic form builder for multi-section evaluation criteria

**Critical Logic**:
- Project 6 (Capstone) requires ALL projects 1-5 to be passed (≥60%) before awarding completion
- Badge awards are tied to `FinalEvaluation` and stored in `Badge.model` with `awardedTo` array
- Level progression: Projects 1-2→Beginner, 3-4→Intermediate, 5→Advanced, 6→Expert

### 3. Form Field Accessibility
**REQUIRED attributes for all MUI form components**:
```jsx
<TextField id="field-name" name="field-name" />
<Select id="select-id" labelId="label-id" />
<InputLabel id="label-id" htmlFor="select-id">  // ❌ WRONG for MUI Select
<InputLabel id="label-id">                       // ✅ CORRECT (labelId connects via Select)
```
MUI Select links to InputLabel via `labelId`, NOT `htmlFor`.

### 4. Redux Async Thunks Pattern
```javascript
export const fetchProjects = createAsyncThunk('projects/fetch', async (filters) => {
  const response = await api.get('/projects', { params: filters });
  return response.data.data; // Backend wraps in { success, data, message }
});
```
Always unwrap `response.data.data` for actual payload.

### 5. Arabic Text Handling
- **Newlines**: Use `\n` in JSON. Display with `whiteSpace: 'pre-line'` in MUI Typography
- **UTF-8 Encoding**: PowerShell requires `[System.Text.Encoding]::UTF8.GetBytes()` wrapper for API calls with Arabic text
- **RTL**: Already configured globally in `theme.js` with `stylis-plugin-rtl`

## Development Workflows

### Local Development
```bash
# Backend (Port 5000)
cd backend && npm run dev  # Uses nodemon

# Frontend (Port 3000, proxies /api to :5000)
cd frontend && npm run dev  # Vite dev server

# Both at once (from root)
npm run dev  # Uses concurrently
```

### Environment Setup
**Backend `.env`** (REQUIRED):
```env
MONGODB_URI=mongodb+srv://...
JWT_SECRET=secure-random-string
CLIENT_URL=http://localhost:3000,https://pbl-lms-phi.vercel.app
CLOUDINARY_CLOUD_NAME=...  # For file uploads
```

**Frontend `.env`**:
```env
VITE_API_URL=http://localhost:5000/api  # Local dev
# Production uses backend on Render: https://pbl-lms-backend.onrender.com/api
```

### Testing API Directly
Use PowerShell with UTF-8 encoding:
```powershell
$token = "Bearer eyJ..."
$body = @{ title = "عنوان عربي" } | ConvertTo-Json
$bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
Invoke-RestMethod -Uri "https://pbl-lms-backend.onrender.com/api/projects" `
  -Method Post -Headers @{ Authorization = $token } -Body $bytes
```

### Deployment
- **Frontend**: Push to `main` → Vercel auto-deploys
- **Backend**: Push triggers Render rebuild (5-10 min). Check logs at dashboard.render.com
- **No manual builds needed** - CI/CD fully automated

### Creating New Projects
Use PowerShell template in `scripts/create-project-template.ps1`:
```powershell
.\scripts\create-project-template.ps1 -Token "your-admin-jwt"
```
Customize `$projectData` and observation cards in the script. Automatically creates project + evaluation cards via API.

## Common Pitfalls

1. **Missing Imports**: MUI components like `Divider`, `Alert` often forgotten. Check compile errors in Vercel logs.
2. **Arabic Text Encoding**: Always use UTF-8 when sending Arabic via API (not just JSON.stringify)
3. **Assessment Flow**: Don't skip validating observation cards exist before evaluation attempts
4. **Socket.io**: Initialized in `server.js` but socket service is in `services/socket.service.js`
5. **Rate Limiting**: Auth endpoints have stricter limits than general API (see `middleware/rateLimiter.js`)

## Key Dependencies

**Backend**:
- `mongoose@8.0.3`: Schemas use `timestamps: true` by default
- `socket.io@4.8.3`: Real-time chat in `/api/chat` routes
- `cloudinary@2.8.0`: File uploads for course materials
- `express-rate-limit@7.1.5`: Applied per-route in `server.js`

**Frontend**:
- `@mui/material@5.15.0`: RTL configured in theme.js
- `@reduxjs/toolkit@2.0.1`: All state managed via slices
- `react-router-dom@6.21.0`: PrivateRoute wrapper checks auth state
- `vite@7.3.1`: Dev server with proxy to backend

## Project-Specific Conventions

- **File naming**: Backend models end in `.model.js`, routes in `.routes.js`, controllers in `.controller.js`
- **API responses**: Always `{ success: boolean, message: string, data?: any }`
- **Error handling**: `errorHandler` middleware in `backend/middleware/errorHandler.js` catches all
- **Arabic messages**: Use template literals for dynamic Arabic text: `تم إنشاء ${title} بنجاح`
- **Component organization**: Pages import from `components/`, never cross-import between pages
- **Socket events**: Namespaced as `chat:*`, `notification:*` (see `backend/services/socket.service.js`)

## Integration Points

- **Cloudinary**: `services/cloudinary.service.js` wraps SDK. Init checked in `server.js` on startup
- **Email**: Nodemailer configured for Gmail SMTP (see `EMAIL_*` env vars)
- **2FA**: `/api/otp/generate` creates QR, `/api/otp/verify-login` validates during login flow
- **Invitations**: Admin-only route `/api/admin/invitations` for approving student registrations

## Database Schema Relationships

Key ObjectId references:
- `User.enrolledProjects` → `Project._id` (array)
- `Progress.student` → `User._id`, `Progress.project` → `Project._id`
- `FinalEvaluation.project` → `Project._id`, `FinalEvaluation.student` → `User._id`
- `Badge.awardedTo.student` → `User._id`, `Badge.project` → `Project._id`
- `ObservationCard.project` → `Project._id`, `ObservationCard.phase` → enum `['group', 'individual_oral']`

All schemas use `{ timestamps: true }` for automatic `createdAt`/`updatedAt`.
