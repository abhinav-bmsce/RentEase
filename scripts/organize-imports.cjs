const ts = require('typescript');
const fs = require('fs');
const path = require('path');
const config = ts.readConfigFile('tsconfig.json', ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, process.cwd());
const files = parsed.fileNames;
const service = ts.createLanguageService({
  getScriptFileNames: () => files,
  getScriptVersion: () => '0',
  getScriptSnapshot: file => fs.existsSync(file) ? ts.ScriptSnapshot.fromString(fs.readFileSync(file, 'utf8')) : undefined,
  getCurrentDirectory: () => process.cwd(), getCompilationSettings: () => parsed.options,
  getDefaultLibFileName: options => ts.getDefaultLibFilePath(options),
  fileExists: ts.sys.fileExists, readFile: ts.sys.readFile, readDirectory: ts.sys.readDirectory,
});
for (const file of files) {
  const changes = service.organizeImports({type:'file',fileName:file},{},{});
  for (const change of changes) {
    let source=fs.readFileSync(change.fileName,'utf8');
    for (const edit of [...change.textChanges].sort((a,b)=>b.span.start-a.span.start)) source=source.slice(0,edit.span.start)+edit.newText+source.slice(edit.span.start+edit.span.length);
    fs.writeFileSync(change.fileName,source);
  }
}
