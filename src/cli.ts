import { HARNESS_NAME, PI_VERSION } from "./constants.js";

const [argument = "--help"] = process.argv.slice(2);

if (argument === "--version") {
  console.log(`${HARNESS_NAME} (Pi ${PI_VERSION})`);
} else if (argument === "--help") {
  console.log(`Usage: ${HARNESS_NAME} [--help|--version]`);
} else {
  console.error(`Unknown argument: ${argument}`);
  process.exitCode = 2;
}
