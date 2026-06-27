module.exports = {
  root: true,
  extends: ['@ecom/eslint-config/react.js'],
  // React Native uchun web-ga xos jsx-a11y rule'lari mos kelmaydi
  rules: {
    'jsx-a11y/no-autofocus': 'off',
    'jsx-a11y/no-static-element-interactions': 'off',
    'jsx-a11y/click-events-have-key-events': 'off',
  },
};
