const fs = require('fs');
const js = ['assets', 'logic', 'gl', 'ui'].map(f => fs.readFileSync(`src/${f}.js`, 'utf8')).join('\n').replace("if (typeof module !== 'undefined') module.exports", "if (typeof module !== 'undefined' && 0) module.exports");
const page = fs.readFileSync('src/page.html', 'utf8').replace('/*__JS__*/', () => js);
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/cini-sancaklari.html', page);
const i = page.indexOf('<div id="game">');
fs.writeFileSync('dist/index.html', `<!doctype html>\n<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">\n${page.slice(0, i)}</head><body>\n${page.slice(i)}</body></html>\n`);
console.log('build', (page.length / 1024).toFixed(0) + ' KB');
fs.writeFileSync('dist/CREDITS.txt', 'Çini Sancakları\n\nKarakter, duvar, kapı, sütun, sancak, fıçı, kaya ve diğer dekor modelleri:\nMini Dungeon 1.4, Kenney (www.kenney.nl)\nLisans: Creative Commons Zero (CC0 1.0), http://creativecommons.org/publicdomain/zero/1.0/\n\nÇini tahta, ekipman, at, ejder, mancınık ve büyü modelleri oyun için kodla üretildi.\n');
