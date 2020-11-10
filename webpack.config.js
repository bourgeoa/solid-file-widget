/* global __dirname */
const webpack = require('webpack');
const isProd = (process.env.NODE_ENV === 'production');
const path = require('path');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin')

// minimize only in production
const plugins = isProd ? [new UglifyJSPlugin({ sourceMap: true })] : []

module.exports = {
  entry: ["@babel/polyfill", "./src/widget.js"],
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'widget.js',
    library: 'Widget',
    libraryTarget: 'umd'
  },
  devtool: isProd ? '#source-map' : '#eval-source-map',
  externals: {
      // require("solid-auth-client") is external and available
      // on the global var authClient
      // this is how peer dependencies are specified
      // in webpack (we need authClient but we do not include in bundle)
      "authClient": {
          root: "solid-auth-client", // in browser <script> this will resolve in this.fileClient
          commonjs2: "solid-auth-client", // require('solid-auth-client')
          commonjs: "solid-auth-client", // require('solid-auth-client')
          amd: "solid-auth-client" // define(['solid-auth-client'], ...)
      }
  },
  module: {
    rules: [
      { test: /\.js$/, exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: { presets: ['@babel/preset-env'] },
        }
      }
    ]
  },
  plugins: plugins
};
