import { test, expect, type Page } from '@playwright/test';
async function start(page:Page){await page.clock.install();await page.goto('/');}
async function finishFlight(page:Page){
 await page.locator('[data-speed="100"]').click();
 for(let i=0;i<45;i++){
  if(await page.locator('.result-banner').count())break;
  const skip=page.locator('#skip-cruise');if(await skip.count()&&await skip.isEnabled())await skip.click();
  await page.clock.runFor(1000);
 }
 await expect(page.locator('.result-banner.success')).toBeVisible();
}
test('design editing, undo/redo, equipment, blueprint and persistence',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await start(page);
 await expect(page).toHaveTitle(/Go To Mars/);await expect(page.locator('[data-mission="recovery"]')).toBeDisabled();
 await page.getByRole('button',{name:'进入设计车间'}).click();await page.locator('#design-name').fill('测试一号');await page.locator('#design-name').blur();
 await page.locator('#fuel').fill('6000');await page.locator('#fuel').dispatchEvent('change');await expect(page.locator('#fuel')).toHaveValue('6000');
 await page.locator('[data-action="undo"]').click();await expect(page.locator('#fuel')).toHaveValue('4800');await page.locator('[data-action="redo"]').click();await expect(page.locator('#fuel')).toHaveValue('6000');
 await page.locator('[data-equipment="solar"]').check();await page.locator('[data-action="add-stage"]').click();await expect(page.locator('.stage-tabs [data-stage]')).toHaveCount(2);await page.locator('[data-action="remove-stage"]').click();
 await page.locator('[data-action="blueprint"]').click();await page.locator('[data-tab="archive"]').click();await expect(page.locator('.blueprint-row')).toContainText('测试一号');await page.reload();await page.locator('[data-tab="archive"]').click();await expect(page.locator('.blueprint-row')).toContainText('测试一号');await expect(page.locator('.balance')).toContainText('40,000');expect(errors).toEqual([]);
});
test('simulation has no campaign reward; manual controls, pause and abort work',async({page})=>{
 await start(page);await page.locator('nav [data-tab="design"]').click();await page.locator('[data-action="simulate"]').click();await page.locator('#autopilot').uncheck();await page.locator('#throttle').fill('30');await page.locator('#throttle').dispatchEvent('input');await page.clock.runFor(500);await expect(page.locator('#throttle-readout')).toHaveText('30%');await page.locator('[data-action="pause"]').click();const before=await page.locator('#flight-clock').innerText();await page.clock.runFor(2000);await expect(page.locator('#flight-clock')).toHaveText(before);await page.locator('[data-action="pause"]').click();await page.locator('#autopilot').check();await finishFlight(page);await expect(page.locator('.balance')).toContainText('40,000');await page.locator('[data-tab="missions"]').click();await expect(page.locator('[data-mission="recovery"]')).toBeDisabled();await page.locator('nav [data-tab="design"]').click();await page.locator('[data-action="simulate"]').click();await page.locator('[data-action="abort"]').click();await expect(page.locator('.result-banner.failure')).toContainText('终止');
});
test('complete all ten missions through the real UI and unlock research',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await start(page);
 const ids=['sounding','recovery','orbit','satellite','moon-flyby','moon-land','moon-return','mars-flyby','mars-entry','mars-final'];
 for(let i=0;i<ids.length;i++){
  const id=ids[i];if(i>0)await page.locator('[data-tab="missions"]').click();
  if(i===2||i===5||i===7){await page.locator('[data-tab="research"]').click();await page.locator(`[data-research="${i===2?1:i===5?2:3}"]`).click();await page.locator('[data-tab="missions"]').click();}
  const ch=i<4?0:i<7?1:2;await page.locator(`[data-chapter="${ch}"]`).click();await page.locator(`[data-mission="${id}"]`).click();await page.locator('[data-action="prepare"]').click();await page.locator('[data-action="preset"]').click();await page.locator('[data-action="launch"]').click();await finishFlight(page);
 }
 await expect(page.locator('.completion-banner')).toContainText('你完成了深空计划');await page.locator('[data-tab="missions"]').click();await expect(page.locator('.mission-list-bottom')).toContainText('10 / 10');await page.reload();await expect(page.locator('.mission-list-bottom')).toContainText('10 / 10');expect(errors).toEqual([]);
});
test('mobile layout, handbook, sandbox and challenge are usable',async({page})=>{
 await page.setViewportSize({width:390,height:844});await start(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('[data-action="help"]').click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:/准备好/}).click();await page.locator('#game-mode').selectOption('sandbox');await page.locator('[data-chapter="2"]').click();await page.locator('[data-mission="mars-final"]').click();await page.locator('[data-action="prepare"]').click();await page.locator('[data-action="preset"]').click();await expect(page.locator('#design-name')).toHaveValue('荧惑一号');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.locator('[data-action="simulate"]').click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.locator('[data-action="abort"]').click();await page.locator('[data-tab="missions"]').click();await page.locator('#game-mode').selectOption('challenge');await expect(page.locator('.brief-objective')).toContainText('438');await page.locator('[data-action="prepare"]').click();await expect(page.locator('#payload')).toHaveValue('350');await page.locator('[data-action="launch"]').click();await expect(page.locator('.toast')).toContainText('438');
});
test('save export and telemetry download contain usable data',async({page})=>{
 await start(page);await page.locator('[data-tab="archive"]').click();const dl=page.waitForEvent('download');await page.locator('[data-action="export-save"]').click();const save=await dl;expect(save.suggestedFilename()).toBe('go-to-mars-save.json');const fs=await import('node:fs/promises');expect(JSON.parse(await fs.readFile((await save.path())!,'utf8')).version).toBe(1);await page.locator('nav [data-tab="design"]').click();await page.locator('[data-action="simulate"]').click();await finishFlight(page);const csv=page.waitForEvent('download');await page.locator('[data-action="csv"]').click();const csvFile=await csv;expect(csvFile.suggestedFilename()).toBe('flight-telemetry.csv');const rows=(await fs.readFile((await csvFile.path())!,'utf8')).trim().split('\n');expect(rows[0]).toContain('altitude_m');expect(rows.length).toBeGreaterThan(5);expect(rows.slice(1).every(r=>r.split(',').every(v=>Number.isFinite(Number(v))))).toBe(true);
});
test('refresh resumes a paid flight once and keeps settlement idempotent',async({page})=>{
 await start(page);await page.locator('nav [data-tab="design"]').click();await page.locator('[data-action="launch"]').click();await page.clock.runFor(2200);await page.locator('#pause-btn').click();const balance=await page.locator('.balance').textContent();const clock=await page.locator('#flight-clock').innerText();await page.reload();await expect(page.locator('#pause-btn')).toHaveText('继续飞行');await expect(page.locator('.balance')).toHaveText(balance);await expect(page.locator('#flight-clock')).toHaveText(clock);await page.locator('#pause-btn').click();await finishFlight(page);const finalBalance=await page.locator('.balance').textContent();await page.reload();await expect(page.locator('.balance')).toHaveText(finalBalance);await expect(page.locator('.mission-list-bottom')).toContainText('1 / 10');expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('go-to-mars-v1')!).run)).toBeUndefined();
});
test('invalid save import is rejected and existing progress is preserved',async({page})=>{
 await start(page);await page.locator('[data-tab="archive"]').click();const chooser=page.waitForEvent('filechooser');await page.locator('[data-action="import-save"]').click();await(await chooser).setFiles({name:'broken.json',mimeType:'application/json',buffer:Buffer.from('{"version":1,"funds":-100}')});await expect(page.locator('.toast')).toContainText('无法导入');await expect(page.locator('.balance')).toContainText('40,000');
});
test('saved HTML-like names are rendered as text, not executable markup',async({page})=>{
 await start(page);await page.locator('nav [data-tab="design"]').click();const name='<img src=x onerror=alert(1)>';await page.locator('#design-name').fill(name);await page.locator('#design-name').blur();await page.locator('[data-action="blueprint"]').click();await page.locator('[data-tab="archive"]').click();await expect(page.locator('.blueprint-row')).toContainText(name);await expect(page.locator('.blueprint-row img')).toHaveCount(0);
});
test('flight program edits survive blueprint saving and reopening',async({page})=>{
 await start(page);await page.locator('nav [data-tab="design"]').click();await page.locator('[data-action="program"]').click();await page.locator('#prog-maxAccel').fill('25');await page.locator('#prog-maxAccel').dispatchEvent('change');await page.locator('#prog-autoChute').uncheck();await page.getByRole('button',{name:'保存程序并返回车间'}).click();await page.locator('[data-action="blueprint"]').click();await page.reload();await page.locator('nav [data-tab="design"]').click();await page.locator('[data-action="program"]').click();await expect(page.locator('#prog-maxAccel')).toHaveValue('25');await expect(page.locator('#prog-autoChute')).not.toBeChecked();
});
test('emergency grant restores a bankrupt campaign to a playable budget',async({page})=>{
 await start(page);
 // Use the public export/import format, not a simulation or completion hook.
 await page.locator('nav [data-tab="design"]').click();await page.locator('[data-action="blueprint"]').click();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('go-to-mars-v1')!));saved.funds=0;
 await page.locator('[data-tab="archive"]').click();const chooser=page.waitForEvent('filechooser');await page.locator('[data-action="import-save"]').click();await(await chooser).setFiles({name:'bankrupt.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(saved))});await expect(page.locator('.toast')).toContainText('导入成功');await page.locator('[data-tab="missions"]').click();await page.locator('[data-action="grant"]').click();await expect(page.locator('.balance')).toContainText('8,000');await expect(page.locator('[data-action="grant"]')).toHaveCount(0);
});
test('single-file production release runs offline and completes a flight',async({page})=>{
 const {pathToFileURL}=await import('node:url');const {resolve}=await import('node:path');const errors:string[]=[],requests:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});await page.context().setOffline(true);await page.clock.install();await page.goto(pathToFileURL(resolve('releases/GoToMars-v1.0.html')).href);await expect(page).toHaveTitle(/Go To Mars/);await page.locator('nav [data-tab="design"]').click();await page.locator('[data-action="launch"]').click();await finishFlight(page);await page.locator('[data-tab="missions"]').click();await expect(page.locator('.mission-list-bottom')).toContainText('1 / 10');expect(errors).toEqual([]);expect(requests).toEqual([]);
});
