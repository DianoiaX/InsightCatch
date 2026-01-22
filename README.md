# InsightCatch 🕵️‍♂️

**Turn passive bounces into active intelligence.**

InsightCatch is an intelligent exit-intent tracking system that captures user feedback just before they leave your site. Unlike generic popups, it uses smart heuristics (time-on-site, scroll depth) to only target engaged users, and leverages AI to analyze the feedback instantly.

## 🚀 Features

- **Smart Exit Intent**: Detects when a user is about to leave (mouse movement towards browser bar).
- **Intelligent Filtering**: Only triggers for engaged users (e.g., >10s time on site OR >50% scroll depth) to avoid annoying bouncers.
- **AI-Powered Insights**: Uses **Google Gemini** to analyze feedback sentiment and intent.
- **Real-time Alerts**: Sends immediate email notifications via **Resend** for urgent or negative feedback.
- **Analytics Dashboard**: A modern Next.js dashboard to view trends and weekly AI summaries.

## 📂 Project Structure

This monorepo consists of two main parts:

- **`tracker/`**: The lightweight JavaScript agent (`spy.js`) that runs on client websites.
- **`dashboard/`**: The Next.js web application for administrative control and analytics.

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, Tailwind CSS, Recharts
- **Backend/API**: Next.js Server Routes
- **Database**: Supabase
- **AI**: Google Gemini
- **Email**: Resend
- **Tracker**: Vanilla JavaScript

## 🏁 Getting Started

### 1. Tracker Setup
The tracker is a standalone script. You can test it by opening `tracker/index.html` in your browser.
To use it in production, embed `spy.js` in your website and configure the `apiUrl`.

### 2. Dashboard Setup

Navigate to the dashboard directory:
```bash
cd dashboard
```

Install dependencies:
```bash
npm install
```

Set up your `.env.local` file with necessary keys (Supabase, Gemini, Resend):
```bash
cp .env.example .env.local
# Edit .env.local with your API keys
```

Run the development server:
```bash
npm run dev
```
