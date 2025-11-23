# Backend Deployment Guide for Render

## Quick Fix for Current Error

The deployment is failing because the start command is incorrect. Update your Render service settings:

**Current (Wrong):**
```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

**Correct:**
```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

## Deployment Steps

### Option 1: Using Render Dashboard

1. Go to your Render dashboard
2. Select your `glam-by-lynn-api` service
3. Go to **Settings**
4. Under **Build & Deploy**, update the **Start Command** to:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
5. Click **Save Changes**
6. Trigger a new deploy

### Option 2: Using render.yaml (Recommended)

1. The `render.yaml` file is now in the backend directory
2. In your Render dashboard:
   - Go to **Settings** > **Build & Deploy**
   - Make sure **Build Command** is set to:
     ```bash
     pip install -r requirements.txt
     ```
   - Make sure **Start Command** is set to:
     ```bash
     uvicorn app.main:app --host 0.0.0.0 --port $PORT
     ```

### Option 3: Using Blueprint (Infrastructure as Code)

1. Commit the `render.yaml` file to your repository
2. In Render dashboard, create a new **Blueprint**
3. Connect it to your GitHub repository
4. Render will automatically use the configuration from `render.yaml`

## Required Environment Variables

Make sure these environment variables are set in your Render service:

### Required
- `DATABASE_URL` - PostgreSQL connection string from Render PostgreSQL service
- `SECRET_KEY` - Random string for JWT signing
- `FRONTEND_URL` - Your Vercel frontend URL (e.g., https://glam-by-lynn.vercel.app)
- `ALLOWED_ORIGINS` - JSON array, e.g., `["https://glam-by-lynn.vercel.app"]`

### Google OAuth
- `GOOGLE_CLIENT_ID` - From Google Cloud Console
- `GOOGLE_CLIENT_SECRET` - From Google Cloud Console
- `GOOGLE_REDIRECT_URI` - Your frontend URL + `/api/auth/callback/google`

### Optional (for production features)
- `AWS_ACCESS_KEY_ID` - For S3 file uploads
- `AWS_SECRET_ACCESS_KEY` - For S3 file uploads
- `AWS_REGION` - Default: us-east-1
- `S3_BUCKET_NAME` - S3 bucket for uploads
- `RESEND_API_KEY` - For email notifications
- `FROM_EMAIL` - Sender email address
- `ADMIN_EMAILS` - JSON array of admin emails

## Database Setup

1. Create a PostgreSQL database on Render:
   - In Render dashboard, click **New** > **PostgreSQL**
   - Name it `glam-by-lynn-db`
   - Select the free tier or appropriate plan
   - After creation, copy the **Internal Database URL**

2. Set the `DATABASE_URL` environment variable in your web service to the Internal Database URL

3. Run migrations after first deployment:
   ```bash
   # In Render Shell or locally with production DATABASE_URL
   alembic upgrade head
   ```

## Troubleshooting

### Error: "Could not import module 'main'"
- **Solution**: Update start command to `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Database Connection Errors
- Make sure `DATABASE_URL` is set to the **Internal Database URL** from Render PostgreSQL
- Ensure the database service is in the same region as your web service

### CORS Errors from Frontend
- Update `ALLOWED_ORIGINS` to include your Vercel frontend URL
- Update `FRONTEND_URL` to your Vercel URL
- Example: `["https://glam-by-lynn.vercel.app", "https://glam-by-lynn-*.vercel.app"]`

### Google OAuth Not Working
- Update Google Cloud Console authorized redirect URIs to include:
  - `https://your-frontend.vercel.app/api/auth/callback/google`
- Update `GOOGLE_REDIRECT_URI` environment variable

## Health Check

Once deployed, verify the API is working:
```bash
curl https://your-api-url.onrender.com/
# Should return: {"message": "Glam by Lynn API is running"}

curl https://your-api-url.onrender.com/health
# Should return: {"status": "healthy", "database": "connected"}
```
