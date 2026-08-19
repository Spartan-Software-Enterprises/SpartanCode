const { withAndroidManifest, withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Adds REQUEST_INSTALL_PACKAGES permission and versionCode increment support
 * for the auto-update APK install flow.
 */
module.exports = function withInstallUpdates(config) {
  // Add REQUEST_INSTALL_PACKAGES to AndroidManifest
  config = withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    if (!manifest.$) return mod;

    const usesPermissions = manifest['uses-permission'] ?? [];
    const hasInstallPermission = usesPermissions.some(
      (perm) => perm.$?.['android:name'] === 'android.permission.REQUEST_INSTALL_PACKAGES',
    );

    if (!hasInstallPermission) {
      manifest['uses-permission'] = [
        ...usesPermissions,
        { $: { 'android:name': 'android.permission.REQUEST_INSTALL_PACKAGES' } },
      ];
    }

    return mod;
  });

  // Ensure versionCode is set from app.json version
  config = withAppBuildGradle(config, (mod) => {
    let contents = mod.modResults.contents;

    // Ensure versionName uses the expo version
    if (!contents.includes('versionName')) {
      contents = contents.replace(
        /defaultConfig\s*\{/,
        `defaultConfig {\n        versionName "0.1.0"`,
      );
    }

    mod.modResults.contents = contents;
    return mod;
  });

  return config;
};

module.exports.default = module.exports;
