// Shared opt-in browser-test login. Never seeds a fake localStorage account.
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
export async function authenticate(context, base, access='explore') {
  const email=process.env.ANTISPIRAL_TEST_EMAIL;
  const password=process.env.ANTISPIRAL_TEST_PASSWORD;
  const response=await context.request.post(`${base}/api/auth/${email&&password?'login':'register'}`,{
    data:email&&password?{email,password,access}:{name:'Browser validation',email:`e2e-browser-${randomUUID()}@example.invalid`,password:randomUUID()+'-aA9',access},
  });
  if(!response.ok())throw Error(`Test authentication failed (${response.status()}): ${await response.text()}`);
  if(!(email&&password)){
    const account=await response.json();let list=[];
    try{list=JSON.parse(await readFile('/tmp/antispiral-browser-test-accounts.json','utf8'));}catch{}
    await writeFile('/tmp/antispiral-browser-test-accounts.json',JSON.stringify([...list,{id:account.id,email:account.email}]));
  }
}
