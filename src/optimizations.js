const path = require("node:path");

function analyzeVersionPlacement(graph, packageName, rootKey) {
  const rootPath = graph.getNodeAttribute(rootKey, "location");

  // Group every installed instance by version
  const versions = new Map();

  graph.forEachNode((key, attrib) => {
    if (attrib.name !== packageName) return;

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

  distribution.sort((a, b) => b.installCount - a.installCount );

  const dominant = distribution[0];

  // The version occupying the project's root node_modules
  const rootLocation = path.join(rootPath, "node_modules", ...packageName.split("/"));

  const rootInstance = graph.findNode((key, attrib) =>
    attrib.name === packageName &&
    path.normalize(attrib.location) === rootLocation
  );

  const rootVersion = rootInstance === undefined ? null : graph.getNodeAttribute(rootInstance, "version");
  const rootInstallCount = rootVersion === undefined ? null : distribution.find((ele) => ele.version === rootVersion).installCount;
  const rootDemandRatio = rootVersion === undefined ? null : distribution.find((ele) => ele.version === rootVersion).demandRatio;

  const totalInstances = distribution.reduce((sum, entry) => sum + entry.installCount, 0);

  const isInversion = rootVersion !== null && rootVersion !== dominant.version;

  const blockers = [];

  graph.forEachInEdge(rootInstance, (edgeKey, attrib, source, target) => {
    const sourceAttrib = graph.getNodeAttributes(source);
    blockers.push(sourceAttrib.name);
  });

  const obj = {
    name: packageName,
    totalInstances: totalInstances,
    uniqueVersions: distribution.length,
    rootVersion: rootVersion,
    dominantVersion: dominant.version,
    dominantInstallCount: dominant.installCount,
    dominantDemandRatio: dominant.demandRatio,
    rootDemandRatio: rootDemandRatio,
    isInversion: isInversion,
    //potentialSavings: isInversion ? dominant.installCount - 1 : 0,
    grossSavings: isInversion ? dominant.installCount - 1 : 0,
    netSavings: isInversion ? (dominant.installCount - 1) - (blockers.length - rootInstallCount) : 0,
    //netSavings: isInversion ? ((dominant.installCount - 1) - 1) - blockers.length : 0,
    potentialSavings: isInversion ? totalInstances - (1 + blockers.length) : 0,
    distribution: distribution,
    blockers: blockers,
  };
  return obj;
}

function checkVersionPlacement(graph, highDupCounts) {
  const results = [];

  const rootKey = graph.findNode((key, attrib) =>
    attrib.isProjectRoot === true
  );

  for (const packageName of highDupCounts.keys()) {
    const result = analyzeVersionPlacement(
      graph, packageName, rootKey
    );

    if (result?.isInversion && result?.potentialSavings > 0) {
      results.push(result);
      //console.log(result);
    }
  }

  results.sort((a, b) => b.potentialSavings - a.potentialSavings);
  console.log("Dominant Version Inversions:");
  results.forEach((result) => {
    const rootDistribution = result.distribution.find((ele) => ele.version === result.rootVersion);
    const domDistribution = result.distribution.find((ele) => ele.version === result.dominantVersion);
    console.log(result.name);
    console.log(`\tRoot: ${result.rootVersion} (${rootDistribution.installCount} installs, ${rootDistribution.consumerCount} consumers; ${result.rootDemandRatio} demand ratio)`);
    console.log(`\tDominant: ${result.dominantVersion} (${domDistribution.installCount} installs, ${domDistribution.consumerCount} consumers; ${result.dominantDemandRatio} demand ratio)`);
    console.log(`\tGross Savings: ${result.grossSavings}`);
    console.log(`\tNet Savings: ${result.netSavings}`);
    console.log(`\tBlockers: ${result.blockers.join(", ")}`);
    console.log("");
  });
}

function versionPlacement(graph, highDupCounts) {
  // Taking the Map of highDupCounts (the three highest duplicate versions)
  // of any package, attempt to determine which package needs to change to
  // unlock the smallest resolution tree

  highDupCounts.forEach((value, key, map) => {
    // 1. Identify versions of the package, and what the major version is
    const vers = versionDistribution(graph, key);
    let domVer, domVerCount = 0;

    vers.forEach((element) => {
      if (domVerCount < element[1]) {
        domVer = element[0];
        domVerCount = element[1];
      }
    });

    console.log(`Package '${key}' dominent version '${domVer}'`);

    // 2. Identify what version has the shortest resolution path (usually root `node_modules`)
    let shortPath = "", shortPathVer;

    graph.filterNodes((nodeKey, attrib) => {
      if (attrib.name === key) {
        if (shortPath.length === 0) {
          // For the first run
          shortPath = nodeKey;
          shortPathVer = attrib.version;
        }
        console.log(`- ${key}@${attrib.version} - '${nodeKey}'`);
        if (shortPath.length > nodeKey.length) {
          shortPath = nodeKey;
          shortPathVer = attrib.version;
        }
      }
    });

    console.log(`Package '${key}'s shortest path '${shortPath}' taken by '${shortPathVer}'`);
  });
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

function getConsumers(graph, instances) {
  const consumers = new Set();

  for (const key of instances) {
    for (const consumer of graph.inNeighbors(key)) {
      consumers.add(consumer);
    }
  }

  return consumers;
}
module.exports = {
  versionPlacement: versionPlacement,
  checkVersionPlacement: checkVersionPlacement,
};
