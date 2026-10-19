import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), server: { middlewareMode: true, hmr: false } });
try {
  const { createGuideDocument, GUIDE_BACKGROUND_FILE } = await server.ssrLoadModule('/src/data/guideExample.ts');
  const { defaultDocument } = await server.ssrLoadModule('/src/data/defaultProject.ts');
  const { exportBreakdownDocument, importBreakdownDocument } = await server.ssrLoadModule('/src/lib/projectArchive.ts');
  const sourceBefore = JSON.stringify(defaultDocument);
  const bytes = await fs.readFile(new URL('../public/' + GUIDE_BACKGROUND_FILE, import.meta.url));
  assert.equal(bytes.readUInt32BE(16), 1080);
  assert.equal(bytes.readUInt32BE(20), 1080);
  const background = { id: 'guide-background', name: 'breakdown-background-1080.png', mimeType: 'image/png', dataUrl: 'data:image/png;base64,' + bytes.toString('base64') };
  const example = createGuideDocument(background);
  assert.equal(example.project.pieChart.slices.reduce((sum, slice) => sum + slice.value, 0), 8);
  assert.equal(example.project.title.text, 'RETROFORMATS DEMO · 8P');
  assert.equal(Object.keys(example.assets).length, 4);
  const archive = await exportBreakdownDocument(example);
  const reopened = await importBreakdownDocument(await archive.arrayBuffer());
  assert.deepEqual(reopened, example);
  example.project.pieChart.slices[0].value = 99;
  assert.equal(createGuideDocument(background).project.pieChart.slices[0].value, 4);
  assert.equal(JSON.stringify(defaultDocument), sourceBefore);
  assert.equal(reopened.assets['guide-background'].dataUrl, background.dataUrl);
  console.log('Guide checks passed: exact 1080 × 1080 background, complete self-contained example, consistent counts, archive round-trip and independent documents.');
} finally {
  await server.close();
}
