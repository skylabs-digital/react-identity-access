const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Set up aliases for development
      webpackConfig.resolve.alias = {
        ...webpackConfig.resolve.alias,
        '@': path.resolve(__dirname, 'src'),
        // Ensure React is resolved from the example's node_modules
        'react': path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
        'react-router': path.resolve(__dirname, 'node_modules/react-router'),
        'react-router-dom': path.resolve(__dirname, 'node_modules/react-router-dom'),
      };

      // Ensure proper module resolution
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
      };

      // Allow imports from outside src directory for linked packages
      webpackConfig.resolve.symlinks = false;
      
      // Modify the ModuleScopePlugin to allow imports from the parent directory
      const ModuleScopePlugin = webpackConfig.resolve.plugins.find(
        plugin => plugin.constructor.name === 'ModuleScopePlugin'
      );
      
      if (ModuleScopePlugin) {
        // Remove the ModuleScopePlugin to allow imports from outside src/
        webpackConfig.resolve.plugins = webpackConfig.resolve.plugins.filter(
          plugin => plugin.constructor.name !== 'ModuleScopePlugin'
        );
      }
      
      return webpackConfig;
    },
  },
};
