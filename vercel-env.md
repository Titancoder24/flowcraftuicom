# Vercel Deployment

The app is now ready for Vercel deployment with environment variables.

## Environment Variable Required:

**Key:** `REACT_APP_OPENROUTER_API_KEY`
**Value:** `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`

## How to Deploy:

1. Go to your Vercel project dashboard
2. Import your GitHub repository (`flow-craft-4`)
3. Go to **Settings** → **Environment Variables**
4. Add the environment variable above
5. Select all environments (Production, Preview, Development)
6. Click "Save"
7. Redeploy your project

## Important Notes:

- **Environment variable required** - Add the API key in Vercel settings
- **More secure** - API key not exposed in code
- **Production ready** - Follows best practices
- **Easy to update** - Change key in Vercel without code changes
