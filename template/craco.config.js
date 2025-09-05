const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Set up aliases for development
      webpackConfig.resolve.alias = {
        ...webpackConfig.resolve.alias,
        '@': path.resolve(__dirname, 'src'),
      };
      
      return webpackConfig;
    },
  },
};
