/* eslint-disable capitalized-comments */
/* eslint-disable import/no-dynamic-require */
/* eslint-disable global-require */
/* eslint-disable @typescript-eslint/no-var-requires */
import path from "path";
import createDebug from "debug";
import ts from "typescript";
import * as docGen from "react-docgen-typescript";
import { matcher } from "micromatch";
import * as webpack from "webpack";
import findCacheDir from "find-cache-dir";
import flatCache from "flat-cache";
import crypto from "crypto";

// Import fs from "fs";
// import { outputFileSync, existsSync } from "fs-extra";
import { LoaderOptions } from "./types";
import {
  generateDocgenCodeBlock,
  GeneratorOptions
} from "./generateDocgenCodeBlock";

// const CopyPlugin = require("copy-webpack-plugin");

const debugExclude = createDebug("docgen:exclude");
const debugInclude = createDebug("docgen:include");

interface TypescriptOptions {
  /**
   * Specify the location of the tsconfig.json to use. Can not be used with
   * compilerOptions.
   **/
  tsconfigPath?: string;
  /** Specify TypeScript compiler options. Can not be used with tsconfigPath. */
  compilerOptions?: ts.CompilerOptions;
}

export type PluginOptions = docGen.ParserOptions &
  LoaderOptions &
  TypescriptOptions & {
    /** Glob patterns to ignore */
    exclude?: string[];
    /** Glob patterns to include. defaults to ts|tsx */
    include?: string[];
    outputDir?: string;
    inlineWithComponent?: boolean;
  };

/** Get the contents of the tsconfig in the system */
function getTSConfigFile(tsconfigPath: string): ts.ParsedCommandLine {
  try {
    const basePath = path.dirname(tsconfigPath);
    const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);

    return ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      basePath,
      {},
      tsconfigPath
    );
  } catch (error) {
    return {} as ts.ParsedCommandLine;
  }
}

/** Create a glob matching function. */
const matchGlob = (globs?: string[]) => {
  const matchers = (globs || []).map((g) => matcher(g, { dot: true }));

  return (filename: string) =>
    Boolean(filename && matchers.find((match) => match(filename)));
};

// The cache is used only with webpack 4 for now as webpack 5 comes with caching of its own
const cacheId = "ts-docgen";
const cacheDir = findCacheDir({ name: cacheId });
const cache = flatCache.load(cacheId, cacheDir);

const resolvePathForGlob = (p: string) => {
  return p.split(path.sep).join("/");
};

const getPatshForGlob = (paths: string[]) => {
  return paths.map((item) => resolvePathForGlob(item));
};

export const resolveApp = (relativePath: string) => {
  return path.join(process.cwd(), relativePath);
};

export const resolveLocal = (relativePath: string) => {
  return path.join(__dirname, relativePath);
};

const generateJSON = () => {
  const pkg = require(resolveApp("./package.json"));
  const version = (process.env.NEXT_VERSION || pkg.version) as string;

  const scope = (pkg.name as string).split("/")[0];
  const jsonStr = JSON.stringify({
    packageName: pkg.name,
    // ????????????nextversion???tag???????????????????????????
    versionTag: version.match(/\d+.\d+.\d+-(\S+)\.\d+/)?.[1],
    docgens: (global as any).docgens,
    scope
  });
  return jsonStr;
};

