const calc = require("./calculate-stats.js");
const utils = require("./utils.js");

function print(graph, argv) {
  if (argv.reports === "all") {
    printBasic(graph, argv);
    printDuplicates(graph, argv);
    printContribution(graph, argv);
    printVersionInvestion(graph, argv);
  } else {
    switch(argv.reports) {
      case "basic":
        printBasic(graph, argv);
      case "duplicates":
        printDuplicates(graph, argv);
      case "contribution":
        printContribution(graph, argv);
      case "inversion":
        printVersionInvestion(graph, argv);
      default:
        break;
    }
  }
}

function printBasic(graph, argv) {
  console.log(`Total Installed Dependencies: ${graph.order}`);
  console.log(`Total Links between Installed Dependencies: ${graph.size}`);
  console.log(`Unresolved Dependency Count: ${graph.getAttribute("unresolved").length}`);
  const reachabilityList = calc.getReachabilityList(graph);
  const rootKey = calc.getRootKey(graph);
  console.log(`Dependencies according to '${graph.getNodeAttribute(rootKey, "name")}':`);
  console.log(`\t- Total: ${graph.order}`);
  console.log(`\t- Reachable: ${reachabilityList.reachable.size}`);
  console.log(`\t- Unreachable: ${reachabilityList.unreachable.length}`);
  const largest = calc.getLargestDependencies(graph);
  console.log("Largest Dependencies:");
  largest.forEach((element) => {
    console.log(`\t- '${graph.getNodeAttribute(element.node, "name")}': ${utils.humanFileSize(element.size)}`);
  });
}

function printDuplicates(graph, argv) {
  const dupDeps = calc.getDuplicateDependencies(graph);
  const dupDepsThree = calc.getHighThreeDuplicateDependencies(graph);
  const topDupDep = calc.getHighestDuplicateDependencies(graph);
  const uniqueDeps = calc.getUniqueDependencies(graph);

  console.log(`Total Unique Dependencies: ${uniqueDeps.size}`);
  console.log(`The package '${topDupDep.name}' has the most duplications of '${topDupDep.count}' installations.`);
  console.log("Highest Duplicate Packages: (excess installed instances)");
  dupDepsThree.forEach((value, key, map) => {
    console.log(`\t- '${key}': ${value}`);
  });
  console.log("Highest Duplicate Packages Version Distribution:");
  dupDepsThree.forEach((value, key, map) => {
    const vers = calc.getVersionDistribution(graph, key);
    console.log(`\tPackage '${key}'; Versions:`);
    vers.forEach((element) => {
      console.log(`\t- '${element[0]}'; Installs: ${element[1]}`);
    });
  });
}

function printContribution(graph, argv) {
  const topTransDep = calc.getHighestTransitiveDependencyReachability(graph);
  const excCounts = calc.getExclusiveDependencyContribution(graph);

  console.log(`The package '${topTransDep.name}' has the most reachable transitive dependencies of '${topTransDep.count}'`);
  console.log("Dependencies with the highest exclusive dependency contribution:");
  for (let i = 0; i < 4; i++) {
    if (i < excCounts.length) {
      console.log(`\t- '${excCounts[i].name}'; Installs: ${excCounts[i].eliminated}`);
    }
  }
}

function printVersionInvestion(graph, argv) {
  const dups = calc.getHighThreeDuplicateDependencies(graph);
  const results = [];

  for (const packageName of dups.keys()) {
    const result = calc.analyzeVersionPlacement(graph, packageName);

    if (result?.isInversion && result?.grossSavings > 0) {
      results.push(result);
    }
  }

  results.sort((a, b) => b.grossSavings - a.grossSavings);

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

module.exports = {
  print: print,
};
