import 'dotenv/config';

const EAS_PROJECT_ID = process.env.EAS_PROJECT_ID?.trim();
const hasValidEasId =
  !!EAS_PROJECT_ID &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    EAS_PROJECT_ID
  );

export default {
  expo: {
    name: 'TriSync',
    slug: 'trisync',
    version: '1.0.0',
    scheme: 'trisync',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    platforms: ['ios'],
    icon: './assets/images/icon.jpg',
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.guan-eric.trisync',
      usesAppleSignIn: true,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: ['trisync'],
          },
        ],
        NSHealthShareUsageDescription:
          'TriSync reads workouts from Apple Health so sessions you complete on Apple Watch can sync into your training log.',
        NSHealthUpdateUsageDescription:
          'TriSync sends prescribed workout templates to Apple Health / Fitness so you can start them from iPhone or Apple Watch.',
      },
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      'expo-apple-authentication',
      '@react-native-community/datetimepicker',
      [
        '@kingstinct/react-native-healthkit',
        {
          NSHealthShareUsageDescription:
            'TriSync reads workouts from Apple Health so sessions you complete on Apple Watch can sync into your training log.',
          NSHealthUpdateUsageDescription:
            'TriSync sends prescribed workout templates to Apple Health / Fitness so you can start them from iPhone or Apple Watch.',
        },
      ],
      [
        'expo-splash-screen',
        {
          image: './assets/images/icon.jpg',
          resizeMode: 'contain',
          backgroundColor: '#fff4ef',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      ...(hasValidEasId
        ? {
            eas: {
              projectId: EAS_PROJECT_ID,
            },
          }
        : {}),
      router: {},
      useLocalData: process.env.USE_LOCAL_DATA,
      firebaseApiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.AUTH_DOMAIN,
      projectId: process.env.PROJECT_ID,
      storageBucket: process.env.STORAGE_BUCKET,
      messagingSenderId: process.env.MESSAGING_SENDER_ID,
      appId: process.env.APP_ID,
      revenuecatApiKey: process.env.REVENUECAT_API_KEY,
      revenuecatTestApiKey: process.env.REVENUECAT_TEST_API_KEY,
      garminClientId: process.env.GARMIN_CLIENT_ID,
      garminClientSecret: process.env.GARMIN_CLIENT_SECRET,
      stravaClientId: process.env.STRAVA_CLIENT_ID,
      stravaClientSecret: process.env.STRAVA_CLIENT_SECRET,
    },
    owner: 'guan-eric',
    runtimeVersion: {
      policy: 'appVersion',
    },
    ...(hasValidEasId
      ? {
          updates: {
            url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
          },
        }
      : {}),
  },
};
