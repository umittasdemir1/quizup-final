import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { jsPDF } from 'jspdf';

const window = { devWarn: (...args) => { throw new Error(args.join(' ')); } };
const context = vm.createContext({ window });
vm.runInContext(await readFile('config/pdf-fonts.js', 'utf8'), context);
const source = await readFile('components/result.jsx', 'utf8');
const start = source.indexOf('const sanitizeBase64');
const end = source.indexOf('const fetchImageAsDataUrl');
vm.runInContext(`${source.slice(start, end)}\nwindow.ensurePdfFont = ensurePdfFont;`, context);
for (let i = 0; i < 2; i++) {
  const pdf = new jsPDF();
  assert.equal(window.ensurePdfFont(pdf), true);
  assert.ok(pdf.getFontList().DejaVuSans?.includes('normal'));
  pdf.text('Doğru • Yanlış • Şirket • İkinci sınav', 10, 10);
  assert.ok(pdf.output('arraybuffer').byteLength > 1000);
}
console.log('PASS: two consecutive PDFs each register the Turkish font and generate successfully');
