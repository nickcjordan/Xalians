// Hash historical species content for replay integrity only. Prototype authoring
// does not create revisions or write to the historical archive.
const crypto = require('node:crypto');

const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const revisionOf = value => crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');

module.exports = { revisionOf };
