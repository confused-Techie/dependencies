const calc = require("./calculate-stats.js");
const utils = require("./utils.js");

function print(graph, argv) {
  if (argv.facts === "all") {
    printBasic(graph, argv);
    printConsumers(graph, argv);
    printRemovalImpact(graph, argv);
  } else {
    switch(argv.facts) {
      case "basic":
        printBasic(graph, argv);
      case "consumers":
        printConsumers(graph, argv);
      case "removal-impact":
        printRemovalImpact(graph, argv);
      default:
        break;
    }
  }
}

function printBasic(graph, argv) {
  const name = argv.dependency;

  const installed = calc.getInstalledInstances(graph, name);
  const versions = calc.getVersionDistribution(graph, name);

  console.log(`Package: ${name}`);
  console.log(`\tInstalled instances: ${installed.size}`);
  console.log(`\tInstalled versions: ${versions.length}`);
  console.log("\tVersion Distribution:");
  versions.forEach((element) => {
    console.log(`\t- '${element[0]}'; Installs: ${element[1]}`);
  });
  console.log("\tInstall Locations:");
  installed.forEach((value, key, map) => {
    console.log(`\t- '${key}'`);
    console.log(`\t\t- Version: ${value}`);
    console.log(`\t\t- Size: ${utils.humanFileSize(graph.getNodeAttribute(key, "size"))}`);
  });
}

function printConsumers(graph, argv) {
  const name = argv.dependency;

  console.log(`Consumers of '${name}'`);
  const installed = calc.getInstalledInstances(graph, name);
  installed.forEach((value, key, map) => {
    const requirements = calc.getIncomingRequirements(graph, key);
    console.log(`\t${graph.getNodeAttribute(key, "name")}#${graph.getNodeAttribute(key, "version")}`);
    console.log(`\t- Location: '${key}'`);
    console.log("\t- Consumers:");
    requirements.forEach((element) => {
      console.log(`\t\t- ${element.consumer}   ${element.requirement}   ${element.type}`);
    });
  });
}

function printRemovalImpact(graph, argv) {
  const name = argv.dependency;

  const removalImpact = calc.getRemovalImpact(graph, name);

  console.log(`Simulated Removal Impact of '${name}'`);
  console.log(`\t- Affected Instances of '${name}': ${removalImpact.affectedInstances}`);
  console.log(`\t- Eliminated Instances: ${removalImpact.eliminatedInstances} (${Number((removalImpact.eliminatedInstances / graph.order) * 100).toFixed(2)}% of installed tree)`);
  console.log(`\t- Eliminated Unique Packages: ${removalImpact.eliminatedUniquePackages}`);
  console.log(`\t- Removed Relationships: ${removalImpact.removedRequirements}`);
  console.log(`\t- Removed Packages:`);
  let listedRemoved = 0;
  let listedEllipses = false;
  removalImpact.eliminatedPackages.forEach((element) => {
    if (listedRemoved < 15) {
      listedRemoved += 1;
      console.log(`\t\t- '${element}'`);
    } else {
      if (!listedEllipses) {
        listedEllipses = true;
        console.log("\t\t...");
      }
    }
  });
}

module.exports = {
  print: print,
};
