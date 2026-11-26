/* eslint-disable */
'use strict';

/**
 * Renders every PlantUML source under docs/diagrams/ to a sibling .png.
 * Requires a local PlantUML: either the `plantuml` CLI on PATH or a
 * PLANTUML_JAR pointing at plantuml.jar (both need a Java runtime).
 */
const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DIAGRAMS_DIR = path.join(__dirname, '..', 'docs', 'diagrams');
const SOURCE_EXTENSIONS = ['.puml', '.plantuml'];

function collectSources(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectSources(fullPath);
    return SOURCE_EXTENSIONS.includes(path.extname(entry.name)) ? [fullPath] : [];
  });
}

function resolveRenderer() {
  if (spawnSync('plantuml', ['-help'], { stdio: 'ignore' }).status === 0) {
    return (source) => execFileSync('plantuml', ['-tpng', source], { stdio: 'inherit' });
  }

  const jar = process.env.PLANTUML_JAR;
  if (jar && fs.existsSync(jar) && spawnSync('java', ['-version'], { stdio: 'ignore' }).status === 0) {
    return (source) =>
      execFileSync('java', ['-jar', jar, '-tpng', source], { stdio: 'inherit' });
  }

  return null;
}

function main() {
  const sources = collectSources(DIAGRAMS_DIR);
  if (sources.length === 0) {
    console.log('No PlantUML sources found under docs/diagrams/.');
    return;
  }

  const render = resolveRenderer();
  if (!render) {
    console.error(
      'PlantUML is not available.\n' +
        'Install the CLI (apt install plantuml / brew install plantuml) or set\n' +
        'PLANTUML_JAR=/path/to/plantuml.jar with a Java runtime on PATH, then rerun\n' +
        'npm run diagrams:generate.',
    );
    process.exitCode = 1;
    return;
  }

  for (const source of sources) {
    console.log(`Rendering ${path.relative(process.cwd(), source)}`);
    render(source);
  }
  console.log(`Rendered ${sources.length} diagram(s).`);
}

main();
