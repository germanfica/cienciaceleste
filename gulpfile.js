// gulpfile.js (ESM)
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
require('./build/gulpfile');

// gulpfile.js (CommonJS)
// require('./build/gulpfile');