#!/usr/bin/env node
const process = require("node:process");
const yargs = require("yargs");
const dependencies = require("../src/index.js");

const argv = yargs(process.argv.slice(2))
  .option("arborist-mode", {
    alias: "mode",
    describe: "Define which type of tree Arborist will construct.",
    choices: [ "actual", "virtual", "ideal", "auto" ],
    default: "actual"
  })
  .boolean("print").describe("print", "Print the selected reports.")
  .option("reports", {
    describe: "The type of report to generate.",
    choices: [ "basic", "duplicates", "contribution", "inversion", "all" ],
    default: "basic"
  })
  .option("dependency", {
    alias: "dep",
    describe: "The dependency to specifically inspect."
  })
  .option("facts", {
    describe: "The type of facts to display for a specific dependency.",
    choices: [ "basic", "consumers", "removal-impact", "all" ],
    default: "basic"
  })
  .option("ask", {
    describe: "Ask a question about the overall graph.",
    choices: [ "highest-removal-impact" ]
  })
  .parse();
argv.cwd = process.cwd();

(async () => {
  await dependencies(argv);
})();
