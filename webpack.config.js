const path = require('path');
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const webpack = require("webpack");

module.exports = {
  // 多入口配置，可以为每种模块格式定义一个入口
  entry: {
    cjs: './index.js', // CommonJS入口
    esm: './index.js', // ES6模块入口
    umd: './index.js'  // UMD入口
  },
  resolve: {
    fallback: {
      path: require.resolve("path-browserify"),
      util: require.resolve("util/"),
      assert: require.resolve("assert/"),
      constants: require.resolve("constants-browserify"),
      stream: require.resolve("stream-browserify"),
      fs: require.resolve("browserify-fs"),
      url: require.resolve("url"),
      buffer: require.resolve("buffer/"),
    }
  },
  // 输出配置，根据入口生成不同的输出文件
  output: {
    // 输出目录
    path: path.resolve(__dirname, 'dist'),
    // 使用[name]占位符来输出不同入口的文件
    filename: '[name].js',
    // 为UMD模块指定全局变量名称
    library: {
      name: 'MyLibrary',
      type: 'umd' // 明确指定UMD格式
    },
    // 为CommonJS和UMD模块指定导出成员
    globalObject: 'this', // 用于UMD模块的全局this的引用
    // 其他配置...
  },
  // 指定模块加载器，如babel-loader等
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env' // 用于将高级JavaScript转译为向后兼容的版本
            ],
            // 其他Babel配置...
          }
        }
      }
    ]
  },
  // 插件列表，可以添加各种插件以扩展Webpack的功能
  plugins: [
    new CleanWebpackPlugin(),
    new webpack.DefinePlugin({
      "process.env.NODE_DEBUG": JSON.stringify(false)
      // Buffer: JSON.stringify(require("buffer/").Buffer)
    }),
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"]
    })
  ],
  // 外部依赖项，不将其包含在最终的bundle中
  externals: {
    // 如果你的库依赖于某些外部库，你可以在这里列出它们
    // 例如：react、lodash等
  },
  // 模式：'development' 或 'production'
  mode: 'development',
  // 优化生产环境的配置
  optimization: {
    minimize: true // 生产环境下压缩代码
  },
  // 开发服务器配置
  devServer: {
    // 配置开发服务器选项
  },
  // 其他Webpack配置...
};