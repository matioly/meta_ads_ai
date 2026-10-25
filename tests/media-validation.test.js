const test = require('node:test');
const assert = require('node:assert/strict');
const { driveLink, accountInput, mediaInput } = require('../src/media-validation');

test('normaliza links de arquivo e preserva a chave de compartilhamento', () => {
  const id = 'abcDEF_1234567890';
  assert.equal(driveLink(`https://drive.google.com/file/d/${id}/view?usp=sharing&resourcekey=0-test`).url,
    `https://drive.google.com/file/d/${id}/view?resourcekey=0-test`);
  assert.equal(driveLink(`https://drive.google.com/open?id=${id}`).id, id);
});

test('rejeita pastas, protocolos, credenciais e domínios diferentes', () => {
  for (const url of ['javascript:alert(1)', 'http://drive.google.com/file/d/abcDEF_1234567890/view',
    'https://drive.google.com.evil.test/file/d/abcDEF_1234567890/view',
    'https://user:pass@drive.google.com/file/d/abcDEF_1234567890/view',
    'https://drive.google.com/drive/folders/abcDEF_1234567890',
    'https://drive.google.com/file/d/abcDEF_1234567890/view?resourcekey=%3Cscript%3E']) {
    assert.throws(() => driveLink(url));
  }
});

test('contas exigem apelido e aceitam email opcional normalizado', () => {
  assert.deepEqual(accountInput({label:'  Vídeos 01  ',email:' A@Example.com '}), {label:'Vídeos 01',email:'a@example.com'});
  assert.equal(accountInput({label:'Conta'}).email, '');
  assert.throws(() => accountInput({label:' '}));
  assert.throws(() => accountInput({label:'Conta',email:'invalido'}));
});

test('mídias validam conta, tipo e limites', () => {
  const valid = { name:'Vídeo', accountId:'11111111-1111-1111-1111-111111111111', kind:'video', url:'https://drive.google.com/file/d/abcDEF_1234567890/view' };
  assert.equal(mediaInput(valid).notes, '');
  for (const patch of [{accountId:'x'}, {kind:'script'}, {name:'x'.repeat(121)}, {notes:42}, {notes:'x'.repeat(501)}]) {
    assert.throws(() => mediaInput({...valid,...patch}));
  }
});
