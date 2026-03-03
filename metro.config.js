const { getDefaultConfig } = require("expo/metro-config");
const exclusionListModule = require("metro-config/private/defaults/exclusionList");
const exclusionList = exclusionListModule.default ?? exclusionListModule;

const config = getDefaultConfig(__dirname);

// Prevent Expo/Metro from watching Next.js build artifacts in /web.
// Next frequently recreates these folders, which can cause ENOENT watcher crashes on Windows.
config.resolver.blockList = exclusionList([
  /web[\/\\]\.next-build[\/\\].*/,
  /web[\/\\]\.next-dev[\/\\].*/,
  /web[\/\\]\.next[\/\\].*/
]);

module.exports = config;
