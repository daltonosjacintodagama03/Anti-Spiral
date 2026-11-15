import { authenticate } from './browser_session.mjs';
// Opt-in live integration check. Requires running API/Vite and a local Chrome.
const { chromium } = await import(process.env.ANTISPIRAL_PLAYWRIGHT_MODULE || 'playwright-core');
const browser = await chromium.launch({executablePath:process.env.ANTISPIRAL_CHROME || '/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
try {
 const page=await browser.newPage();
 const base=process.env.ANTISPIRAL_WEB_URL || 'http://127.0.0.1:5173';
 await authenticate(page.context(),base);
 await page.goto(`${base}/explore/sol-terra`);
 await page.getByRole('heading',{name:'Análise real de Sol e Terra',exact:true}).waitFor();
 await page.getByLabel('Duração (horas)').fill('1');
 await page.getByLabel('Passo (minutos)').fill('30');
 const responsePromise=page.waitForResponse(r=>r.url().endsWith('/api/positions'));
 await page.getByRole('button',{name:'Analisar Sol e Terra',exact:true}).click();
 const response=await responsePromise; const result=await response.json();
 console.log('API status:',response.status());
 if(response.status()!==200) throw Error(JSON.stringify(result));
 await page.getByRole('heading',{name:'Resultado — 3 instantes'}).waitFor();
 if(!await page.getByRole('cell',{name:'-3.621837',exact:true}).isVisible()) throw Error('missing real Earth elevation');
 console.log('Real sample:',JSON.stringify(result.samples[0]));
 await page.getByLabel('Longitude este (°)').fill('10');
 await page.getByRole('status').filter({hasText:'Os parâmetros foram alterados'}).waitFor();
 console.log('Result and stale-input notice: OK');
 await page.route('**/api/positions',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'Horizons indisponível. Tente novamente.'})}));
 await page.getByRole('button',{name:'Analisar Sol e Terra',exact:true}).click();
 await page.getByRole('alert').filter({hasText:'Horizons indisponível'}).waitFor();
 if(await page.getByRole('heading',{name:'Resultado — 3 instantes'}).count()) throw Error('previous result visible after failure');
 console.log('Provider failure shown without fake result: OK');
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'/tmp/antispiral-task1-mobile.png',fullPage:true});
} finally {await browser.close();}