/** Run the docgen parser and inject the result into the output */
/** This is used for webpack 4 or earlier */
function processModule(
  parser: docGen.FileParser,
  webpackModule: webpack.Module,
  tsProgram: ts.Program,
  loaderOptions: Required<LoaderOptions>,
  inlineWithComponent?: boolean
) {
  if (!webpackModule) {
    return;
  }

  const hash = crypto
    .createHash("sha1")
    // eslint-disable-next-line
    // @ts-ignore
    // eslint-disable-next-line
    .update(webpackModule._source._value)
    .digest("hex");
  const cached = cache.getKey(hash);

  if (cached) {
    // eslint-disable-next-line
    // @ts-ignore
    debugInclude(`Got cached docgen for "${webpackModule.request}"`);
    // eslint-disable-next-line
    // @ts-ignore
    // eslint-disable-next-line
    webpackModule._source._value = cached;
    return;
  }

  // eslint-disable-next-line
  // @ts-ignore: Webpack 4 type
  const { userRequest } = webpackModule;

  const componentDocs = parser.parseWithProgramProvider(
    userRequest,
    () => tsProgram
  );

  if (!componentDocs.length) {
    return;
  }

  const docs = generateDocgenCodeBlock({
    filename: userRequest,
    source: userRequest,
    componentDocs,
    inlineWithComponent,
    ...loaderOptions
  }).substring(userRequest.length);

  // eslint-disable-next-line
  // @ts-ignore: Webpack 4 type
  // eslint-disable-next-line
  let sourceWithDocs = webpackModule._source._value;

  sourceWithDocs += `\n${docs}\n`;

  // eslint-disable-next-line
  // @ts-ignore: Webpack 4 type
  // eslint-disable-next-line
  webpackModule._source._value = sourceWithDocs;
}

/** Inject typescript docgen information into modules at the end of a build */
export default class DocgenPlugin implements webpack.WebpackPluginInstance {
  private name = "React Docgen Typescript Plugin";
  private options: PluginOptions;

  constructor(options: PluginOptions = {}) {
    const opts = { ...options };
    if (options.include) {
      opts.include = getPatshForGlob(options.include);
    }

    if (options.exclude) {
      opts.exclude = getPatshForGlob(options.exclude);
    }

    this.options = opts;
  }

