// Sticky stats are additional information that can be gathered about a node
// that then lives with that node.
const path = require("node:path");
const fs = require("node:fs");
const { getDependencyClosure } = require("./calculate-stats.js");

async function apply(graph, argv) {
  calculateTransitiveDepReachability(graph);
  appendMetadata(graph);
  calculateSize(graph);
}

function calculateTransitiveDepReachability(graph) {
  console.log("Calculating Transitive Dependency Reachability");
  let idx = 0;
  for (const node of graph.nodes()) {
    idx++;
    if (idx % 10 === 1) {
      process.stdout.write(".");
    }
    const deps = getDependencyClosure(graph, node);

    graph.setNodeAttribute(node, "transitiveDependencyReachability", deps.size);
  }
  console.log("\n");
}

function appendMetadata(graph) {
  console.log("Appending Metadata");
  let idx = 0;
  for (const node of graph.nodes()) {
    idx++;
    if (idx % 10 === 1) {
      process.stdout.write(".");
    }
    const packagePath = path.join(
      graph.getNodeAttribute(node, "location"),
      "package.json"
    );
    const package = fs.readFileSync(packagePath, { encoding: "utf-8" });
    graph.setNodeAttribute(node, "metadata", JSON.parse(package));
  }
  console.log("\n");
}

function calculateSize(graph) {
  console.log("Calculating Dependency Size");
  let idx = 0;
  for (const node of graph.nodes()) {
    idx++;
    if (idx % 10 === 1) {
      process.stdout.write(".");
    }

    const depSize = getFolderSize(graph.getNodeAttribute(node, "location"));
    graph.setNodeAttribute(node, "size", depSize);
  }
  console.log("\n");
}

function getFolderSize(dirPath) {
  let totalSize = 0;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isFile()) {
      totalSize += fs.statSync(fullPath).size;
    } else if (entry.isDirectory()) {
      if (path.basename(fullPath) !== "node_modules") {
        totalSize += getFolderSize(fullPath);
      }
    }
  }

  return totalSize;
}

module.exports = {
  apply: apply,
  calculateTransitiveDepReachability: calculateTransitiveDepReachability,
};
