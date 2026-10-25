import { writeFileSync, mkdirSync } from 'node:fs';
import { REAL_ENGINES } from '../src/orbital/engine-catalog';
mkdirSync('public/data',{recursive:true});
writeFileSync('public/data/engine-catalog.json',JSON.stringify({checkedAt:'2026-10-25',notice:'公开数据与仿真假设分列，非完整工程数据或采购价格。',engines:REAL_ENGINES},null,2));
console.log(`Exported ${REAL_ENGINES.length} source-annotated engine variants.`);
