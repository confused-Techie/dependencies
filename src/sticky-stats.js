// Sticky stats are additional information that can be gathered about a node
// that then lives with that node.
const { getDependencyClosure } = require("./calculate-stats.js");

async function apply(graph, argv) {
  calculateTransitiveDepReachability(graph);
}

function calculateTransitiveDepReachability(graph) {
  for (const node of graph.nodes()) {
    const deps = getDependencyClosure(graph, node);

    graph.setNodeAttribute(node, "transitiveDependencyReachability", deps.size);
  }
}

module.exports = {
  apply: apply,
  calculateTransitiveDepReachability: calculateTransitiveDepReachability,
};
