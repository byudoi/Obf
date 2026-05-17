const { nodeExternalsPlugin } = require('esbuild-node-externals');

require('esbuild').build({
  entryPoints: ['./src/index.ts'],
  sourceRoot: './src',
  bundle: true,
  platform: 'node',
  outfile: 'index.js',
  minify: true,
  plugins: [nodeExternalsPlugin()],
  minifyWhitespace: false,
}).catch(() => process.exit(1));
