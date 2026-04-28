import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { transform } from 'esbuild';

// These files are copied as-is (no esbuild transform needed)
const copyOnlyFiles = [
  'config/pdf-fonts.js',
];

// These files go through esbuild JSX transform
const files = [
  'utils/helpers.js',
  'utils/hooks.js',
  'utils/location.js',
  'utils/icons.jsx',
  'components/ErrorBoundary.jsx',
  'components/DemoBadge.jsx',
  'components/sidebar.jsx',
  'components/ScrollToTop.jsx',
  'components/landing.jsx',
  'components/login.jsx',
  'components/usermanagement.jsx',
  'components/suggestquestion.jsx',
  'components/suggestedquestions.jsx',
  'components/mytests.jsx',
  'components/questions.jsx',
  'components/manager.jsx',
  'components/quiz.jsx',
  'components/dashboard.jsx',
  'components/tests.jsx',
  'components/result.jsx',
  'components/branding.jsx',
  'components/locationmap.jsx',
  'components/CompanyManagement.jsx',
  'components/questionlist.jsx',
  'components/adminform.jsx',
  'components/admin.jsx'
];

const outRoot = 'public/legacy';

await rm(outRoot, { recursive: true, force: true });

// Copy-only files (skip esbuild)
for (const file of copyOnlyFiles) {
  const outputPath = join(outRoot, file.replace(/\.(jsx|js)$/, '.js'));
  await mkdir(dirname(outputPath), { recursive: true });
  await copyFile(file, outputPath);
}

// esbuild transform files
for (const file of files) {
  const source = await readFile(file, 'utf8');
  const result = await transform(source, {
    loader: file.endsWith('.jsx') ? 'jsx' : 'jsx',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    target: 'es2019',
    format: 'iife',
    sourcemap: false,
    sourcefile: file
  });

  const outputPath = join(outRoot, file.replace(/\.(jsx|js)$/, '.js'));
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, result.code);
}
