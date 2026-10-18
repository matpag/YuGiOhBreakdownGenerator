import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const languages = ['en', 'it', 'de', 'es', 'fr'];
const dictionaries = Object.fromEntries(await Promise.all(languages.map(async language => [language,
  JSON.parse(await fs.readFile(path.join(root, 'src/i18n/locales', language + '.json'), 'utf8')),
])));
const keys = Object.keys(dictionaries.en).sort();
const placeholders = text => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
for (const language of languages) {
  assert.deepEqual(Object.keys(dictionaries[language]).sort(), keys, language + ': incomplete dictionary');
  for (const key of keys) {
    assert.equal(typeof dictionaries[language][key], 'string', language + '.' + key);
    assert.ok(dictionaries[language][key].trim(), language + '.' + key + ': empty translation');
    assert.deepEqual(placeholders(dictionaries[language][key]), placeholders(dictionaries.en[key]), language + '.' + key);
  }
}

async function loadPureModule(relative) {
  const source = await fs.readFile(path.join(root, relative), 'utf8');
  const javascript = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import('data:text/javascript;base64,' + Buffer.from(javascript).toString('base64'));
}
const { resolveUiLanguage, withUiLanguage, persistUiLanguage, isUiLanguage } = await loadPureModule('src/i18n/language.ts');
const url = 'https://retroformats.com/breakdown/?other=keep#my-document';
assert.equal(resolveUiLanguage(url, () => 'fr', ['it-IT']), 'fr');
assert.equal(resolveUiLanguage('https://example.com/?ui_lang=de', () => 'fr', ['it']), 'de');
assert.equal(resolveUiLanguage('https://example.com/?ui_lang=invalid', () => 'es', ['de-DE']), 'es');
assert.equal(resolveUiLanguage(url, () => 'invalid', ['pt-BR', 'fr-CA', 'it-IT']), 'fr');
assert.equal(resolveUiLanguage(url, () => { throw new Error('denied'); }, ['de-DE']), 'de');
assert.equal(resolveUiLanguage(url, () => null, ['pt-PT']), 'en');
assert.equal(resolveUiLanguage('https://example.com/?ui_lang=IT', () => null, ['en-US']), 'en');
for (const language of languages) {
  assert.equal(isUiLanguage(language), true);
  const switched = new URL(withUiLanguage(url, language));
  assert.equal(switched.searchParams.get('ui_lang'), language);
  assert.equal(switched.searchParams.get('other'), 'keep');
  assert.equal(switched.hash, '#my-document');
  const changed = withUiLanguage(switched.href, 'it');
  assert.equal(new URL(changed).searchParams.getAll('ui_lang').length, 1);
  assert.equal(resolveUiLanguage(changed, () => language, ['en']), 'it');
  let stored;
  persistUiLanguage(language, value => { stored = value; });
  assert.equal(stored, language);
}
assert.doesNotThrow(() => persistUiLanguage('fr', () => { throw new Error('denied'); }));
const { describeUiError } = await loadPureModule('src/i18n/errors.ts');
assert.deepEqual(describeUiError('custom.png is larger than 10 MB.', 'readImageError'), { key: 'imageSizeError', values: { name: 'custom.png', limit: '10 MB' } });
assert.deepEqual(describeUiError('DeviantArt search failed with status 503.', 'imageSearchError'), { key: 'searchHttpError', values: { status: '503' } });
assert.deepEqual(describeUiError('Invalid .dhbreakdown archive: asset file "assets/test.png" is missing.', 'openProjectError'), { key: 'archiveAssetMissing', values: { path: 'assets/test.png' } });
assert.deepEqual(describeUiError(new Error('Unknown browser-specific error'), 'saveProjectError'), { key: 'saveProjectError' });

// Rendered labels must use the provider; proper wordmark and numeric units are intentional exceptions.
for (const relative of ['src/App.tsx', 'src/components/EditorSidebar.tsx', 'src/components/ImageLibrarySidebar.tsx', 'src/components/BreakdownStage.tsx']) {
  const source = ts.createSourceFile(relative, await fs.readFile(path.join(root, relative), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function visit(node) {
    if (ts.isJsxText(node) && node.text.trim()) assert.ok(['retroformats', '.', '%'].includes(node.text.trim()), relative + ': untranslated JSX text: ' + node.text.trim());
    if (ts.isJsxAttribute(node) && ['title', 'aria-label', 'placeholder', 'label', 'alt'].includes(node.name.text) && node.initializer && ts.isStringLiteral(node.initializer)) assert.equal(node.initializer.text, '', relative + ': untranslated ' + node.name.text);
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 't' && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) assert.ok(keys.includes(node.arguments[0].text), 'Unknown translation key: ' + node.arguments[0].text);
    ts.forEachChild(node, visit);
  }
  visit(source);
}
console.log(`i18n checks passed: ${languages.length} dictionaries × ${keys.length} messages, placeholders, resolution, persistence, URLs, errors and rendered-text coverage.`);
