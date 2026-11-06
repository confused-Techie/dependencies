const getDepTree = require("get-dep-tree");
const convert = require("./convert.js");
const stats = require("./stats.js");
const optimize = require("./optimizations.js");

getDepTree("actual").then((tree) => {
  const graph = convert(tree);

  console.log(`Total Installed Dependencies: ${graph.order}`);
  console.log(`Total Links between Installed Dependencies: ${graph.size}`);

  const statistics = stats(graph);

  console.log(`The Package '${statistics.highestDuplicateCount.name}' has the most duplicatations of '${statistics.highestDuplicateCount.count}'`);
  console.log(`Total Unique Dependencies: ${statistics.uniquePacks.size}`);
  console.log(`The Package '${statistics.highestTransitiveDepReachability.name}' has the most reachible transitive dependencies of '${statistics.highestTransitiveDepReachability.count}'`);
  console.log("Highest Duplicate Packages: (excess versions installed)");
  statistics.highestDuplicateCounts.forEach((value, key, map) => {
    console.log(`- '${key}': ${value}`);
  });

  console.log("Highest Duplicate Packages Version Distribution:");
  statistics.highestDuplicateCounts.forEach((value, key, map) => {
  //statistics.duplicateDependencies.forEach((value, key, map) => {
    const vers = versionDistribution(graph, key);
    console.log(`Package '${key}'; Versions:`);
    vers.forEach((element) => {
      console.log(`- '${element[0]}'; Installs: ${element[1]}`);
    });
  });

  console.log("Dependencies with the highest exclusive dependency contribution:");
  for (let i = 0; i < 4; i++) {
    if (i < statistics.exclusiveDependencyContribution.length) {
      const depName = statistics.exclusiveDependencyContribution[i].dependency;
      const eliminated = statistics.exclusiveDependencyContribution[i].eliminated;
      console.log(`Package '${depName}' exclusive dependencies '${eliminated}'`);
    }
  }

  const rootKey = graph.findNode((key, attrib) =>
    attrib.isProjectRoot === true
  );
  const reachable = getDependencyClosure(graph, rootKey);
  reachable.add(rootKey);
  const unreachable = graph.nodes().filter(key => !reachable.has(key));

  console.log(`Dependencies according to '${graph.getNodeAttributes(rootKey).name}':`);
  console.log(`- Total: ${graph.order}`);
  console.log(`- Reachable: ${reachable.size}`);
  console.log(`- Unreachable: ${unreachable.length}`);

  console.log(`Unresolved Dependency Count: ${graph.getAttribute("unresolved").length}`);

  const invNodes = graph.filterNodes((key, attrib) => attrib.name === "emoji-regex");

  //console.log(invNodes);

  //optimize.versionPlacement(graph, statistics.highestDuplicateCounts);
  optimize.checkVersionPlacement(graph, statistics.duplicateDependencies);
  //console.log(getInstallLocations(graph, "@babel/core", "7.28.4"));
  // const babelNodes = graph.filterNodes((key, attrib) =>
  //   attrib.name === "@babel/core" && attrib.version === "7.28.4"
  // );
  //
  // for (const key of babelNodes.slice(0, 10)) {
  //   const attr = graph.getNodeAttributes(key);
  //
  //   const consumers = [];
  //
  //   graph.forEachInEdge(key, (edge, edgeAttrib, source) => {
  //     consumers.push({
  //       name: graph.getNodeAttribute(source, "name"),
  //       type: edgeAttrib.type,
  //       spec: edgeAttrib.spec
  //     });
  //   });
  //
  // }
});

function getDependencyClosure(graph, start) {
  const visited = new Set();
  const pending = [...graph.outNeighbors(start)];

  while(pending.length) {
    const node = pending.pop();

    if (visited.has(node)) continue;
    visited.add(node);

    for (const dependency of graph.outNeighbors(node)) {
      if (!visited.has(dependency)) {
        pending.push(dependency);
      }
    }
  }

  visited.delete(start);
  return visited;
}

function versionDistribution(graph, name) {
  const versions = new Map();

  graph.forEachNode((key, attrib) => {
    if (attrib.name !== name) return;

    versions.set(
      attrib.version,
      (versions.get(attrib.version) ?? 0) + 1
    );
  });

  return [...versions.entries()].sort((a, b) => b[1] - a[1]);
}

function getInstallLocations(graph, name, version) {
  return graph.filterNodes(
    (key, attrib) =>
      attrib.name === name && attrib.version === version
  ).map(key => graph.getNodeAttribute(key, "location"));
}
