import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "nl.tulipday.app",
  appName: "TulipDay",
  webDir: "out",
  server: {
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#FFF5F7",
      showSpinner: false,
    },
  },
};

export default config;
