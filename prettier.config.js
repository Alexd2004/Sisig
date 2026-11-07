// Root Prettier config. Prettier looks for a config file next to each file it
// formats and then in parent folders, so this file applies the shared config in
// packages/config to every workspace (`pnpm format`, `pnpm format:check`, editors).
module.exports = require('./packages/config/prettier.config.js');
