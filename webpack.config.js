/* global __dirname */
var webpack = require('webpack');
var isProd = (process.env.NODE_ENV === 'production');
var path = require('path');

// minimize only in production
var plugins = isProd ? [new webpack.optimize.UglifyJsPlugin({minimize: true})] : [];

module.exports = {
  entry: ["./src/widget.js"],
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'widget.js',
    library: 'Widget',
    libraryTarget: 'umd'
  },
  devtool: isProd ? '#source-map' : '#eval-source-map',
  externals: {
      // require("solid-file-client") is external and available
      // on the global var fileClient
      // this is how peer dependencies are specified
      // in webpack (we need RemoteStorage but we do not include in bundle)
      "fileClient": {
          root: "solid-file-client", // in browser <script> this will resolve in this.fileClient
          commonjs2: "solid-file-client", // require('solid-file-client')
          commonjs: "solid-file-client", // require('solid-file-client')
          amd: "solid-file-client" // define(['solid-file-client'], ...)
      }
  },
  module: {
    loaders: [
      { test: /\.js$/, exclude: /node_modules/, loader: 'babel?presets=es2015' },
    ]
  },
  plugins: plugins
};
