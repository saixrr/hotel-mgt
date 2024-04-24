const path = require('path');

  module.exports = {
    mode: 'development',
    entry: {
      index: './src/index.js',
      another: './src/another-module.js',
    },
    output: {
      filename: '[name].bundle.js',
      path: path.resolve(__dirname, 'dist'),
    },
    module: {
        rules:[
            {
                test: /\.css$/,
                use:['style-loader','css-loader'],
            },
            {
                test: /\.(png|svg|jpg|gif)$/,
                use:['file-loader'],
            },
        ],
    },
   optimization: {
     splitChunks: {
       chunks: 'all',
     },
   },
  };