# Deploying React Chess to Vercel

This guide will walk you through deploying your React Chess application (both client and server) to Vercel.

## Prerequisites

1. A [Vercel account](https://vercel.com/signup) (you can sign up using GitHub, GitLab, or email)
2. Your React Chess project pushed to a Git repository (GitHub, GitLab, or Bitbucket)
3. [Git](https://git-scm.com/downloads) installed on your computer

## Step 1: Deploy the Server (Backend)

1. Log in to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import your Git repository or select the repository containing your React Chess project
4. Configure your server deployment:
   - Set the Project Name (e.g., `react-chess-server`)
   - Set the Root Directory to `server`
   - Framework Preset: Select "Other"
   - Build Command: Leave empty
   - Output Directory: Leave empty
   - Install Command: `npm install`
5. In the Environment Variables section, add:
   ```
   PORT=3001
   CLIENT_URL=https://your-client-url.vercel.app
   ```
   (You'll update the CLIENT_URL after deploying the client)
6. Click "Deploy"
7. Wait for the deployment to complete (usually takes a few minutes)
8. Note down the URL of your deployed server (e.g., `https://react-chess-server.vercel.app`)

## Step 2: Update Client Environment Variables

1. In your local project, edit the `client/.env.production` file:
   ```
   VITE_SERVER_URL=https://your-server-url.vercel.app
   ```
   (Replace `your-server-url` with the actual URL from Step 1)
2. Commit and push these changes to your Git repository:
   ```bash
   git add client/.env.production
   git commit -m "Update server URL for production"
   git push
   ```

## Step 3: Deploy the Client (Frontend)

1. From your Vercel Dashboard, click "Add New" → "Project" again
2. Import the same Git repository
3. Configure your client deployment:
   - Set the Project Name (e.g., `react-chess-client`)
   - Set the Root Directory to `client`
   - Framework Preset: Select "Vite"
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
4. No additional environment variables are needed as they're in the `.env.production` file
5. Click "Deploy"
6. Wait for the deployment to complete
7. Note down the URL of your deployed client (e.g., `https://react-chess-client.vercel.app`)

## Step 4: Update Server Environment Variables

1. Go back to your server project in the Vercel Dashboard
2. Go to "Settings" → "Environment Variables"
3. Find the `CLIENT_URL` variable and click "Edit"
4. Update the value with the client URL from Step 3 (e.g., `https://react-chess-client.vercel.app`)
5. Click "Save"
6. Go to "Deployments", find the latest deployment, and click the three dots menu → "Redeploy"

## Step 5: Verify the Deployment

1. Open your client URL in a browser
2. Try creating a new game room
3. Open the game room in a different browser or incognito window to test multiplayer functionality
4. Verify that moves are syncing between the two players
5. Test the spectator mode by opening the game in a third browser window

## Troubleshooting Common Issues

### Socket.IO Connection Errors

If you see socket connection errors in the browser console:

1. Verify that the server environment variable `CLIENT_URL` exactly matches your client's URL (including https:// and any www)
2. Check that the client environment variable `VITE_SERVER_URL` correctly points to your server URL
3. Ensure CORS settings in the server are correctly set up (which we've already configured)

### Page Not Found Errors on Refresh

If you get 404 errors when refreshing pages with routes:

1. Check that the `vercel.json` file at the project root is correctly configured (we've set this up already)
2. The file should contain client routes configuration to handle client-side routing

### Deployment Build Failures

If deployments fail:

1. Check the build logs in Vercel for specific error messages
2. Ensure all dependencies are correctly listed in package.json
3. Make sure the Node.js version is compatible (Vercel uses Node 18 by default)

## Optional: Custom Domain Setup

To use your own domain name for your React Chess app:

1. From your client project in Vercel, go to "Settings" → "Domains"
2. Click "Add" and follow the instructions to add your domain
3. Update DNS records at your domain registrar as instructed by Vercel
4. Update the `CLIENT_URL` in your server environment variables to match your custom domain
5. Redeploy your server for the changes to take effect

## Automating Future Deployments

Vercel automatically deploys updates when you push to your repository:

1. Make changes to your code locally
2. Commit and push to your Git repository
3. Vercel will automatically detect the changes and deploy updates
4. You can view deployment status in the Vercel Dashboard

That's it! Your React Chess application should now be fully deployed and accessible online. 