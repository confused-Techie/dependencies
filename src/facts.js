const calc = require("./calculate-stats.js");

function print(graph, argv) {
  if (argv.facts === "all") {
    printBasic(graph, argv);
    printConsumers(graph, argv);
  } else {
    switch(argv.facts) {
      case "basic":
        printBasic(graph, argv);
      case "consumers":
        printConsumers(graph, argv);
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
    console.log(`\t- '${key}'#${value}`);
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

module.exports = {
  print: print,
};
