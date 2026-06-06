/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ['./index.js'],
  env: { node: true, jest: true },
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
  },
};
