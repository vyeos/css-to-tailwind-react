#!/usr/bin/env node

const path = require('path');

// Determine which build to use
const distPath = path.join(__dirname, '..', 'dist');

// Try to load the compiled CLI
const cliPath = path.join(distPath, 'cli.js');

require(cliPath);
