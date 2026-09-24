const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// `landing/` es la web en Next.js, un proyecto npm aparte con su propio node_modules:
// sin esto Metro también rastrea esos paquetes al arrancar.
const landingDir = new RegExp(`^${__dirname.replace(/[/\\]/g, "[/\\\\]")}[/\\\\]landing[/\\\\].*`);
config.resolver.blockList = [...[].concat(config.resolver.blockList ?? []), landingDir];

module.exports = withNativeWind(config, { input: "./global.css" });
