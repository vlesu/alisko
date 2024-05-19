const isProd = process.env.NODE_ENV === 'production';

module.exports = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  devtool: isProd ? "hidden-nosources-source-map" : undefined, // https://webpack.js.org/configuration/devtool/

  entry: './src/index.js',

  // Put your normal webpack config below here
  module: {
    rules: require('./webpack.rules'),
  },
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json']
  },
  stats: {
    errors: true,
    errorStack: true,
    errorDetails: true, // --display-error-details
  },
};
