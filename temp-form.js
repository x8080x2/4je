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
console.log('steps:', rgs.steps.length);
rgs.steps.forEach((step, i) => {
  console.log('--- step', i + 1, '| name:', step.stepName, '| required:', step.required, '---');
  (step.fields || []).forEach(f => {
    console.log('  field:', f.name, '| type:', f.type, '| required:', f.required, '| validation:', f.validation ? JSON.stringify(f.validation) : '-', '| placeholder:', f.placeholder || '-');
  });
});
