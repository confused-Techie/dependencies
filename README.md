# Dependencies - Investigator

This project serves as a utility to investigate the dependencies of a project with a `node_modules` folder.

While in it's very early stages it focuses mostly on duplicated dependencies. Reporting various artifacts that can help consolidate them as much as possible.

Interestingly enough, already using this tool it was able to identify version inversion issues, where the root dependency in the tree wasn't the ideal one. And because NPM's lockfile retains physical installation paths, I was able to use this to reduce the size and total installed dependencies of this application easily.

Shown with the following experiment:

Base:
- Size: 21.0 MB
- Installed Dependency Count: 335

`npm install ansi-regex@5.0.1`
- Size: 20.9 MB
- Installed Dependency Count: 330

`npm install make-fetch-happen@11.1.1`
- Size: 19.1 MB
- Installed Dependency Count: 318

Then finally:
`npm uninstall ansi-regex make-fetch-happen`
And you discover because manually hoisting has hoisted the physical layout in `package-lock.json` we removed 5.1% of all install dependency instances and 9.0% of used disk space.
