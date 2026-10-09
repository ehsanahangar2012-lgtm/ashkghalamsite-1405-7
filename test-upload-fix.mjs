import fs from 'fs';
const form = new FormData();
form.append('image', new Blob(['test']), 'test.txt');
fetch('http://localhost:3000/api/upload', {
  method: 'POST',
  body: form
}).then(r => {
  console.log('Status:', r.status);
  console.log('Content-Type:', r.headers.get('content-type'));
  return r.text();
}).then(console.log).catch(console.error);
