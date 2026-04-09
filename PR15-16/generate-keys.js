const webpush = require('web-push');
const keys = webpush.generateVAPIDKeys();
console.log('Публичный ключ (скопируйте целиком):');
console.log(keys.publicKey);
console.log('\nПриватный ключ (скопируйте целиком):');
console.log(keys.privateKey);