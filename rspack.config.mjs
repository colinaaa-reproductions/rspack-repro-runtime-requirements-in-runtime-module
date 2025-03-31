import webpack from "webpack";
import { rspack } from "@rspack/core";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isRunningWebpack = !!process.env.WEBPACK;
const isRunningRspack = !!process.env.RSPACK;
if (!isRunningRspack && !isRunningWebpack) {
  throw new Error("Unknown bundler");
}

const { RuntimeGlobals, RuntimeModule } = isRunningRspack ? rspack : webpack;

class TestRuntimeModule extends RuntimeModule {
  constructor(runtimeRequirements) {
    super("Lynx chunk loading", RuntimeModule.STAGE_ATTACH);
    this.runtimeRequirements = runtimeRequirements;
  }

  generate() {
    console.log(this.runtimeRequirements);
    return `console.log(${JSON.stringify(
      Array.from(this.runtimeRequirements.values())
    )})`;
  }
}

/**
 * @type {import('webpack').Configuration | import('@rspack/cli').Configuration}
 */
const config = {
  mode: "development",
  devtool: false,
  entry: {
    main: "./src/index",
  },
  plugins: [
    (compiler) => {
      compiler.hooks.thisCompilation.tap("test", (compilation) => {
        const onceForChunkSet = new WeakSet();

        function handler(name, chunk, runtimeRequirements) {
          if (onceForChunkSet.has(chunk)) {
            console.log("already added", name, chunk.name);
            return;
          };
          console.log("adding", name, chunk.name);
          onceForChunkSet.add(chunk);
          compilation.addRuntimeModule(
            chunk,
            new TestRuntimeModule(runtimeRequirements)
          );
        }

        compilation.hooks.runtimeRequirementInTree
          .for(RuntimeGlobals.ensureChunkHandlers)
          .tap("test", handler.bind(null, "ensureChunkHandlers"));

        compilation.hooks.runtimeRequirementInTree
          .for(RuntimeGlobals.hmrDownloadUpdateHandlers)
          .tap("test", handler.bind(null, "hmrDownloadUpdateHandlers"));
      });
    },
    (compiler) => {
      new compiler.webpack.HotModuleReplacementPlugin().apply(compiler);
    },
  ],
  output: {
    clean: true,
    path: isRunningWebpack
      ? path.resolve(__dirname, "webpack-dist")
      : path.resolve(__dirname, "rspack-dist"),
    filename: "[name].js",
  },
};

export default config;
