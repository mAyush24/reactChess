# Deployment Guide for React Chess

This guide will help you deploy your React Chess application with the backend on Render and frontend on Vercel.

## Backend Deployment on Render

### Step 1: Prepare Backend for Render
1. The backend is already configured with the necessary files:
   - `server/render.yaml` - Render configuration
   - `server/package.json` - Contains start script and dependencies
   - `server/index.js` - Main server file

### Step 2: Deploy to Render
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" and select "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `react-chess-backend`
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Click "Create Web Service"
6. Wait for deployment to complete
7. Copy the generated URL (e.g., `https://your-app-name.onrender.com`)

### Step 3: Configure Environment Variables (Optional)
In Render dashboard, go to your service → Environment → Add Environment Variables:
- `NODE_ENV`: `production`
- `PORT`: `10000` (Render will override this)

## Frontend Deployment on Vercel

### Step 1: Prepare Frontend for Vercel
1. The frontend is already configured with:
   - `client/vercel.json` - Vercel configuration
   - `client/package.json` - Contains build script and dependencies

### Step 2: Deploy to Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Click "Deploy"

### Step 3: Configure Environment Variables
1. In Vercel dashboard, go to your project → Settings → Environment Variables
2. Add the following variable:
   - **Name**: `VITE_SERVER_URL`
   - **Value**: Your Render backend URL (e.g., `https://your-app-name.onrender.com`)
   - **Environment**: Production, Preview, Development
3. Redeploy the project

## Testing the Deployment

1. **Backend Test**: Visit your Render URL + `/api/rooms` (e.g., `https://your-app-name.onrender.com/api/rooms`)
2. **Frontend Test**: Visit your Vercel URL and try creating/joining a game

## Troubleshooting

### Common Issues:

1. **CORS Errors**: The backend is configured to allow all origins (`origin: "*"`)

2. **Socket Connection Issues**: 
   - Ensure `VITE_SERVER_URL` is set correctly in Vercel
   - Check that the backend URL is accessible

3. **Build Failures**:
   - Check that all dependencies are in `package.json`
   - Ensure Node.js version is compatible (>=18.0.0)

4. **Environment Variables**:
   - Make sure to redeploy after adding environment variables
   - Check that variable names match exactly (case-sensitive)

### Useful Commands:

```bash
# Test backend locally
cd server
npm install
npm start

# Test frontend locally
cd client
npm install
npm run dev
```

## File Structure After Deployment

```
reactChess/
├── server/                 # Backend (deployed on Render)
│   ├── index.js
│   ├── package.json
│   ├── render.yaml
│   └── env.example
├── client/                 # Frontend (deployed on Vercel)
│   ├── src/
│   ├── package.json
│   ├── vercel.json
│   └── env.example
└── DEPLOYMENT.md
``` 