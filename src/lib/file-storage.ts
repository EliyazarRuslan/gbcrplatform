import fs from 'fs/promises';
import path from 'path';

const STORAGE_ROOT = process.env.FILE_STORAGE_ROOT || './storage';

function resolvePath(subPath: string): string {
  const resolved = path.resolve(STORAGE_ROOT, subPath);
  if (!resolved.startsWith(path.resolve(STORAGE_ROOT))) {
    throw new Error('Invalid file path');
  }
  return resolved;
}

export async function saveFile(subPath: string, buffer: Buffer): Promise<string> {
  const filePath = resolvePath(subPath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer);
  return subPath;
}

export async function readFile(subPath: string): Promise<Buffer> {
  const filePath = resolvePath(subPath);
  return fs.readFile(filePath);
}

export async function deleteFile(subPath: string): Promise<void> {
  const filePath = resolvePath(subPath);
  await fs.unlink(filePath).catch(() => {});
}

export async function fileExists(subPath: string): Promise<boolean> {
  try {
    const filePath = resolvePath(subPath);
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
