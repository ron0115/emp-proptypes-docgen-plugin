<div align="center">
  <img  height="200"
    src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/512px-React-icon.svg.png">
  <h1>emp-proptypes-docgen-plugin</h1>
  <p>通过 React Typescript Docgen 对象 生成 `empPropTypes` 并插入组件的一个webpack插件。</p>
</div>

## Install

```sh
npm install --save-dev emp-proptypes-docgen-plugin
# or
yarn add -D emp-proptypes-docgen-plugin
```

## Example

#### 生成`empPropTypes.defined.description`

```javascript
/**
 * 营收礼物图标
 */
export const PropsIcon = (props: PropsIconType) => {}

      ↓ ↓ ↓ ↓ ↓ ↓

PropsIcon.empPropTypes = {
  "defined": {
    "description": "营收礼物图标"
  },
  "name": "PropsIcon",
  "props": {...}
}
```

#### 生成`empPropTypes.props`

```javascript
// 通过类型获取`description`和`type`
export type PropsIconType = {
  /** 礼物id，用于获取礼物图标 */
  propsId: number
}
// 通过defaultProps获取defaultValue
PropsIcon.defaultProps = {
  propsId: 12,
}
// 通过组件参数内联写法获取defaultValue
export const PropsIcon = ({
  propsId = 12
}: PropsIconType) => {}

      ↓ ↓ ↓ ↓ ↓ ↓
PropsIcon.empPropTypes = {
  "defined": {
    "description": "营收礼物图标"
  },
  "name": "PropsIcon",
  "props": {
    "propsId": {
      "defaultValue": 12,
      "description": "礼物id，用于获取礼物图标",
      "label": "propsId",
      "required": false,
      "type": "InputNumber"
    },
    "...": {...}
  }
}

```

## Usage

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

## About

支持[react-docgen-typescript](https://github.com/styleguidist/react-docgen-typescript#parseroptions) 的所有参数透传。其他可用的配置项可以参考[react-docgen-typescript-plugin](https://github.com/hipstersmoothie/react-docgen-typescript-plugin)
