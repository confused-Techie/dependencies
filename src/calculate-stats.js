const path = require("node:path");

function getRootKey(graph) {
  return graph.findNode((key, attrib) =>
    attrib.isProjectRoot === true
  );
}

function getReachabilityList(graph) {
  const rootKey = getRootKey(graph);
  const reachable = getDependencyClosure(graph, rootKey);
  reachable.add(rootKey);
  const unreachable = graph.nodes().filter(key => !reachable.has(key));

  return {
    reachable: reachable,
    unreachable: unreachable,
  };
}

function getReachableNodes(graph, start, opts = {}) {
  const includeStart = opts.includeStart ?? true;
  const excludedEdge = opts.excludedEdge ?? null;

  const visited = new Set([start]);
  const pending = [start];

  while(pending.length > 0) {
    const current = pending.pop();

    graph.forEachOutEdge(current, (edge, attributes, source, target) => {
      if (edge === excludedEdge) return;
      if (visited.has(target)) return;

      visited.add(target);
      pending.push(target);
    });
  }

  if (!includeStart) {
    visited.delete(start);
  }

  return visited;
}

function getDependencyClosure(graph, start) {
  return getReachableNodes(graph, start, { includeStart: false });
}

function getRootReachability(graph, root, excludedEdge = null) {
  return getReachableNodes(graph, root, { excludedEdge: excludedEdge });
}

function getUniqueDependencies(graph) {
  const deps = new Set();

  graph.forEachNode((key, attrib) => {
    if (!deps.has(attrib.name)) {
      deps.add(attrib.name);
    }
  });

  return deps;
}

function getDuplicateDependencies(graph) {
  const dups = new Map();

  graph.forEachNode((key, attrib) => {
    let name = attrib.name;
    let count = 0;
    graph.forEachNode((subKey, subAttrib) => {
      if (subAttrib.name === name && attrib.location !== subAttrib.location) {
        count += 1;
      }
    });
    dups.set(name, count);
  });

  // Prior to returning lets delete all package's listed that don't actually have duplicates
  dups.forEach((value, key, map) => {
    if (value === 0) {
      map.delete(key);
    }
  });

  return dups;
}

function getHighThreeDuplicateDependencies(graph) {
  const dups = getDuplicateDependencies(graph);
  const highest = new Map();

  for (let i = 0; i < 3; i++) {
    let highestCount = 0;
    let highestPack = "";
    dups.forEach((value, key, map) => {
      if (value > highestCount && !highest.has(key)) {
        highestCount = value;
        highestPack = key;
      }
    });
    highest.set(highestPack, highestCount);
  }

  return highest;
}

function getHighestDuplicateDependencies(graph) {
  const dups = getDuplicateDependencies(graph);
  let highestCount = 0;
  let highestPack = "";

  dups.forEach((value, key, map) => {
    if (value > highestCount) {
      highestCount = value;
      highestPack = key;
    }
  });

  return {
    name: highestPack,
    count: highestCount
  };
}

