const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const assertIncludes = (source, expected, relativePath) => {
  if (!source.includes(expected)) {
    throw new Error(`${relativePath} must include ${expected}`);
  }
};
const assertExcludes = (source, forbidden, relativePath) => {
  if (source.includes(forbidden)) {
    throw new Error(`${relativePath} must not include legacy shell value ${forbidden}`);
  }
};

const app = read('src/pages/_app.tsx');
const tailwind = read('tailwind.config.js');
const globals = read('src/styles/globals.css');
const dashboard = read('src/components/dashboard/Dashboard.tsx');
const sidebar = read('src/components/dashboard/Sidebar.tsx');
const overview = read('src/components/dashboard/DashboardOverview.tsx');

assertIncludes(app, "@lanonasis/brand-kit/css", 'src/pages/_app.tsx');
assertIncludes(tailwind, "@lanonasis/brand-kit/tailwind-preset", 'tailwind.config.js');
assertIncludes(globals, 'font-family: var(--font-body)', 'src/styles/globals.css');
assertIncludes(dashboard, 'bg-ln-subtle', 'src/components/dashboard/Dashboard.tsx');
assertIncludes(sidebar, 'bg-ln-navy-deep', 'src/components/dashboard/Sidebar.tsx');
assertIncludes(sidebar, 'bg-ln-green', 'src/components/dashboard/Sidebar.tsx');
assertIncludes(overview, 'font-display', 'src/components/dashboard/DashboardOverview.tsx');
assertIncludes(overview, 'bg-[color:var(--ln-green-50)]', 'src/components/dashboard/DashboardOverview.tsx');

for (const legacy of ['Social Auto', 'blue-', 'purple-', 'bg-gray-', 'text-gray-']) {
  assertExcludes(sidebar, legacy, 'src/components/dashboard/Sidebar.tsx');
  assertExcludes(overview, legacy, 'src/components/dashboard/DashboardOverview.tsx');
}

console.log('Brand integration guard passed.');
