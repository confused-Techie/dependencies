The format of the dep tree seems to be:

```
ArboristNode {
  name: "Where it got the dependencies from",
  version: "Version of the parent package",
  location: "Where it is on disk?",
  path: "Path of the project",
  isProjectRoot: true,
  edgesOut: Map {
    'dep-name'
  },
  children: Map {
    'dep-name': ArboristNode {
      name: 'dep-name',
      version: "dep-version',
      location: 'location from path',
      resolved: 'what URL was used to download',
      edgesIn: Set,
      edgesOut: Map {
        ArboristEdge {
          name: 'pack-name',
          spec: 'version requested',
          type: 'prod??',
          from: 'who wants it',
          to: 'where am I'
        }
      }
    }
  }
}
```

* ArboristNode: https://github.com/npm/cli/blob/latest/workspaces/arborist/lib/node.js
* ArboristEdge: https://github.com/npm/cli/blob/latest/workspaces/arborist/lib/edge.js
