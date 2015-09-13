module.exports = {
  entry: ['./index.js'],
  module: {
    loaders: [{
      test: /\.js$/,
      exclude: /node_modules/,
      loader: 'babel'
    }]
  },
  resolve: {
    extensions: ['', '.js']
  },
  output: {
    path: __dirname,
    publicPath: '/',
    filename: 'bundle.js'
  }
};
