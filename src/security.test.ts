import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('frontend secret protection', () => {
  it('does not expose the football-data.org API token variable in frontend code', async () => {
    const files = await collectSourceFiles(join(process.cwd(), 'src'));
    const contents = await Promise.all(files.map((file) => readFile(file, 'utf8')));

    expect(contents.join('\n')).not.toContain('FOOTBALL_DATA_API_KEY');
    expect(contents.join('\n')).not.toContain('VITE_FOOTBALL_DATA_API_KEY');
  });
});

async function collectSourceFiles(directory: string): Promise<string[]> {
  if (directory.endsWith('/src/server')) {
    return [];
  }

  const entries = await readdir(directory);
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry);
      const metadata = await stat(path);

      if (metadata.isDirectory()) {
        return collectSourceFiles(path);
      }

      return /\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry) ? [path] : [];
    }),
  );

  return files.flat();
}
