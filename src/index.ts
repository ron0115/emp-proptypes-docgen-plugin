/* eslint-disable  */

import { PropFilter } from "react-docgen-typescript/lib/parser";
import { DocgenPluginType, PluginOptions } from "./plugin";

class EmptyPlugin {
  constructor(_: PluginOptions) {}
  apply() {}
}

let plugin: DocgenPluginType;

// It should be possible to use the plugin without TypeScript.
// In that case using it is a no-op.
try {
  require.resolve("typescript");
  plugin = require("./plugin").default;
} catch (error) {
  plugin = EmptyPlugin as any;
}

export { PluginOptions } from "./plugin";
export { plugin as EmpPropTypesDocgenPlugin };
export default plugin;

export const node_modulesPropFilter: PropFilter = (prop) => {
  if (prop.declarations !== undefined && prop.declarations.length > 0) {
    const hasPropAdditionalDescription = prop.declarations.find(
      (declaration) => {
        return !declaration.fileName.includes("node_modules");
      }
    );
    return Boolean(hasPropAdditionalDescription);
  }
  return false;
};
