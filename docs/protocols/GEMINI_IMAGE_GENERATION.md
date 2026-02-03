# Gemini & Nano Banana Image Generation Protocol

## Overview

This document outlines the correct setup and troubleshooting for Google's Gemini image generation API, specifically the "Nano Banana" model (`gemini-2.5-flash-image`).

---

## Correct SDK & Configuration

### SDK: `@google/genai` (NOT `@google/generative-ai`)

```bash
npm install @google/genai
```

**IMPORTANT:** There are two Google AI SDKs - use the correct one:
- ✅ `@google/genai` - New SDK with image generation support
- ❌ `@google/generative-ai` - Old SDK, does NOT support Nano Banana properly

### Model Name

```
gemini-2.5-flash-image
```

Other available image generation models:
- `gemini-2.0-flash-exp-image-generation` - Experimental
- `gemini-2.5-flash-image-preview` - Preview version
- `imagen-4.0-generate-001` - Imagen 4 (different API structure)

### Code Example

```typescript
import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY })

const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash-image',
  contents: 'Your prompt here',
  config: {
    responseModalities: ['TEXT', 'IMAGE'],
  },
})

// Extract image from response
for (const part of response.candidates[0].content.parts) {
  if (part.inlineData) {
    const imageBase64 = part.inlineData.data
    const mimeType = part.inlineData.mimeType
    // Save or display the image
  }
}
```

---

## Google Cloud Setup Checklist

### 1. Enable the Generative Language API
- Go to: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com
- Ensure status shows **"Enabled"**

### 2. Create API Key (Cloud Console method recommended)
- Go to: https://console.cloud.google.com/apis/credentials
- Click **"+ CREATE CREDENTIALS"** → **"API key"**
- Copy the key to `.env.local`

**Note:** Keys created through Google AI Studio may have different permissions than keys created directly in Cloud Console.

### 3. Link Billing Account
- Go to: https://console.cloud.google.com/billing/linkedaccount
- Ensure your project is linked to a billing account
- Even for free tier usage, billing must be linked for image generation

### 4. Verify API Key Works
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_API_KEY"
```
This should return a list of available models including `gemini-2.5-flash-image`.

---

## Common Issues & Solutions

### Issue: `429 Too Many Requests` with `limit: 0`

**Symptoms:**
```
Quota exceeded for metric: generate_content_free_tier_requests, limit: 0
```

**Causes & Solutions:**

1. **Wrong SDK** - Using `@google/generative-ai` instead of `@google/genai`
   - Solution: Install and use `@google/genai`

2. **Wrong model name** - Using `gemini-2.0-flash-exp` (text model)
   - Solution: Use `gemini-2.5-flash-image` (image model)

3. **API not enabled** - Generative Language API not enabled for project
   - Solution: Enable at Cloud Console → APIs & Services

4. **Billing not linked** - Project has no billing account
   - Solution: Link billing account at Cloud Console → Billing

5. **API key from wrong project** - Key is in Project A, API enabled in Project B
   - Solution: Ensure API key and API enablement are in the SAME project

### Issue: Image generated but not displaying

**Symptoms:**
- API returns 201 (success)
- Image saved to database
- Card shows no image

**Solution:**
Ensure the API endpoint returns `image_data` (base64) in the response. Check that:
1. Database query includes `image_data` column
2. Buffer is converted to base64 string: `buffer.toString('base64')`
3. Frontend checks for `image_data` in the image object

### Issue: Button does nothing / no feedback

**Symptoms:**
- Clicking "Generate Image" has no visible effect
- No loading state, no error message

**Solution:**
1. Check browser console for errors
2. Check server logs for API errors
3. Add proper error handling that displays errors to users
4. Ensure loading state (`isGenerating`) is being set

---

## Environment Variables

```env
# .env.local
GOOGLE_API_KEY=your-api-key-here
```

---

## Verification Steps

1. **Test API Key:**
   ```bash
   curl "https://generativelanguage.googleapis.com/v1beta/models?key=$GOOGLE_API_KEY"
   ```

2. **Verify Nano Banana is available:**
   Look for `models/gemini-2.5-flash-image` in the response

3. **Test image generation:**
   - Click "Generate Image" in the app
   - Check server logs for `POST /api/images/generate 201`
   - 201 = success, 429 = quota issue, 500 = server error

---

## File Locations

- SDK Client: `/lib/gemini/index.ts`
- API Route: `/app/api/images/generate/route.ts`
- Image Display: `/components/cards/ImageCard.tsx`
- Project Data API: `/app/api/projects/[id]/route.ts`

---

## Resources

- [Nano Banana Documentation](https://ai.google.dev/gemini-api/docs/image-generation)
- [Gemini API Rate Limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Google GenAI SDK (npm)](https://www.npmjs.com/package/@google/genai)
- [Google Cloud Console](https://console.cloud.google.com)
