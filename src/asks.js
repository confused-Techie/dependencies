const calc = require("./calculate-stats.js");

function print(graph, argv) {
  const impact = calc.getHighestRemovalImpact(graph);

  console.log("Highest Simulated Removal Impact:");
  impact.forEach((element) => {
    const installedInstances = calc.getInstalledInstances(graph, element.name);
    let totalConsumers = 0;
    installedInstances.forEach((value, key, map) => {
      const requirements = calc.getIncomingRequirements(graph, key);
      totalConsumers += requirements.length;
    });
    console.log(`\t'${element.name}':`);
    console.log(`\t\t- Scope: ${element.direct ? "direct" : "transitive"}`);
    console.log(`\t\t- Eliminated Instances: ${element.eliminated}`);
    console.log(`\t\t- Unique Eliminated Packages: ${element.uniqueEliminated}`);
    console.log(`\t\t- Removed Relationships: ${element.removedRelationships}`);
    console.log(`\t\t- Consumers across all instances: ${totalConsumers}`);
  });
}

module.exports = {
  print: print,
};
