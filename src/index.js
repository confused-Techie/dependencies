const tree = require("./tree.js");
const stickyStats = require("./sticky-stats.js");
const report = require("./report.js");
const facts = require("./facts.js");
const asks = require("./asks.js");

module.exports =
async function index(argv) {
  const graph = await tree(argv);
  await stickyStats.apply(graph, argv);

  if (argv.print) {
    report.print(graph, argv);
  }
  if (argv.dependency) {
    facts.print(graph, argv);
  }
  if (argv.ask) {
    asks.print(graph, argv);
  }
}
