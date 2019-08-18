const path = require('path');

module.exports = {
  entry: './src/index.js',
  mode: 'production',
  output: {
    filename: 'hapi.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'Hapi',
    libraryTarget: 'umd'
  }
};
