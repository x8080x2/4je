const fs = require('fs');
const s = fs.readFileSync('/Users/mindedjr/Documents/jobem/jobs/apply/308/AB_4976816/index.html', 'utf8');
const start = s.indexOf('__ROUTE_DATA__ = ') + 16;
const seg = s.slice(start);
let d = 0, e = -1;
for (let i = 0; i < seg.length; i++) {
  const c = seg[i];
  if (c === '{') d++;
  else if (c === '}') { d--; if (d === 0) { e = i + 1; break; } }
}
const j = JSON.parse(seg.slice(0, e));
const jas = j.searchAppConfigs.rusa_jobs_app.job_apply_settings;
const fields = JSON.parse(jas.apply_form_fields);
const rgs = fields.find(f => f.lobAcronym === 'rgs');
// Print the raw JSON of step 1 fields, focusing on name/type/id/label
const step1 = rgs.steps[0];
console.log('step1 raw fields JSON:');
console.log(JSON.stringify(step1.fields, null, 1).slice(0, 6000));
