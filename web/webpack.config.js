const { resolve } = require('path');

const config2 = {
    entry: resolve(__dirname, 'src/index.ts'), // the entry point 📖 -> https://webpack.js.org/configuration/entry-context/
    output: {
        path: resolve(__dirname, 'dist'),
        filename: 'index.js',
        devtoolModuleFilenameTemplate: "../[resource-path]",
    },
    externals: [],
    devtool: 'source-map',
    resolve: { // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
        extensions: ['.ts', '.js']
    },
    module: {
        rules: [{
            test: /\.ts$/,
            exclude: /node_modules/,
            use: [{
                // configure TypeScript loader:
                // * enable sources maps for end-to-end source maps
                loader: 'ts-loader',
                options: {
                    compilerOptions: {
                        "sourceMap": true,
                    }
                }
            }]
        }]
    },
    optimization: {
        minimize: process.argv.includes('--mode=production')
    },
    stats: {
        warnings: false
    }
}

module.exports = config2