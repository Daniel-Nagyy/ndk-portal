import selfsigned from 'selfsigned';
import { writeFileSync } from 'fs';

selfsigned.generate(
  [{ name: 'commonName', value: 'localhost' }],
  {
    days: 365,
    keySize: 2048,
    extensions: [{
      name: 'subjectAltName',
      altNames: [
        { type: 2, value: 'localhost' },
        { type: 7, ip: '127.0.0.1' }
      ]
    }]
  },
  (err, pems) => {
    if (err) throw err;
    writeFileSync('key.pem', pems.private);
    writeFileSync('cert.pem', pems.cert);
    console.log('Certificate regenerated.');
  }
);