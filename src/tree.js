const getDepTree = require("get-dep-tree");
const convert = require("./convert.js");

module.exports =
async function tree(argv) {
  const depTree = await getDepTreeAsync(argv);
  const graph = convert(depTree);
  return graph;
}

async function getDepTreeAsync(argv) {
  return new Promise((resolve, reject) => {
    getDepTree(argv.mode ?? "actual")
      .then((tree) => {
        resolve(tree);
      })
      .catch((err) => {
        reject(err);
      });
  });
}
