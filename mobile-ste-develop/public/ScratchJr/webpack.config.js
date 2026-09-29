var path = require("path")
var WebpackNotifierPlugin = require("webpack-notifier")

module.exports = {
  devtool: "cheap-module-source-map",
  entry: {
    app: "./src/entry/app.js",
  },
  optimization: {
  minimize: false,
},
  devServer: {
    contentBase: path.resolve(__dirname, "static"),
    host: "127.0.0.1",
    port: process.env.PORT || 8601,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        ws: false,
        changeOrigin: true,
      },
    },
  },
  output: {
    path: __dirname + "/static",
    filename: "[name].bundle.js",
    publicPath: './',
  },
  performance: {
    hints: false,
  },
  watchOptions: {
    ignored: ["node_modules", "src/build/**/*"],
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        include: /node_modules/,
        loaders: ["strip-sourcemap-loader"],
      },
      {
        loader: "babel-loader",
        exclude: /node_modules/,
        test: /\.jsx?$/,
        query: {
          presets: ["es2015", "stage-3"],
        },
      },
    ],
  },
  plugins: [
    new WebpackNotifierPlugin({
      title: "ScratchJr",
      alwaysNotify: true,
    }),
  ],
}
