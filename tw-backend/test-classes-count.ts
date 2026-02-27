/**
 * Test how many classes are generated from sample.html
 */
import { generateClassList } from './src/services/tailwind-generator';

async function main() {
  console.log('Compiling Tailwind CSS from sample.html...\n');

  const classes = await generateClassList();

  console.log(`✅ Total classes generated: ${classes.length}\n`);

  // Count by prefix
  const prefixCounts: Record<string, number> = {};
  classes.forEach((cls) => {
    const prefix = cls.name.split('-')[0];
    prefixCounts[prefix] = (prefixCounts[prefix] || 0) + 1;
  });

  console.log('Classes by prefix (top 30):');
  Object.entries(prefixCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .forEach(([prefix, count]) => {
      console.log(`  ${prefix.padEnd(20)} → ${count} classes`);
    });

  // Test specific searches
  console.log('\n=== Sample Searches ===\n');

  const searches = ['p-', 'm-', 'bg-', 'text-', 'border-', 'shadow-', 'flex', 'grid'];

  for (const query of searches) {
    const results = classes.filter((c) => c.name.startsWith(query));
    console.log(`Search "${query}" → ${results.length} classes`);
    if (results.length <= 10) {
      results.forEach((c) => console.log(`  - ${c.name}`));
    } else {
      console.log(
        `  First 5: ${results
          .slice(0, 5)
          .map((c) => c.name)
          .join(', ')}`
      );
      console.log(
        `  Last 5:  ${results
          .slice(-5)
          .map((c) => c.name)
          .join(', ')}`
      );
    }
    console.log();
  }
}

main().catch(console.error);
