module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    // SDK 54+ va Reanimated 4'da `react-native-reanimated/plugin` olib tashlangan —
    // worklets babel transform endi babel-preset-expo ichida avtomatik.
    // Eski plugin'ni qoldirsak `setUpDefaltReactNativeEnvironment` ichida
    // "initialize is not a function" xatosini olamiz.
  };
};
