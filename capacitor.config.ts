import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.trex.logistics',
  appName: 'TREX Logistics',
  webDir: 'out', // The static output directory, but we won't strictly rely on this since we use server.url
  server: {
    // URL of the live deployed application
    url: 'https://logistics-frontend.onrender.com',
    cleartext: true, // Allow HTTP if needed during testing
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