  apply(compiler: webpack.Compiler): void {
    const pluginName = "DocGenPlugin";
    const { docgenOptions, compilerOptions, generateOptions } =
      this.getOptions();
    const docGenParser = docGen.withCompilerOptions(
      compilerOptions,
      docgenOptions
    );
    const { exclude = [], include = ["**/**.tsx"] } = this.options;
    const isExcluded = matchGlob(exclude);
    const isIncluded = matchGlob(include);
    // Property compiler.version is set only starting from webpack 5
    const webpackVersion = compiler.webpack?.version || "";
    const isWebpack5 = parseInt(webpackVersion.split(".")[0], 10) >= 5;

    compiler.hooks.compilation.tap(
      pluginName,
      (compilation: webpack.Compilation) => {
        if (isWebpack5) {
          // Since this file is needed only for webpack 5, load it only then
          // to simplify the implementation of the file.
          //
          // eslint-disable-next-line
          const { DocGenDependency } = require("./dependency");

          compilation.dependencyTemplates.set(
            // eslint-disable-next-line
            // @ts-ignore: Webpack 4 type
            DocGenDependency,
            // eslint-disable-next-line
            // @ts-ignore: Webpack 4 type
            new DocGenDependency.Template()
          );
        }

        compilation.hooks.seal.tap(pluginName, () => {
          const modulesToProcess: [string, webpack.Module][] = [];

          // 1. ??????module source?????????moduleToProcess
          compilation.modules.forEach((module: webpack.Module) => {
            if (!module.nameForCondition) {
              return;
            }

            const nameForCondition = module.nameForCondition() || "";

            if (isExcluded(nameForCondition)) {
              debugExclude(
                `Module not matched in "exclude": ${nameForCondition}`
              );
              return;
            }

            if (!isIncluded(nameForCondition)) {
              debugExclude(
                `Module not matched in "include": ${nameForCondition}`
              );
              return;
            }

            modulesToProcess.push([nameForCondition, module]);
          });

          // 2. ???source module????????????ts program????????????????????????
          const tsProgram = ts.createProgram(
            modulesToProcess.map(([name]) => name),
            compilerOptions
          );

          // 3. ??????module??????????????????????????????????????????????????????????????????????????????
          modulesToProcess.forEach(([name, module]) => {
            if (isWebpack5) {
              // Since this file is needed only for webpack 5, load it only then
              // to simplify the implementation of the file.
              //
              // eslint-disable-next-line
              const { DocGenDependency } = require("./dependency");
              const codeBlock = generateDocgenCodeBlock({
                filename: name,
                source: name,
                // ???????????????????????????jsdoc???json??????
                componentDocs: docGenParser.parseWithProgramProvider(
                  name,
                  () => tsProgram
                ),
                inlineWithComponent: this.options.inlineWithComponent,
                ...generateOptions
              }).substring(name.length);
              if (!codeBlock) return;

              const dep = new DocGenDependency(
                // ???docGen???????????????json????????????????????????ts-ast, ????????????TS??????????????????source?????????
                codeBlock
              );
              module.addDependency(
                dep
                // eslint-disable-next-line
                // @ts-ignore: Webpack 4 type
              );
            } else {
              // Assume webpack 4 or earlier
              processModule(
                docGenParser,
                module,
                tsProgram,
                generateOptions,
                this.options.inlineWithComponent
              );
            }
          });
          // ?????????https://github.com/jacob-ebey/webpack-federated-stats-plugin/blob/main/index.js
          const jsonStr = generateJSON();

          const jsonBuffer = Buffer.from(jsonStr, "utf-8");

          const jsonSource = {
            source: () => jsonBuffer,
            size: () => jsonBuffer.length
          };
          const outputDir = this.options.outputDir || "emp.docgen.json";
          const asset = compilation.getAsset(outputDir);
          if (asset) {
            compilation.updateAsset(outputDir, jsonSource as any);
          } else {
            compilation.emitAsset(outputDir, jsonSource as any);
          }

          // ??????????????????DEV????????????????????????????????????????????????hmr???????????????
          delete (global as any).docgens;
        });
      }
    );
    // const isDev = process.env.npm_lifecycle_script?.includes("emp dev");
    // if (existsSync(resolveLocal(".cache/.docgen"))) {
    //   const copyPlugin = new CopyPlugin({
    //     patterns: [
    //       {
    //         from: "./**/*",
    //         context: resolveLocal(".cache/.docgen"),
    //         to: this.options.outputDir || resolveApp("./dist")
    //         // ignore: [".DS_Store", ".gitkeep"]
    //       }
    //     ]
    //   });
    //   copyPlugin.apply(compiler);
    // }
  }

  getOptions(): {
    docgenOptions: docGen.ParserOptions;
    generateOptions: {
      setDisplayName: GeneratorOptions["setDisplayName"];
      typePropName: GeneratorOptions["typePropName"];
    };
    compilerOptions: ts.CompilerOptions;
  } {
    const {
      tsconfigPath = "./tsconfig.json",
      compilerOptions: userCompilerOptions,
      setDisplayName,
      typePropName,
      ...docgenOptions
    } = this.options;

    let compilerOptions = {
      jsx: ts.JsxEmit.React,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.Latest
    };

    if (userCompilerOptions) {
      compilerOptions = {
        ...compilerOptions,
        ...userCompilerOptions
      };
    } else {
      const { options: tsOptions } = getTSConfigFile(tsconfigPath);
      compilerOptions = { ...compilerOptions, ...tsOptions };
    }

    return {
      docgenOptions: {
        shouldExtractLiteralValuesFromEnum: true,
        shouldIncludePropTagMap: true,
        shouldRemoveUndefinedFromOptional: true,
        // ShouldExtractValuesFromUnion: true,
        // TODO: ??????componentName?????????
        // componentNameResolver: (exp, source) => {
        //   const componentName = exp.getName()
        //   return typeof componentName  === 'string' ? componentName : undefined
        // },
        ...docgenOptions
      },
      generateOptions: {
        setDisplayName: setDisplayName || true,
        typePropName: typePropName || "type"
      },
      compilerOptions
    };
  }
}

export type DocgenPluginType = typeof DocgenPlugin;
