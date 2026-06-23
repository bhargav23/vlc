const fs = require("fs");

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));

pkg.dependencies = pkg.dependencies || {};
pkg.devDependencies = pkg.devDependencies || {};

pkg.dependencies.nitro = "3.0.260603-beta";
pkg.devDependencies["@netlify/vite-plugin-tanstack-start"] = "^1.3.10";
pkg.devDependencies["@lovable.dev/vite-tanstack-config"] = "2.3.2";

// Remove broken entries if npm audit force created them in the wrong place
delete pkg.dependencies["@netlify/vite-plugin-tanstack-start"];
delete pkg.dependencies["@lovable.dev/vite-tanstack-config"];
delete pkg.devDependencies.nitro;

fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");

console.log("package.json repaired");