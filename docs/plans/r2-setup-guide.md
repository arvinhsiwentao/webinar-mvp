# Cloudflare R2 影片儲存設定指南

> Beginner-friendly guide for setting up Cloudflare R2 to store and serve webinar video files.
> Last updated: 2026-03-11

---

## 總覽 Overview

Cloudflare R2 is an **object storage** service — think of it as a giant folder in the cloud where you upload files (videos, images, etc.) and access them via URL.

Why R2 for this project:
- **No egress fees** — You don't pay when viewers stream videos (most providers charge for this)
- **S3-compatible API** — Works with standard AWS S3 tools and libraries
- **Global CDN** — Videos are served fast worldwide via Cloudflare's network
- **Simple pricing** — 10 GB free storage, $0.015/GB after that

You'll be storing MP4 video files (up to ~2 GB each) that the webinar platform streams to viewers.

---

## Step 1：建立 Cloudflare 帳號

If you already have a Cloudflare account, skip to Step 2.

1. Go to **[dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)**
2. Enter your email and create a password
3. Click **"Sign Up"**
4. Check your email and click the verification link

That's it — no credit card needed for the free tier. R2 gives you 10 GB of free storage per month.

---

## Step 2：建立 R2 Bucket（儲存桶）

A "bucket" is just a named container that holds your files. You need one bucket for all your webinar videos.

1. Log in to [dash.cloudflare.com](https://dash.cloudflare.com)
2. In the left sidebar, click **"R2 Object Storage"**
3. If this is your first time, you'll see a prompt to enable R2 — click **"Purchase R2 Plan"** (the free tier is included, you won't be charged unless you exceed 10 GB)
4. Click the blue **"Create bucket"** button
5. Configure the bucket:
   - **Bucket name:** Enter `webinar-videos`
   - **Location:** Select **"Automatic"** (Cloudflare will pick the closest region to your users). If you want to force North America, choose **"North America (NA)"** under the location hint
6. Click **"Create bucket"**

You should now see your `webinar-videos` bucket in the R2 dashboard.

---

## Step 3：開啟公開存取 Public Access

By default, files in R2 are private. You need to make them publicly readable so viewers' browsers can stream the videos.

The easiest way for development is using the built-in `r2.dev` subdomain:

1. In the R2 dashboard, click on your **"webinar-videos"** bucket
2. Click the **"Settings"** tab at the top
3. Scroll down to the **"Public access"** section
4. Under **"R2.dev subdomain"**, click **"Allow Access"**
5. A confirmation dialog will appear — type **"allow"** and click **"Allow"**

After enabling, you'll see a URL like:
```
https://pub-abc123def456.r2.dev
```

This is your public bucket URL. Any file you upload (e.g., `my-video.mp4`) will be accessible at:
```
https://pub-abc123def456.r2.dev/my-video.mp4
```

> **Note:** The `r2.dev` subdomain is fine for development and testing. For production, you should add a custom domain (e.g., `videos.yourdomain.com`) under the same "Public access" section — click **"Connect Domain"** and follow the prompts. This gives you better caching and a professional URL.

---

## Step 4：設定 CORS（跨域存取）

CORS (Cross-Origin Resource Sharing) tells R2 which websites are allowed to load your videos. Without this, browsers will block your site from streaming the videos.

1. Stay on the **"Settings"** tab of your `webinar-videos` bucket
2. Scroll down to the **"CORS Policy"** section
3. Click **"Edit CORS policy"** (or **"Add CORS policy"** if none exists)
4. Paste the following JSON, replacing the entire contents:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "*"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "HEAD"
    ],
    "AllowedHeaders": [
      "Content-Type",
      "Range",
      "Content-Length"
    ],
    "ExposeHeaders": [
      "Content-Length",
      "Content-Range",
      "Accept-Ranges",
      "ETag"
    ],
    "MaxAgeSeconds": 86400
  }
]
```

5. Click **"Save"**

What each setting does:
- **AllowedOrigins** — Which websites can access your videos. `localhost:3000` is for local development, `*` allows all origins (you can restrict this to your production domain later, e.g., replace `*` with `https://yourdomain.com`)
- **AllowedMethods** — `GET` for streaming/downloading, `PUT` for uploading, `HEAD` for checking file info
- **AllowedHeaders** — `Range` is critical — it enables video seeking (jumping to a specific time in the video)
- **ExposeHeaders** — Lets the browser read these response headers, needed for video players to work correctly
- **MaxAgeSeconds** — Browser caches the CORS check for 24 hours (86400 seconds), so it doesn't re-check every request

---

## Step 5：建立 API Token（API 金鑰）

Your application needs an API token to upload files to R2 programmatically. This is separate from your Cloudflare account password.

