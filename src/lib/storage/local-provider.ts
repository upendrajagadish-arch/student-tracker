import fs from "fs/promises";
import path from "path";
import type { StorageProvider } from "./types";
import { assertSafeRelativePath } from "./types";

export class LocalStorageProvider implements StorageProvider {
  private readonly uploadRoot: string;

  constructor(uploadDir: string, subfolder = "resumes") {
    this.uploadRoot = path.join(process.cwd(), uploadDir, subfolder);
  }

  private resolve(relativePath: string): string {
    return path.join(this.uploadRoot, assertSafeRelativePath(relativePath));
  }

  async save(relativePath: string, data: Buffer): Promise<void> {
    const fullPath = this.resolve(relativePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, data);
  }

  async read(relativePath: string): Promise<Buffer> {
    return fs.readFile(this.resolve(relativePath));
  }

  async remove(relativePath: string): Promise<void> {
    try {
      await fs.unlink(this.resolve(relativePath));
    } catch {
      // file may already be removed
    }
  }

  async exists(relativePath: string): Promise<boolean> {
    try {
      await fs.access(this.resolve(relativePath));
      return true;
    } catch {
      return false;
    }
  }
}
