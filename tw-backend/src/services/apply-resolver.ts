import postcss from 'postcss';
import type { CustomClass } from '@ux-builder-tw/shared';

/**
 * Parse a CSS file and resolve all @apply directives to extract
 * custom class definitions and their underlying utilities.
 */
export async function resolveApplyDirectives(
  cssContent: string,
  sourceFile: string
): Promise<CustomClass[]> {
  const customClasses: CustomClass[] = [];

  const root = postcss.parse(cssContent, { from: sourceFile });

  root.walkRules((rule) => {
    // Only process class selectors
    const classMatch = rule.selector.match(/^\.([a-zA-Z0-9_-]+)$/);
    if (!classMatch) return;

    const className = classMatch[1];
    const applyValues: string[] = [];

    rule.walkAtRules('apply', (atRule) => {
      const utilities = atRule.params.trim().split(/\s+/);
      applyValues.push(...utilities);
    });

    if (applyValues.length > 0) {
      // Collect non-@apply declarations as additional CSS
      const otherDeclarations: string[] = [];
      rule.walkDecls((decl) => {
        otherDeclarations.push(`${decl.prop}: ${decl.value}`);
      });

      customClasses.push({
        name: className,
        css: otherDeclarations.join('; ') || `/* @apply ${applyValues.join(' ')} */`,
        applyValue: applyValues.join(' '),
        appliedUtilities: applyValues,
        sourceFile,
        source: sourceFile,
      });
    }
  });

  return customClasses;
}