1. Go back to the main **R2 Object Storage** page (click "R2 Object Storage" in the left sidebar, or click "Overview" at the top)
2. In the top-right area, click **"Manage R2 API Tokens"**
3. Click **"Create API token"**
4. Configure the token:
   - **Token name:** Enter something descriptive like `webinar-mvp-upload`
   - **Permissions:** Select **"Object Read & Write"** — this lets your app both upload and read files
   - **Specify bucket(s):** Select **"Apply to specific buckets only"**, then choose **"webinar-videos"** from the dropdown. This limits the token so it can only access this one bucket (security best practice)
   - **TTL (optional):** Leave as "Forever" unless you want the token to expire
   - **Client IP Address Filtering (optional):** Leave blank for now
5. Click **"Create API Token"**

You will now see a page with three values. **Copy all three immediately:**

| Field | Example | Notes |
|---|---|---|
| **Token value** | (not needed for S3 API) | Used for Cloudflare API, not R2 S3 |
| **Access Key ID** | `a1b2c3d4e5f6...` | Your `R2_ACCESS_KEY_ID` |
| **Secret Access Key** | `x9y8z7w6v5u4...` | Your `R2_SECRET_ACCESS_KEY` |

> **WARNING:** The **Secret Access Key** is shown only once. If you lose it, you must delete the token and create a new one. Copy it to a safe place right now.

---

## Step 6：找到你的 Account ID

You need your Cloudflare Account ID for the R2 endpoint URL.

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. In the left sidebar, click **"R2 Object Storage"**
3. Your **Account ID** is displayed on the right side of the R2 overview page, under **"Account ID"**
   - It looks like a 32-character hex string: `a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4`

Alternatively, you can find it on any domain's overview page — look in the right sidebar under "API" > "Account ID".

---

## Step 7：加入環境變數 Environment Variables

Now add all four values to your project's `.env.local` file.

1. Open (or create) the file `.env.local` in the project root directory
2. Add these four lines:

```env
# Cloudflare R2 Video Storage
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
R2_ACCESS_KEY_ID=your_access_key_id_here
R2_SECRET_ACCESS_KEY=your_secret_access_key_here
R2_BUCKET_NAME=webinar-videos
```

3. Replace the placeholder values with the real ones you copied in Steps 5 and 6
4. Save the file

> **`.env.local` is gitignored** — it will NOT be committed to your repository. This is correct and intentional. Never commit API keys to git.

### Quick reference: where each value comes from

| Variable | Where to find it |
|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | R2 dashboard > right sidebar > "Account ID" |
| `R2_ACCESS_KEY_ID` | Shown when you created the API token (Step 5) |
| `R2_SECRET_ACCESS_KEY` | Shown **once** when you created the API token (Step 5) |
| `R2_BUCKET_NAME` | The bucket name you chose in Step 2 (`webinar-videos`) |

---

## 驗證設定 Verification Checklist

Before moving on, confirm:

- [ ] R2 bucket `webinar-videos` exists in your Cloudflare dashboard
- [ ] Public access is enabled (you can see the `r2.dev` URL)
- [ ] CORS policy is saved with the JSON from Step 4
- [ ] API token is created with "Object Read & Write" permission, scoped to `webinar-videos`
- [ ] All 4 environment variables are in `.env.local`
- [ ] You have your public bucket URL saved (the `https://pub-xxx.r2.dev` URL from Step 3)

### 手動測試 Quick Manual Test

You can test your setup by uploading a small file through the dashboard:

1. Go to your `webinar-videos` bucket in the R2 dashboard
2. Click **"Upload"** > **"Upload Files"**
3. Upload any small file (e.g., a text file or small image)
4. After upload, click on the file name
5. Copy the public URL and open it in your browser — you should see the file

If the file loads, your public access and CORS are working correctly. You can delete the test file afterward.

---

## 常見問題 FAQ

**Q: R2 要多少錢？How much does R2 cost?**
R2 free tier includes 10 GB storage + 10 million read requests/month. For a webinar MVP with a few videos, you'll likely stay within the free tier. Beyond that, storage is $0.015/GB/month.

**Q: 影片檔案大小有限制嗎？Is there a file size limit?**
Single upload limit is 5 GB via the dashboard, or 5 TB via multipart upload through the API. Your 2 GB video files are well within limits.

**Q: 可以之後換成自訂網域嗎？Can I add a custom domain later?**
Yes. In the bucket Settings > Public access > "Connect Domain". You'll need a domain that's already on Cloudflare (free plan is fine). The `r2.dev` URL will continue to work alongside your custom domain.

**Q: 忘記 Secret Access Key 怎麼辦？What if I lost my Secret Access Key?**
Go to R2 > Manage R2 API Tokens, delete the old token, and create a new one. Update your `.env.local` with the new keys.
