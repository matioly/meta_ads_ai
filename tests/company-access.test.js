const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { uuid } = require('../src/media-validation');

function harness(role) {
  let queries = 0;
  const context = { module: { exports: {} }, require: name => name === './db'
    ? { query: async () => { queries++; return { rows: role ? [{role}] : [] }; } }
    : {uuid} };
  vm.runInNewContext(fs.readFileSync(require.resolve('../src/company-access'),'utf8'),context);
  return { access: context.module.exports, queries: () => queries };
}
const companyId = '11111111-1111-1111-1111-111111111111';
async function check(role,method,status,session={userId:'test'},params={companyId}) {
  const h=harness(role); let next=false; let actual;
  const res={status(n){actual=n;return this},json(){}};
  await h.access({method,session,params},res,()=>{next=true});
  assert.equal(actual,status);
  assert.equal(next,status===undefined);
  return h;
}
test('sem sessão ou UUID inválido não consulta vínculos',async()=>{
  assert.equal((await check('owner','GET',401,{})).queries(),0);
  assert.equal((await check('owner','GET',400,undefined,{companyId:'bad'})).queries(),0);
});
test('papéis e vínculos são verificados no servidor',async()=>{
  await check(null,'GET',403);
  await check('member','GET',undefined);
  for(const method of ['POST','PUT','DELETE']) {
    await check('member',method,403);
    await check('owner',method,undefined);
    await check('admin',method,undefined);
  }
});
