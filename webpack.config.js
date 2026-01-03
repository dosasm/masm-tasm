/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

//@ts-check

'use strict';

const path = require('path');
const nodeExternals = require('webpack-node-externals');
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
        nodeExternals(), 
        { vscode: "commonjs vscode" }  // 注意这里是对象格式，而非字符串
        ],
    resolve: {
        extensions: ['.ts', '.js'],
    },
    module: {
        rules: [{
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
        }]
    },
    optimization: {
        minimize: true
    }
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
};


module.exports = [
    extensionConfig, 
    webExtensionConfig
];