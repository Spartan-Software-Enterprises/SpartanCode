const { withAppBuildGradle } = require('@expo/config-plugins');

/** Keep release signing configuration in generated native projects. */
module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (mod) => {
    let contents = mod.modResults.contents;

    if (!contents.includes('def keystorePropertiesFile = rootProject.file("keystore.properties")')) {
      contents = contents.replace(
        'android {',
        `def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file("keystore.properties")
if (keystorePropertiesFile.exists()) {
    keystorePropertiesFile.withInputStream { keystoreProperties.load(it) }
}

android {`,
      );
    }

    const debugSigning = `signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }`;
    const releaseSigning = `signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            } else {
                storeFile file('debug.keystore')
                storePassword 'android'
                keyAlias 'androiddebugkey'
                keyPassword 'android'
            }
        }
    }`;

    if (contents.includes(debugSigning)) {
      contents = contents.replace(debugSigning, releaseSigning);
    }
    contents = contents.replace(
      /release \{\n\s*\/\/ Caution![\s\S]*?signingConfig signingConfigs\.debug/,
      (match) => match.replace('signingConfig signingConfigs.debug', 'signingConfig signingConfigs.release'),
    );
    mod.modResults.contents = contents;
    return mod;
  });
};
