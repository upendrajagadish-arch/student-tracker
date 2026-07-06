export interface StorageProvider {
  save(relativePath: string, data: Buffer): Promise<void>;
  read(relativePath: string): Promise<Buffer>;
  remove(relativePath: string): Promise<void>;
  exists(relativePath: string): Promise<boolean>;
}

export function assertSafeRelativePath(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/");
  if (normalized.includes("..") || normalized.startsWith("/")) {
    throw new Error("Invalid file path");
  }
  return normalized;
}
