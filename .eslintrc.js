module.exports = {
    "env": {
        "browser": true,
        "es2021": true,
    },
    "extends": [
        "eslint:recommended",
        "plugin:node/recommended",
        "prettier"
    ],
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "ecmaFeatures": {
            "jsx": true
        },
        "ecmaVersion": "latest",
        "sourceType": "module",
    },
    "plugins": ["@typescript-eslint"],
    "rules": {
        "import/extensions": [
            "error",
            "always",
            {
                "js": "never",
                "jsx": "never",
                "ts": "never",
                "tsx": "never"
            }
        ],
        "no-unused-vars": "off",
        camelcase: ["error", {allow: ["_UNSAFE$"]}],
        "no-use-before-define": [0],
        "@typescript-eslint/explicit-function-return-type": 0,
        "@typescript-eslint/explicit-member-accessibility": 0,
        "@typescript-eslint/indent": 0,
        "@typescript-eslint/member-delimiter-style": 0,
        "@typescript-eslint/no-explicit-any": 0,
        "@typescript-eslint/no-var-requires": 0,
        "@typescript-eslint/no-use-before-define": 0,
        "@typescript-eslint/no-unused-vars": [
            1,
            {
                "argsIgnorePattern": "^_"
            }
        ],
        "no-console": 1,
        "import/prefer-default-export": 1,
        "no-shadow": 1,
        "prefer-const": 1,
        "prefer-spread": 1,
        "no-unused-expressions": [
            "error",
            { "allowShortCircuit": true, "allowTernary": true }
        ],
        "no-return-assign": "off",
        "no-underscore-dangle": "off",
        "no-param-reassign": [
            "error",
            { "props": true, "ignorePropertyModificationsFor": ["state"] }
        ],
    },
    "settings": {
        "import/resolver": {
            "node": {
                "extensions": [".js", ".jsx", ".ts", ".tsx"],
                "moduleDirectory": ["node_modules", "src/"]
            }
        }
    },
    overrides: [
        {
            "files": [ "*.spec.js" ],
            "rules": {
                "jest/valid-expect": 0,
                "jest/expect-expect": 0,
            }
        }
    ],
    globals: {
        React: true,
        google: true,
        mount: true,
        mountWithRouter: true,
        shallow: true,
        shallowWithRouter: true,
        context: true,
        expect: true,
        jsdom: true,
        JSX: true,
    }
};
