<div align="center">
  <img  height="200"
    src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/512px-React-icon.svg.png">
  <h1>emp-proptypes-docgen-plugin</h1>
  <p>A webpack plugin to inject react typescript docgen information for empPropTypes.</p>
</div>

## Install

```sh
npm install --save-dev emp-proptypes-docgen-plugin
# or
yarn add -D emp-proptypes-docgen-plugin
```

## Usage

> NOTE: The TypeScript compiler options `allowSyntheticDefaultImports` and `esModuleInterop` will make
> `emp-proptypes-docgen-plugin` a lot harder! Turn them off for faster build times.

```ts
const ts = require("typescript");
const ReactDocgenTypescriptPlugin = require("emp-proptypes-docgen-plugin")
  .default;

module.exports = {
  plugins: [
    // Will default to loading your root tsconfig.json
    new ReactDocgenTypescriptPlugin(),
    // or with a specific tsconfig
    new ReactDocgenTypescriptPlugin({ tsconfigPath: "./tsconfig.dev.json" }),
    // or with compiler options
    new ReactDocgenTypescriptPlugin({
      compilerOptions: { jsx: ts.JsxEmit.Preserve },
    }),
  ],
};
```

### Options

This plugins support all parser options from [react-docgen-typescript](https://github.com/styleguidist/react-docgen-typescript#parseroptions) and all of the following options

| Option          | Type    | Description                                                                                                                                         | Default         |
| --------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| tsconfigPath    | string  | Specify the location of the `tsconfig.json` to use.                                                                                                 | `null`          |
| compilerOptions | object  | Specify compiler options. Cannot be used with `tsconfigPath`                                                                                        | `null`          |
| setDisplayName  | boolean | Set the components' display name. If you want to set display names yourself or are using another plugin to do this, you should disable this option. | `true`          |
| typePropName    | string  | Specify the name of the property for docgen info prop type.                                                                                         | `type`          |
| exclude         | glob[]  | Glob patterns to ignore and not generate docgen information for. (Great for ignoring large icon libraries)                                          | `[]`            |
| include         | glob[]  | Glob patterns to generate docgen information for                                                                                                    | `['**/**.tsx']` |

## Prior Art

- [react-docgen-typescript-plugin](https://github.com/hipstersmoothie/react-docgen-typescript-plugin) - Webpack plugin to generate docgen information from Typescript React components.
