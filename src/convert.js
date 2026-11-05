// This converts an ArboristNode into our Dependency Object
const { MultiDirectedGraph } = require("graphology");

module.exports =
function convertArborist(tree) {
  const graph = new MultiDirectedGraph();
  const unresolved = [];

  const addNode = (node) => {
    if (!graph.hasNode(node.path)) {
      graph.addNode(node.path, {
        name: node.name,
        version: node.version,
        location: node.path,
        url: node.resolved ?? "",
        isProjectRoot: node === tree,
        isLink: node.isLink
      });
    }
  }

  addNode(tree);

  for (const node of tree.inventory.values()) {
    addNode(node);
  }

  const nodes = new Set([
    tree,
    ...tree.inventory.values()
  ]);

  for (const node of nodes) {
    for (const edge of node.edgesOut.values()) {
      if (!edge.to) {
        unresolved.push({
          from: edge.from.path,
          name: edge.name,
          spec: edge.spec,
          type: edge.type,
          error: edge.error
        });

        continue;
      }

      addNode(edge.from);
      addNode(edge.to);

      const edgeKey = JSON.stringify([
        edge.from.path,
        edge.name
      ]);

      graph.addDirectedEdgeWithKey(
        edgeKey,
        edge.from.path,
        edge.to.path,
        {
          name: edge.name,
          type: edge.type,
          spec: edge.spec,
          valid: edge.valid,
          error: edge.error
        }
      );
    }
  }

  graph.setAttribute("unresolved", unresolved);

  return graph;
}
