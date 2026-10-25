# Veeky

Veeky is a TikTok-style travel app: users scroll a vertical video feed of trips posted by influencers, open a trip's itinerary, like/save/comment, and (later) order the trip. The UI copy is Hebrew.

## Stack

- Expo SDK 54, React Native 0.81, React 19, TypeScript
- Supabase (auth + Postgres) via `@supabase/supabase-js`
- Web build (`expo export --platform web`) deployed to Vercel from `main` (see `vercel.json`)
- Mobile testing through Expo Go

## Structure

- `App.tsx` – app root (providers, navigation)
- `navigation/RootNavigator.tsx` – auth stack (Login/Signup), bottom tabs (Home, AddVideo, Profile), Search and Influencer screens
- `screens/` – one file per screen
- `components/` – feed (`VideoFeed` native, `WebVideoFeed` web), `VideoItem`, `ItineraryModal`, `CommentsModal`, `SkeletonLoader`
- `services/` – `authService`, `videoService` (all Supabase calls go through here)
- `lib/supabase.ts` – Supabase client, reads `EXPO_PUBLIC_SUPABASE_*` env vars
- `context/ThemeContext.tsx` – light/dark theme
- `utils/` – in-memory `storage`, haptics, thumbnails
- `types/` – database and web typings

## Real vs. mock data

Real (Supabase):

- Sign up, login, logout, session (`authService`, `RootNavigator`)
- Profiles table (created on sign up)
- Home feed videos (`videoService.getVideos`), falling back to `MOCK_DATA` in `components/VideoFeed.tsx`

Mock / local only:

- `MOCK_DATA` drives Search, Influencer, Saves and Liked screens
- Likes, saves and comments live in `utils/storage.ts`, in memory only (lost on reload)
- Orders screen is an empty state; AddVideo has no picker or upload yet
- Pull-to-refresh on Home is simulated

## Rules

- Work on `main` (Vercel free tier deploys a single branch). Keep each change small and focused.
- Don't change anything related to Supabase (client, env vars, `.env`, tables, auth flow) until we've mapped how it's connected.
- Preserve the existing design: layouts, colors, spacing and interactions stay as they are unless the task says otherwise.
- Hebrew copy must read like native Israeli Hebrew, not translated text.
- Use `npx expo install <pkg>` for Expo/RN packages so versions match SDK 54.
- Before pushing: `npm run build` must succeed. `npm run typecheck` has existing errors; don't add new ones.
