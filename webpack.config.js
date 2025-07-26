const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    'background/service-worker': './src/background/service-worker.ts',
    'content-scripts/github-enhancer': './src/content-scripts/github-enhancer.ts'
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: 'manifest.json',
          to: 'manifest.json'
        },
        {
          from: 'popup.html',
          to: 'popup.html'
        },
        {
          from: 'src/popup',
          to: 'popup',
          noErrorOnMissing: true
        },
        {
          from: 'src/styles',
          to: 'styles',
          noErrorOnMissing: true
        }
      ],
    }),
  ],
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  mode: 'development',
  optimization: {
    minimize: false
  }
};