const appJson = require('./app.json');
const withReleaseSigning = require('./plugins/withReleaseSigning');

module.exports = ({ config }) => {
  const merged = { ...appJson.expo, ...config };
  merged.plugins = [...(appJson.expo.plugins || []), withReleaseSigning];
  return { ...config, ...merged };
};
