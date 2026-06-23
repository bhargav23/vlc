const fs = require("fs");

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));

const sections = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
];

for (const section of sections) {
  if (!pkg[section]) continue;

  for (const [name, spec] of Object.entries(pkg[section])) {
    if (typeof spec !== "string") {
      console.log(`Removing invalid ${section}.${name}:`, spec);
      delete pkg[section][name];
    }
  }
}

pkg.dependencies = pkg.dependencies || {};
pkg.devDependencies = pkg.devDependencies || {};

// Correct versions for this Netlify/TanStack setup
pkg.dependencies.nitro = "3.0.260603-beta";
pkg.devDependencies["@netlify/vite-plugin-tanstack-start"] = "^1.3.10";
pkg.devDependencies["@lovable.dev/vite-tanstack-config"] = "2.3.2";

// Clean possible wrong locations
delete pkg.dependencies["@netlify/vite-plugin-tanstack-start"];
delete pkg.dependencies["@lovable.dev/vite-tanstack-config"];
delete pkg.devDependencies.nitro;

// Remove broken literal keys if npm pkg set created them
delete pkg["dependencies.nitro"];
delete pkg["devDependencies.@netlify/vite-plugin-tanstack-start"];
delete pkg["devDependencies.@lovable.dev/vite-tanstack-config"];

fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");

console.log("package.json repaired");