const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      if (webpackConfig.output) {
        webpackConfig.output.hashFunction = 'md4';
      }

      if (webpackConfig.optimization) {
        webpackConfig.optimization.minimizer = webpackConfig.optimization.minimizer || [];
      }

      webpackConfig.performance = {
        ...webpackConfig.performance,
        hints: false,
        maxAssetSize: 400000,
        maxEntrypointSize: 400000,
      };

      webpackConfig.resolve = {
        ...webpackConfig.resolve,
        alias: {
          ...webpackConfig.resolve?.alias,
          '@': path.resolve(__dirname, 'src'),
        },
      };

      return webpackConfig;
    },
  },
};

