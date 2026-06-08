const webpack = require("webpack");

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        crypto: require.resolve("crypto-browserify"),
        stream: require.resolve("stream-browserify"),
        path: require.resolve("path-browserify"),
        os: require.resolve("os-browserify"),
        zlib: require.resolve("browserify-zlib"),
        assert: require.resolve("assert"),
        fs: false,
        net: false,
        tls: false,
      };

      webpackConfig.plugins = (webpackConfig.plugins || []).concat([
        new webpack.ProvidePlugin({
          process: "process/browser.js", // <-- Added .js here
          Buffer: ["buffer", "Buffer"],
        }),
      ]);

      webpackConfig.ignoreWarnings = [/Failed to parse source map/];

      return webpackConfig;
    },
  },
};
