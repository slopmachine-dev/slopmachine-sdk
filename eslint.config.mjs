import path from 'node:path';
import tseslint from 'typescript-eslint';
import sveltePlugin from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';

function findTopLevelVarCalls(text) {
  const results = [];
  let idx = 0;
  while (idx < text.length) {
    const match = text.slice(idx).search(/\bvar\s*\(/);
    if (match === -1) break;
    const start = idx + match;
    const openParen = text.indexOf('(', start);
    let depth = 1;
    let i = openParen + 1;
    let hasTopLevelComma = false;
    while (i < text.length && depth > 0) {
      const ch = text[i];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      else if (ch === ',' && depth === 1) hasTopLevelComma = true;
      i++;
    }
    if (depth === 0) {
      const inner = text.slice(openParen + 1, i - 1).trim();
      results.push({ inner, hasTopLevelComma });
    }
    idx = i;
  }
  return results;
}

function validateCssVars(text, node, context) {
  if (!text.includes('var(')) return;
  for (const { inner, hasTopLevelComma } of findTopLevelVarCalls(text)) {
    const commaIdx = inner.indexOf(',');
    const varName = (commaIdx === -1 ? inner : inner.slice(0, commaIdx)).trim();
    if (!varName.startsWith('--')) continue;
    if (!varName.startsWith('--slop-')) {
      context.report({
        node,
        message: `CSS custom property '${varName}' must be namespaced with '--slop-' and provide a fallback.`,
      });
    } else if (!hasTopLevelComma || inner.slice(commaIdx + 1).trim().length === 0) {
      context.report({
        node,
        message: `CSS variable 'var(${varName})' must include a fallback value after a comma.`,
      });
    }
  }
}

const hasJsDoc = (comments) => comments.some((c) => c.type === 'Block' && c.value.startsWith('*'));

const reactDocsRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require JSDoc + @example on exported Slop* components and JSDoc on exported *Props fields',
    },
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode;
    return {
      ExportNamedDeclaration(node) {
        const decl = node.declaration;
        if (!decl) return;

        if (decl.type === 'TSInterfaceDeclaration' && /Props$/.test(decl.id?.name ?? '')) {
          for (const member of decl.body?.body ?? []) {
            if (member.type !== 'TSPropertySignature') continue;
            const comments = sourceCode.getCommentsBefore(member);
            if (!hasJsDoc(comments)) {
              context.report({
                node: member,
                message: `Property '${member.key?.name ?? 'prop'}' on '${decl.id.name}' must have a JSDoc comment.`,
              });
            }
          }
          return;
        }

        let componentName = null;
        if (decl.type === 'FunctionDeclaration' && /^Slop[A-Z]/.test(decl.id?.name ?? '')) {
          componentName = decl.id.name;
        } else if (decl.type === 'VariableDeclaration') {
          for (const d of decl.declarations ?? []) {
            if (d.id?.type === 'Identifier' && /^Slop[A-Z]/.test(d.id.name)) {
              componentName = d.id.name;
              break;
            }
          }
        }
        if (componentName) {
          const comments = sourceCode.getCommentsBefore(node);
          const jsdoc = comments.find((c) => c.type === 'Block' && c.value.startsWith('*'));
          if (!jsdoc) {
            context.report({
              node,
              message: `Exported component '${componentName}' must have a JSDoc comment with an @example tag.`,
            });
          } else if (!jsdoc.value.includes('@example')) {
            context.report({
              node,
              message: `JSDoc for exported component '${componentName}' must include an @example block.`,
            });
          }
        }
      },
    };
  },
};

const svelteComponentCommentRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require leading <!-- @component --> comment (and @example/@version on Slop*.svelte)',
    },
    schema: [],
  },
  create(context) {
    return {
      Program(node) {
        const text = context.sourceCode.text;
        const match = text.match(/^\s*<!--([\s\S]*?)-->/);
        if (!match) {
          context.report({
            node,
            message: 'Svelte component must begin with a leading <!-- @component ... --> comment.',
          });
          return;
        }
        const comment = match[1];
        if (!comment.includes('@component')) {
          context.report({
            node,
            message: 'Leading HTML comment must include @component.',
          });
        }
        const base = path.basename(context.filename);
        if (/^Slop.*\.svelte$/.test(base)) {
          if (!comment.includes('@example')) {
            context.report({
              node,
              message: `${base} leading @component comment must include @example.`,
            });
          }
          if (!comment.includes('@version')) {
            context.report({
              node,
              message: `${base} leading @component comment must include @version.`,
            });
          }
        }
      },
    };
  },
};

const slopCssVarsRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require var(--...) CSS custom properties to start with --slop- and include a fallback',
    },
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode;
    return {
      Literal(node) {
        if (typeof node.value === 'string') {
          validateCssVars(node.value, node, context);
        }
      },
      TemplateElement(node) {
        if (typeof node.value?.raw === 'string') {
          validateCssVars(node.value.raw, node, context);
        }
      },
      SvelteStyleElement(node) {
        validateCssVars(sourceCode.getText(node), node, context);
      },
    };
  },
};

const localPlugin = {
  rules: {
    'react-docs': reactDocsRule,
    'svelte-component-comment': svelteComponentCommentRule,
    'slop-css-vars': slopCssVarsRule,
  },
};

const CORE_IMPORT_RESTRICTION = [
  'error',
  {
    patterns: [
      {
        group: ['**/core/**', '../core*', '../../core*'],
        message: 'Import from "@slopmachine/core" package name instead of relative/deep core paths.',
      },
    ],
  },
];

const SVELTE_RUNE_SELECTORS = [
  {
    selector: 'ExportNamedDeclaration > VariableDeclaration[kind="let"]',
    message: 'Use Svelte 5 $props() rune instead of legacy `export let`.',
  },
  {
    selector: 'SvelteReactiveStatement',
    message: 'Use Svelte 5 $derived() / $effect() runes instead of legacy `$:` reactive statements.',
  },
  {
    selector: 'LabeledStatement[label.name="$"]',
    message: 'Use Svelte 5 $derived() / $effect() runes instead of legacy `$:` reactive statements.',
  },
  {
    selector: 'SvelteDirective[kind="EventHandler"]',
    message: 'Use Svelte 5 standard event props (e.g. `onclick`) instead of legacy `on:*` directives.',
  },
  {
    selector: 'SvelteElement[name.name="slot"]',
    message: 'Use Svelte 5 `{@render ...}` snippets instead of legacy `<slot />`.',
  },
];

export default [
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.svelte-kit/**'],
  },
  {
    files: ['packages/{core,react,svelte}/src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportDefaultDeclaration',
          message: 'Use named exports instead of default exports.',
        },
      ],
    },
  },
  {
    files: ['packages/{react,svelte}/src/**/*.{ts,tsx}'],
    plugins: { local: localPlugin },
    rules: {
      'no-restricted-imports': CORE_IMPORT_RESTRICTION,
      'local/slop-css-vars': 'error',
    },
  },
  {
    files: ['packages/react/src/**/*.tsx'],
    plugins: { local: localPlugin },
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportDefaultDeclaration',
          message: 'Use named exports instead of default exports.',
        },
        {
          selector: 'ClassDeclaration[superClass]',
          message: 'Use functional React components instead of class components.',
        },
        {
          selector: 'TSTypeAliasDeclaration[id.name=/Props$/]',
          message: 'Define component Props as an `export interface *Props` instead of a `type` alias.',
        },
      ],
      'local/react-docs': 'error',
    },
  },
  {
    files: ['packages/svelte/src/**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      svelte: sveltePlugin,
      local: localPlugin,
    },
    rules: {
      'no-restricted-imports': CORE_IMPORT_RESTRICTION,
      'svelte/block-lang': ['error', { script: ['ts'] }],
      'no-restricted-syntax': ['error', ...SVELTE_RUNE_SELECTORS],
      'local/svelte-component-comment': 'error',
      'local/slop-css-vars': 'error',
    },
  },
];