function getVersionDistribution(graph, name) {
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

function getHighestTransitiveDependencyReachability(graph) {
  let highestCount = 0;
  let highestPack = "";

  graph.forEachNode((key, attrib) => {
    if (attrib.transitiveDependencyReachability > highestCount && !attrib.isProjectRoot) {
      highestCount = attrib.transitiveDependencyReachability;
      highestPack = attrib.name;
    }
  });

  return {
    name: highestPack,
    count: highestCount
  };
}

function getExclusiveDependencyContribution(graph) {
  const rootKey = getRootKey(graph);
  const baseline = getRootReachability(graph, rootKey);
  const results = [];

  graph.forEachOutEdge(rootKey, (edge, attribs, source, target) => {
    const withoutEdge = getRootReachability(graph, rootKey, edge);

    const removedNodes = [...baseline].filter(node => !withoutEdge.has(node));

    results.push({
      name: graph.getNodeAttribute(target, "name"),
      version: graph.getNodeAttribute(target, "version"),
      eliminated: removedNodes.length,
      nodes: removedNodes
    });
  });

  results.sort((a, b) => b.eliminated - a.eliminated);

  return results;
}

function getConsumers(graph, instances) {
  const consumers = new Set();

  for (const key of instances) {
    for (const consumer of graph.inNeighbors(key)) {
      consumers.add(consumer);
    }
  }

  return consumers;
}

function getIncomingRequirements(graph, instance) {
  const relationships = [];

  graph.forEachInEdge(instance, (edge, attributes, source) => {
    relationships.push({
      edge,
      source,
      instance,
      consumer: graph.getNodeAttribute(source, "name"),
      dependency: graph.getNodeAttribute(instance, "name"),
      requirement: attributes.spec,
      type: attributes.type
    });
  });

  return relationships;
}

function getVersionDistribution(graph, name) {
  const versions = new Map();

  graph.forEachNode((key, attrib) => {
    if (attrib.name !== name) return;

    versions.set(
      attrib.version,
      (versions.get(attrib.version) ?? 0 ) + 1
    );
  });

  return [...versions.entries()].sort((a, b) => b[1] - a[1]);
}

function analyzeVersionPlacement(graph, depName) {
  const rootKey = getRootKey(graph);
  const rootPath = graph.getNodeAttribute(rootKey, "location");

  const versions = new Map();

  graph.forEachNode((key, attrib) => {
    if (attrib.name !== depName) return;

    if (!versions.has(attrib.version)) {
      versions.set(attrib.version, []);
    }

    versions.get(attrib.version).push(key);
  });

  if (versions.size < 2) return null;

  let distribution = [];

  versions.forEach((instances, version, map) => {
    const obj = {};
    obj.installCount = instances.length;
    obj.consumerCount = getConsumers(graph, instances).size;
    obj.version = version;
    obj.instances = instances;
    obj.demandRatio = obj.consumerCount / obj.installCount;

    distribution.push(obj);
  });

  distribution.sort((a, b) => b.installCount - a.installCount);

  const dominant = distribution[0];
  const rootLocation = path.join(rootPath, "node_modules", ...depName.split("/"));

  const rootInstance = graph.findNode((key, attrib) =>
    attrib.name === depName &&
    path.normalize(attrib.location) === rootLocation
  );

  if (!rootInstance) {
    // Protect when the root instance isn't found, usually when unresolved
    return null;
  }

  const rootVersion = graph.getNodeAttribute(rootInstance, "version");
  const rootInstallCount = distribution.find((ele) => ele.version === rootVersion).installCount;
  const rootDemandRatio = distribution.find((ele) => ele.version === rootVersion).demandRatio;

  const totalInstances = distribution.reduce((sum, entry) => sum + entry.installCount, 0);

  const isInversion = rootVersion !== dominant.version;

  const blockers = [];

  graph.forEachInEdge(rootInstance, (edgeKey, attrib, source, target) => {
    const sourceAttrib = graph.getNodeAttributes(source);
    blockers.push(sourceAttrib.name);
  });

  const obj = {
    name: depName,
    totalInstances: totalInstances,
    uniqueVersions: distribution.length,
    rootVersion: rootVersion,
    dominantVersion: dominant.version,
    dominantInstallCount: dominant.installCount,
    dominantDemandRatio: dominant.demandRatio,
    rootDemandRatio: rootDemandRatio,
    isInversion: isInversion,
    grossSavings: isInversion ? dominant.installCount - 1 : 0,
    netSavings: isInversion ? (dominant.installCount - 1) - (blockers.length - rootInstallCount) : 0,
    distribution: distribution,
    blockers: blockers,
  };

  return obj;
}

function getInstalledInstances(graph, depName) {
  const instances = new Map();

  graph.forEachNode((key, attrib) => {
    if (attrib.name !== depName) return;

    instances.set(key, attrib.version);
  });

  return instances;
}

function getRemovalImpact(graph, name) {
  const root = getRootKey(graph);
  const before = getRootReachability(graph, root);

  const instances = getInstalledInstances(graph, name);

  const simulatedGraph = graph.copy();

  const removedEdges = new Set();

  for (const instance of instances.keys()) {
    const requirements = getIncomingRequirements(graph, instance);

    for (const requirement of requirements) {
      removedEdges.add(requirement.edge);
    }
  }

  for (const edge of removedEdges) {
    simulatedGraph.dropEdge(edge);
  }

  const after = getRootReachability(simulatedGraph, root);

  const eliminated = [...before].filter(node => !after.has(node));

  const uniquePackages = new Set(
    eliminated.map(node => graph.getNodeAttribute(node, "name"))
  );

  return {
    name: name,
    affectedInstances: instances.size,
    removedRequirements: removedEdges.size,
    eliminatedInstances: eliminated.length,
    eliminatedUniquePackages: uniquePackages.size,
    eliminatedNodes: eliminated,
    eliminatedPackages: [...uniquePackages]
  };
}

function getHighestRemovalImpact(graph, opts = {}) {
  const scope = opts.scope ?? "all";
  const limit = opts.limit ?? 5;

  const root = getRootKey(graph);

  // All packages directly required by the project
  const directDependencies = new Set(
    graph.outNeighbors(root).map(node => graph.getNodeAttribute(node, "name"))
  );

  const results = [];

  for (const name of getUniqueDependencies(graph)) {
    // Exclude the project itself
    if (name === graph.getNodeAttribute(root, "name")) continue;

    const isDirect = directDependencies.has(name);

    if (scope === "direct" && !isDirect) continue;
    if (scope === "transitive" && isDirect) continue;

    const impact = getRemovalImpact(graph, name);

    results.push({
      name,
      direct: isDirect,
      eliminated: impact.eliminatedInstances,
      uniqueEliminated: impact.eliminatedUniquePackages,
      removedRelationships: impact.removedRequirements
    });
  }

  return results
    .sort((a, b) => b.eliminated - a.eliminated)
    .slice(0, limit);
}

module.exports = {
  getRootKey,
  getReachabilityList,
  getDependencyClosure,
  getUniqueDependencies,
  getDuplicateDependencies,
  getHighThreeDuplicateDependencies,
  getHighestDuplicateDependencies,
  getVersionDistribution,
  getHighestTransitiveDependencyReachability,
  getExclusiveDependencyContribution,
  getReachableNodes,
  getRootReachability,
  getConsumers,
  getVersionDistribution,
  analyzeVersionPlacement,
  getInstalledInstances,
  getIncomingRequirements,
  getRemovalImpact,
  getHighestRemovalImpact,
};
