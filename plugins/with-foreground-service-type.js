const { withAndroidManifest } = require("expo/config-plugins");

/**
 * Expo config plugin that adds android:foregroundServiceType="microphone"
 * to the RNBackgroundActionsTask service declared by react-native-background-actions.
 *
 * Required since Android 14 (API 34) — foreground services must declare a type
 * or the app crashes with MissingForegroundServiceTypeException.
 */
module.exports = function withForegroundServiceType(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const application = manifest.manifest.application?.[0];
    if (!application) return config;

    if (!application.service) {
      application.service = [];
    }

    const serviceName = "com.asterinet.react.bgactions.RNBackgroundActionsTask";
    let service = application.service.find(
      (s) => s.$?.["android:name"] === serviceName
    );

    if (service) {
      service.$["android:foregroundServiceType"] = "microphone";
    } else {
      application.service.push({
        $: {
          "android:name": serviceName,
          "android:foregroundServiceType": "microphone",
        },
      });
    }

    return config;
  });
};
