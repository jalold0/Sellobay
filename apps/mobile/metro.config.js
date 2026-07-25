const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// SDK 54 + Reanimated 4 + Worklets: inlineRequires majburiy
// (Expo default'da o'chirilgan, lekin worklets initialize pipeline shu bilan ishlaydi)
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

// Monorepo: workspace root paketlarini ham kuzatish
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

// Watcher'dan chetlashtirish: .claude (agent worktree'lari — vaqtinchalik fayllari
// ENOENT shovqin beradi), .next/.turbo build kataloglari (mobilga keraksiz, crawl sekin).
const extraBlock = [/[\\/]\.claude[\\/]/, /[\\/]\.next[\\/]/, /[\\/]\.turbo[\\/]/];
const prevBlock = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(prevBlock) ? prevBlock : prevBlock ? [prevBlock] : []),
  ...extraBlock,
];

module.exports = withNativeWind(config, { input: './global.css' });
