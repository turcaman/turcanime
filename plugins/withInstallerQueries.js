const { withAndroidManifest } = require("@expo/config-plugins");

// Android 11+ package visibility: without a <queries> entry the app cannot
// resolve the system package installer and the install intent is dropped
module.exports = function withInstallerQueries(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const installerIntent = {
      intent: [
        {
          action: [{ $: { "android:name": "android.intent.action.INSTALL_PACKAGE" } }],
          data: [{ $: { "android:mimeType": "application/vnd.android.package-archive" } }],
        },
      ],
    };
    manifest.queries = [...(manifest.queries ?? []), installerIntent];
    return config;
  });
};
