/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
//@ts-nocheck


'use strict';

const path = require('path');
const webpack = require('webpack');

/** @typedef {import('webpack').Configuration} WebpackConfig **/

/** @type WebpackConfig */
const extensionConfig = {
    target: 'node', // 运行在 Node.js 环境
    entry: './src/extension.ts',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'extension.js',
        libraryTarget: "commonjs2",
        devtoolModuleFilenameTemplate: "../[resource-path]",
    },
    node: {
        __dirname: false,
    },
    devtool: 'source-map',
    externals: [
        { vscode: "commonjs vscode" },
        ({ context, request }, callback) => {
            if (request.startsWith('node:')) {
                const moduleName = request.slice(5);
                return callback(null, `commonjs ${moduleName}`);
            }
            callback();
        }
    ],
    resolve: {
        extensions: ['.ts', '.js',],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [{
                    loader: 'ts-loader',
                    options: {
                        compilerOptions: {
                            "sourceMap": true,
                        }
                    }
                }]
            }
        ]
    },
    optimization: {
        minimize: process.argv.includes("--mode=production"),
    },
};

/** @type WebpackConfig */
const webExtensionConfig = {
    mode: 'none',
    target: 'webworker',
    entry: {
        extension: './src/web/extension.ts',
        'test/suite/index': './src/web/test/suite/index.ts',
    },
    output: {
        filename: '[name].js',
        path: path.join(__dirname, './dist/web'),
        libraryTarget: 'commonjs',
        devtoolModuleFilenameTemplate: '../../[resource-path]'
    },
    resolve: {
        mainFields: ['browser', 'module', 'main'],
        extensions: ['.ts', '.js'],
        alias: {
            // 关键修复：映射 node: 协议到对应的 polyfill 模块
            'node:process': 'process/browser',
            'node:buffer': 'buffer/',
        },
        fallback: {
            assert: require.resolve('assert'),
            path: require.resolve('path-browserify'),
            buffer: require.resolve('buffer/'), // 添加 buffer  polyfill
            process: require.resolve('process/browser'), // 确保 process 映射
        },
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'ts-loader',
                    },
                ],
            },
        ],
    },
    plugins: [
        new webpack.ProvidePlugin({
            process: 'process/browser',
            Buffer: ['buffer', 'Buffer'], // 提供 Buffer 全局变量
        }),
    ],
    externals: {
        vscode: 'commonjs vscode',
    },
    performance: {
        hints: false,
    },
    devtool: 'nosources-source-map',
    optimization: {
        minimize: process.argv.includes("--mode=production"),
    },
};


const webviewConfig = {
    entry: path.resolve(__dirname, "src/webview/index.ts"), // the entry point 📖 -> https://webpack.js.org/configuration/entry-context/
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "index.js",
        devtoolModuleFilenameTemplate: "../[resource-path]",
    },
    externals: [],
    devtool: "source-map",
    resolve: {
        // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
        extensions: [".ts", ".js"],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [
                    {
                        // configure TypeScript loader:
                        // * enable sources maps for end-to-end source maps
                        loader: "ts-loader",
                        options: {
                            compilerOptions: {
                                sourceMap: true,
                            },
                        },
                    },
                ],
            },
        ],
    },
    optimization: {
        minimize: process.argv.includes("--mode=production"),
    },
    stats: {
        warnings: false,
    },
};

function getEntry() {
    const entry = {};
    const srcDir = path.resolve(__dirname, 'src/test');
    const fs = require('fs');
    function scanDir(currentDir) {
        const files = fs.readdirSync(currentDir);
        files.forEach(file => {
            const filePath = path.join(currentDir, file);
            const stats = fs.statSync(filePath);
            if (stats.isDirectory()) {
                scanDir(filePath);
            } else if (path.extname(file) === '.ts') {
                const entryName = path.relative(srcDir, filePath).replace(/\.ts$/, '');
                entry[entryName] = filePath;
            }
        });
    }
    scanDir(srcDir);
    return entry;
}

const extensionTestFiles = {
    entry: getEntry(),
    output: {
        path: path.resolve(__dirname, 'dist/test'),
        filename: '[name].js',
        libraryTarget: 'commonjs2'
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/
            }
        ]
    },
    resolve: {
        extensions: ['.ts', '.js']
    },
    mode: 'development',
    externals: [
        function ({ context, request }, callback) {
            if (/^[^./]/.test(request) && !path.isAbsolute(request)) {
                callback(null, 'commonjs ' + request);
            } else {
                callback();
            }
        }
    ],
    node:{
        __dirname: false,
    }
};

module.exports = [
    extensionConfig,
    webExtensionConfig,
    webviewConfig,
];

if (process.argv.includes("--mode=production")) {
    module.exports = [
        extensionConfig,
        webExtensionConfig,
        webviewConfig,
    ];

} else {
    module.exports = [
        extensionConfig,
        webExtensionConfig,
        webviewConfig,
        extensionTestFiles,
    ];
}