const fs = require('node:fs');
const path = require('node:path');
const data = require('./scenarios.cjs');
for (const area of ['customer', 'admin']) {
  const ids = new Set(data[area].map(s => s.id));
  if (ids.size !== data[area].length) throw new Error('Duplicate screen key in ' + area);
  for (const s of data[area]) for (const a of [...(s.actions || []), ...(s.branches || [])]) if (!ids.has(a.to)) throw new Error(s.id + ' has a missing target: ' + a.to);
}
fs.writeFileSync(path.join(__dirname, 'code.js'), 'const DATA = ' + JSON.stringify(data) + ';\n' + fs.readFileSync(path.join(__dirname, 'figma-builder.js'), 'utf8'));
fs.writeFileSync(path.join(__dirname, 'screen-inventory.json'), JSON.stringify(data, null, 2));
console.log(JSON.stringify({ customerStates: data.customer.length, adminStates: data.admin.length, adminSections: data.modules.map(m => m.name) }, null, 2));
