/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: [
    './index.js',
    'next/core-web-vitals',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
  ],
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    // O'zbekcha matnda qo'shtirnoq/apostrof ko'p; HTML-entity majburlamaymiz
    'react/no-unescaped-entities': 'off',
  },
  settings: {
    react: { version: 'detect' },
    // next/core-web-vitals typescript resolver'ini node resolver bilan almashtiramiz
    // (pnpm symlink monorepo'da tsconfig zanjirini parse qila olmay xato beradi)
    'import/resolver': {
      node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
    },
  },
};
