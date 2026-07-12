# Cardly

Cardly is a spaced-repetition flashcard application built with React Native / Expo. It helps users create, import, and study flashcards with SRS (spaced repetition) features and deck management.

## Key Features

- Create and edit cards and decks
- Import decks and sample data
- Spaced Repetition System (SRS) integration
- Study modes, quizzes, and ratings
- Media support for card sides (images/audio)
- Web and native support through Expo

## Tech Stack

- React Native + Expo
- TypeScript
- Jest for tests
- EAS (Expo Application Services) for builds
- Supabase for backend, auth, and storage (required by this implementation)

> Note: This app is built around Supabase in `src/lib/supabase.ts` and uses it for auth, database, functions, and storage. Replacing Supabase with another backend would require refactoring the Supabase client and all data/auth calls.

## Repository Structure (selected)

- `src/` — application source code
  - `app/` — route screens and layouts
  - `components/` — reusable components and UI
  - `hooks/`, `contexts/`, `lib/` — app logic
- `assets/` — images, fonts, and media
- `packages/srs/` — spaced repetition logic package
- `android/` — native Android project files
- `supabase/` — database functions, migrations, policies

## Requirements

- Node.js (16+ recommended)
- Yarn or npm
- Expo CLI (optional but recommended): `npm install -g expo-cli`
- EAS CLI for production builds: `npm install -g eas-cli`

## Quick Start

1. Install dependencies

```bash
npm install
# or
# yarn install
```

2. Start the development server

```bash
npm run start
# or
# expo start
```

3. Run on Android (if you have Android emulator or device)

```bash
npm run android
# or use Expo Go / development client
```

4. Run on iOS (simulator or connected device)

```bash
npm run ios
# or use Expo Go / development client on iOS
```

## Running Tests

```bash
npm test
# or
# yarn test
```

Unit and integration tests are configured with Jest. See `jest.config.cjs` and `packages/srs/jest.config.cjs` for package-specific setups.

## Building for Production

This project uses EAS for production builds. Configure your account and credentials, then:

```bash
eas build --platform android
# eas build --platform ios
```

See `eas.json` for build profiles.

## Environment and Configuration

- App configuration: `app.json`
- Environment types: `expo-env.d.ts`
- Metro config: `metro.config.js`
- Required environment variables:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`

The app expects a Supabase project for auth, storage, and database access.

## Contributing

Contributions are welcome. Suggested workflow:

- Fork the repo
- Create a feature branch
- Run tests and linters locally
- Open a pull request with a clear description

Please follow existing code style and TypeScript settings in `tsconfig.json`.

## License

Specify your license here (e.g., MIT). If none, add one to the repository.

## Contact

For questions or help, open an issue in this repository or contact the maintainers.
