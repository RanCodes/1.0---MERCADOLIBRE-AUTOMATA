<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1LBHlT6B4o1nPhRui7sy8eHDlIi3RbVgZ

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Run with Docker

Build the production image and serve the Vite build through Nginx on port **8081** (chosen to avoid existing local ports):

1. Build the image (pass your Gemini API key during build if you need it embedded in the frontend bundle):
   ```bash
   docker build -t calculadora-ml-odoo \
     --build-arg GEMINI_API_KEY="your_key_here" .
   ```
2. Run the container mapping port 8081:
   ```bash
   docker run --rm -p 8081:8081 calculadora-ml-odoo
   ```
3. Open the app at http://localhost:8081

If you prefer to keep the API key only at runtime, mount a different `env.js` strategy or rebuild with the key when deploying to your cloud provider.
