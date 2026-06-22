// craco.config.js
const webpack = require('webpack');

function excludeSourceMapLoaderForPackages(webpackConfig, packagePattern) {
    const rules = webpackConfig.module.rules;

    const patchRule = (rule) => {
        if (
            rule.loader &&
            String(rule.loader).includes("source-map-loader")
        ) {
            rule.exclude = Array.isArray(rule.exclude)
                ? [...rule.exclude, packagePattern]
                : rule.exclude
                  ? [rule.exclude, packagePattern]
                  : packagePattern;
        }
    };

    rules.forEach((rule) => {
        patchRule(rule);
        rule.oneOf?.forEach(patchRule);
    });
}

module.exports = {
    webpack: {
        configure: (webpackConfig) => {
            // 添加扩展名解析，以解决没有写完整扩展名的问题
            webpackConfig.resolve.extensions = [
                ...(webpackConfig.resolve.extensions || []),
                ".ts",
                ".tsx",
                ".js",
                ".jsx",
            ];

            // 针对 'stream' 的 fallback 配置
            webpackConfig.resolve.fallback = {
                ...webpackConfig.resolve.fallback,
                "stream": require.resolve("stream-browserify"),
            };

            // Published @nervosnetwork packages ship without src/ files referenced
            // by their source maps, which spams source-map-loader warnings in CRA.
            excludeSourceMapLoaderForPackages(
                webpackConfig,
                /@nervosnetwork/,
            );

            return webpackConfig;
        },
        plugins: {
            add: [
                new webpack.ProvidePlugin({
                    Buffer: ['buffer', 'Buffer'],
                }),
            ],
        },
    },
};
