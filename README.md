# Veeky App (Frontend)

## ⚙️ Prerequisites

Before getting started, make sure you have the following installed on your machine:

### ✅ Required

- **[Git](https://git-scm.com/downloads)**
- **[Docker Desktop](https://www.docker.com/products/docker-desktop/)**

You can verify installations with:

```bash
git --version
docker --version
```

## ▶️ Running the App

### Veeky Web Image (Docker)

This is a Docker-based setup for running the Veeky Expo app in web mode.

#### 📦 Included

- `Dockerfile`: Builds the Expo app and starts it in web mode (`--web --lan`).
- `docker-compose.yml`: Simplifies development with port forwarding for Expo Web (8081).

#### 🚀 Usage

1. Clone the repository from Git

```bash
git clone https://github.com/TalHadad94/veeky-app.git
```

2. Move to the project folder

```bash
cd veeky-app
```

3. Build

```bash
docker-compose build --no-cache
```

4. Run

```bash
docker-compose up
```

5. Open your browser and paste:

```
http://localhost:8081
```

> Make sure port 8081 is not blocked by firewalls.

# Veeky App (Frontend)

Welcome to the frontend codebase for **Veeky**, a mobile-first app that helps users discover and book vacations through short-form videos. This project is built with **React Native**, powered by **Expo**, and written in **TypeScript**.

We’ve set this project up from scratch — no boilerplate tabs, no unnecessary files — just a clean foundation to build from.

---

## 📁 Project Structure & File Overview

This five-minute guide explains where features live, how the app starts, and which parts use real data.
Veeky uses **Expo SDK 54, React Native 0.81, React 19, and TypeScript** for iOS, Android, and web.
Most user-facing copy is Hebrew. The frontend talks directly to **Supabase Auth and Postgres**;
this repository contains no separate backend server.

### Repository map

```text
veeky-app/
├── index.js                 # Expo entry point
├── App.tsx                  # Global providers, navigation container, deep links
├── navigation/              # Auth flow, root stack, tabs, profile stack
├── screens/                 # Complete screens and their UI/form state
├── components/              # Video feeds, players, overlays, modals, loading UI
├── services/                # Authentication and video database operations
├── lib/                     # Shared Supabase client
├── context/                 # Shared light/dark theme state
├── types/                   # Database models and web JSX declarations
├── utils/                   # In-memory interactions, haptics, thumbnail helpers
├── assets/                  # App, Android adaptive, splash, and favicon images
└── ...                      # Configuration and deployment files listed below
```

### Startup and navigation

1. [index.js](index.js) registers `App` with Expo.
2. [App.tsx](App.tsx) wraps the app in `ThemeProvider` and React Navigation's
   `NavigationContainer`, configures URL paths, and mounts `RootNavigator`.
3. [navigation/RootNavigator.tsx](navigation/RootNavigator.tsx) listens for Supabase auth
   changes, shows a loading indicator while resolving the session, and chooses the available screens.
   It also defines route parameter types (`RootStackParamList`, `ProfileStackParamList`, and
   `MainTabsParamList`).

| Navigation level | Routes and behavior                                                                                |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| Root stack       | Logged out: `Login`. Logged in: `MainTabs`, `Search`, `Influencer`. `Signup` is always registered. |
| `MainTabs`       | Bottom tabs: `Home`, `AddVideo`, `Profile`.                                                        |
| `Profile` stack  | `ProfileMain`, `Orders`, `Saves`, `Liked`, `Settings`.                                             |

URL paths such as `/login`, `/main/home`, `/search`, and `/influencer/:influencerId` are configured
in `App.tsx`. Internal navigation can pass `Home` a `videoId` to jump to a video in the loaded feed.
When adding a route, update its navigator and parameter types; add its URL mapping if needed.

### Screens: where each feature starts

| Files in `screens/`                                                                      | Responsibility                                                                                                                                   |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| [LoginScreen.tsx](screens/LoginScreen.tsx), [SignupScreen.tsx](screens/SignupScreen.tsx) | Email/password forms, validation, signup email confirmation, and auth navigation. Signup also checks username availability directly in Supabase. |
| [HomeFeedScreen.tsx](screens/HomeFeedScreen.tsx)                                         | Category chips, search entry, screen focus, and choosing the native or web feed.                                                                 |
| [AddVideoScreen.tsx](screens/AddVideoScreen.tsx)                                         | Creator form for category, title, location, price, days, and tags. Picking and uploading video are unfinished.                                   |
| [ProfileScreen.tsx](screens/ProfileScreen.tsx)                                           | Current auth user's name/email, local like/save counts, logout, and links into the profile stack.                                                |
| [SavesScreen.tsx](screens/SavesScreen.tsx), [LikedScreen.tsx](screens/LikedScreen.tsx)   | Grids built by filtering demo videos against locally stored IDs.                                                                                 |
| [OrdersScreen.tsx](screens/OrdersScreen.tsx)                                             | Orders empty state; booking history is unfinished.                                                                                               |
| [SettingsScreen.tsx](screens/SettingsScreen.tsx)                                         | Theme toggle.                                                                                                                                    |
| [SearchScreen.tsx](screens/SearchScreen.tsx)                                             | Searches demo videos by title, tags, location, or influencer.                                                                                    |
| [InfluencerScreen.tsx](screens/InfluencerScreen.tsx)                                     | Influencer details and a demo video grid; opens a selected video in Home.                                                                        |

### Video feed and shared UI

`HomeFeedScreen` selects the feed with `Platform.OS`. The browser implementation is loaded through
a conditional `require` because it uses DOM APIs and HTML `<video>` elements.

| Files in `components/`                                                                                 | Responsibility                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [VideoFeed.tsx](components/VideoFeed.tsx)                                                              | Native `FlatList`, category fetches, one-video-per-swipe snapping, active item, and jump-to-video handling. Also exports `MOCK_DATA` used by other screens. |
| [VideoItem.tsx](components/VideoItem.tsx)                                                              | Native playback through `expo-video`, gestures, progress, action buttons, captions, and modal visibility.                                                   |
| [WebVideoFeed.tsx](components/WebVideoFeed.tsx)                                                        | Browser scrolling/playback and its own `WebVideoItem` implementation, including action buttons and overlays.                                                |
| [CommentsModal.tsx](components/CommentsModal.tsx), [ItineraryModal.tsx](components/ItineraryModal.tsx) | Local comments and trip/day details. The itinerary's booking button currently closes the modal.                                                             |
| [CaptionSheet.tsx](components/CaptionSheet.tsx)                                                        | Full caption sheet used by `VideoItem`.                                                                                                                     |
| [FeedStatus.tsx](components/FeedStatus.tsx), [SkeletonLoader.tsx](components/SkeletonLoader.tsx)       | Shared feed loading/error/empty states with retry; a separate reusable animated placeholder, respectively.                                                  |

**Feed UI is implemented twice.** Changes to playback, gestures, overlays, or actions often need
changes in both `VideoItem.tsx` and `WebVideoFeed.tsx`. Home passes `feedActive` so playback pauses
when the user leaves the screen.

### Data flow, shared state, and current limits

- **Supabase connection:** [lib/supabase.ts](lib/supabase.ts) creates the shared client from
  `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in the environment (`.env` locally).
  Web auth sessions use `window.localStorage`.
- **Authentication:** [services/authService.ts](services/authService.ts) handles signup, login,
  logout, current user, and session queries. Signup also attempts to insert a `profiles` row.
  `RootNavigator` subscribes directly to auth state.
- **Home feed:** Both feeds call [services/videoService.ts](services/videoService.ts), which
  queries `videos` with joined `profiles`, newest first, optionally filtered by category. Each feed
  currently requests the first 20 rows. Loading failures and empty results show `FeedStatus`;
  **Home does not fall back to demo videos**. Pull-to-refresh on native currently simulates a delay.
- **Demo and local state:** Search, Influencer, Saves, and Liked still read `MOCK_DATA` from
  `VideoFeed.tsx`. [utils/storage.ts](utils/storage.ts) stores likes, saves, and comments in memory;
  they reset on reload. Consequently, real feed items may be missing from those demo-based views.
  `videoService` has create/like/save methods, but the current UI does not call them. Uploads and
  bookings are unfinished.
- **Data shapes:** [types/database.ts](types/database.ts) defines `Profile`, `Video`, `Like`,
  `Save`, `Comment`, and `Follow`; `VideoData` in `VideoFeed.tsx` aliases `Video`. Some native UI and
  demo data still expect legacy fields (`uri`, `influencer`, `likes`) rather than database fields
  (`video_url`, `profile`, `likes_count`). That integration is unfinished and causes type mismatches.
  [types/web.d.ts](types/web.d.ts) declares HTML `<video>` JSX support.
- **Theme and helpers:** [context/ThemeContext.tsx](context/ThemeContext.tsx) exposes `useTheme()`
  and a non-persisted dark/light toggle used by Profile and Settings. Auth screens use the system
  color scheme; the feed has its own dark styles. [utils/haptics.ts](utils/haptics.ts) wraps native
  vibration calls and skips web; [utils/thumbnails.ts](utils/thumbnails.ts) maps locations to
  placeholder image URLs.

### Configuration, builds, and supporting files

| Location                                                                                                                               | What to know                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| [app.json](app.json), `assets/`                                                                                                        | Expo identity/version, portrait orientation, Hermes/new architecture, platform settings, icons, splash, and `expo-video`/`expo-font` plugins. |
| [package.json](package.json), [package-lock.json](package-lock.json)                                                                   | Dependencies, npm commands, exact dependency resolution, and Husky/lint-staged configuration.                                                 |
| [tsconfig.json](tsconfig.json), [babel.config.js](babel.config.js)                                                                     | Strict TypeScript checking and Expo/Reanimated compilation.                                                                                   |
| [eslint.config.mjs](eslint.config.mjs), [.prettierrc](.prettierrc), [.prettierignore](.prettierignore), [.editorconfig](.editorconfig) | Code rules, formatting, ignored formatting targets, and editor defaults.                                                                      |
| [Dockerfile](Dockerfile), [docker-compose.yml](docker-compose.yml)                                                                     | Containerized Expo web development; Compose forwards port `8081`.                                                                             |
| [vercel.json](vercel.json), [.vercelignore](.vercelignore)                                                                             | Static web export to `dist/`, SPA route rewrites to `index.html`, cache headers, and deployment exclusions.                                   |
| [supabase-add-videos.sql](supabase-add-videos.sql)                                                                                     | Sample profile/video inserts for an existing database, rather than a complete schema or migration system.                                     |
| [.gitignore](.gitignore), [.dockerignore](.dockerignore)                                                                               | Git and Docker exclusions. `node_modules/`, `.expo/`, and `dist/` are dependency/generated folders.                                           |
| [CLAUDE.md](CLAUDE.md)                                                                                                                 | Repository development guidance; verify descriptions against the code when they differ.                                                       |

### Where to make a change

- **New feature:** screen in `screens/`, route/types in `navigation/`, reusable UI in `components/`.
- **Database behavior:** service in `services/`, models in `types/database.ts`, shared client in `lib/`.
- **Feed behavior:** `HomeFeedScreen` for filters/focus; both platform implementations for playback/UI.
- **Shared state:** `context/` for providers; `utils/storage.ts` for the current local interaction store.

Useful commands from `package.json`:

| Command                                                         | Purpose                                                                        |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `npm start` / `npm run web` / `npm run android` / `npm run ios` | Start Expo or open a target platform.                                          |
| `npm run build`                                                 | Export web assets into `dist/` (also available as `npm run web:build`).        |
| `npm run typecheck` / `npm run lint`                            | Check TypeScript and code rules. Existing type mismatches are described above. |
| `npm run prettier:check` / `npm run doctor`                     | Check formatting across the repo / Expo dependency health.                     |

There is currently no automated test suite or `test` script in this repository.

---

### Start the development server:

```bash
npx expo start
```

| Key Press | What It Does                            |
| --------- | --------------------------------------- |
| `w`       | Open the app in your web browser        |
| `a`       | Launch the Android emulator (if set up) |
| QR Code   | Scan with **Expo Go** on your phone     |

🧠 Developer Notes
| Location | What Belongs There |
| ------------- | ---------------------------------------- |
| `screens/` | Full screen views (Login, Feed, Profile) |
| `components/` | Reusable UI (VideoCard, Button, etc.) |
| `navigation/` | Stack & screen navigation setup |

✅ Use TypeScript for all files — it improves autocomplete, prevents bugs, and helps with scaling.

👥 Team & Contribution
If you're contributing to this repo, here are some guidelines:

- Keep your code clean, modular, and mobile-friendly

- Create components for any UI repeated more than once

- Ask before adding new libraries or dependencies

- Follow existing patterns in App.tsx and RootNavigator.tsx

We're building Veeky to be a smart, delightful experience — ask questions, share feedback, and build with quality in mind 💡
