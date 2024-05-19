const rules = require('./webpack.rules');
//const plugins = require('./webpack.plugins');
const isProd = process.env.NODE_ENV === 'production';

rules.push({
  test: /\.css$/,
  use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
});

module.exports = {
  // Put your normal webpack config below here
  devtool: isProd ? "hidden-nosources-source-map" : undefined, // https://webpack.js.org/configuration/devtool/
  module: {
    rules,
  },
  //plugins: plugins,
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css']
  },
};
