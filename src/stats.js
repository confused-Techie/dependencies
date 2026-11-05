
module.exports =
function getStats(graph) {
  calculateTransitiveDepReachability(graph);

  const dupDeps = getDupDep(graph);
  const highestDups = getHighestThreeDups(dupDeps);
  const highestDup = getHighestDup(highestDups);
  const uniquePacks = getUniquePacks(graph);
  const highestTransitiveDepReachability = getHighestTransitiveDepReachability(graph);
  const exclusiveDependencyContribution = getExclusiveDependencyContribution(graph);

  return {
    duplicateDependencies: dupDeps,
    highestDuplicateCounts: highestDups,
    highestDuplicateCount: highestDup,
    uniquePacks: uniquePacks,
    highestTransitiveDepReachability: highestTransitiveDepReachability,
    exclusiveDependencyContribution: exclusiveDependencyContribution,
  };
}

function getDupDep(graph) {
  const dupDeps = new Map();
  graph.forEachNode((key, attrib) => {
    let name = attrib.name;
    let count = 0;
    graph.forEachNode((subKey, subAttrib) => {
      if (subAttrib.name === name && attrib.location !== subAttrib.location) {
        count += 1;
      }
    });
    dupDeps.set(name, count);
  });

  // Prior to returning lets delete all package's listed that don't actually have duplicates
  dupDeps.forEach((value, key, map) => {
    if (value === 0) {
      map.delete(key);
    }
  });

  return dupDeps;
}

function getHighestThreeDups(dups) {
  let highest = new Map();

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

function getHighestDup(dups) {
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
    count: highestCount,
  };
}

function getHighestTransitiveDepReachability(graph) {
  let highestCount = 0;
  let highestPack = "";

  graph.forEachNode((key, attrib) => {
    if (attrib.transitiveDependencyReachability > highestCount && !attrib.isProjectRoot && attrib.name !== "github") {
      highestCount = attrib.transitiveDependencyReachability;
      highestPack = attrib.name;
    }
  });

  return {
    name: highestPack,
    count: highestCount,
  };
}

function getUniquePacks(graph) {
  const packs = new Set();

  graph.forEachNode((key, attrib) => {
    if (!packs.has(attrib.name)) {
      packs.add(attrib.name);
    }
  });

  return packs;
}

function calculateTransitiveDepReachability(graph) {
  const calc = (calcGraph, start) => {
    const visited = new Set();
    const pending = [...calcGraph.outNeighbors(start)];

    while(pending.length) {
      const node = pending.pop();

      if (visited.has(node)) continue;
      visited.add(node);

      for (const dep of calcGraph.outNeighbors(node)) {
        if (!visited.has(dep)) {
          pending.push(dep);
        }
      }
    }

    visited.delete(start);
    return visited;
  };

  for (const node of graph.nodes()) {
    const deps = calc(graph, node);

    graph.setNodeAttribute(node, "transitiveDependencyReachability", deps.size);
  }
}

function getExclusiveDependencyContribution(graph) {
  const reachable = (calcGraph, start, excludedEdge = null) => {
    const visited = new Set([start]);
    const pending = [start];

    while(pending.length) {
      const current = pending.pop();

      calcGraph.forEachOutEdge(
        current,
        (edge, attributes, source, target) => {
          if (edge === excludedEdge) return;
          if (visited.has(target)) return;

          visited.add(target);
          pending.push(target);
        }
      );
    }

    return visited;
  };

  const rootKey = graph.findNode((key, attrib) =>
    attrib.isProjectRoot === true
  );

  const baseline = reachable(graph, rootKey);

  const results = [];

  graph.forEachOutEdge(rootKey, (edge, attributes, source, target) => {
    const withoutEdge = reachable(graph, rootKey, edge);

    const removedNodes = [...baseline].filter(
      node => !withoutEdge.has(node)
    );

    results.push({
      dependency: graph.getNodeAttribute(target, "name"),
      version: graph.getNodeAttribute(target, "version"),
      eliminated: removedNodes.length,
      nodes: removedNodes
    });
  });

  results.sort((a, b) => b.eliminated - a.eliminated);

  return results;
}
