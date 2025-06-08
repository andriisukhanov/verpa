import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import * as archiver from 'archiver';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

export class CompressionUtils {
  static async compressFile(
    inputPath: string,
    outputPath: string,
    algorithm: 'gzip' | 'bzip2' | 'deflate' = 'gzip',
    level: number = 6,
  ): Promise<void> {
    const input = createReadStream(inputPath);
    const output = createWriteStream(outputPath);

    let compressor: zlib.Transform;
    switch (algorithm) {
      case 'gzip':
        compressor = zlib.createGzip({ level });
        break;
      case 'bzip2':
        compressor = zlib.createBrotliCompress({
          params: {
            [zlib.constants.BROTLI_PARAM_QUALITY]: level,
          },
        });
        break;
      case 'deflate':
        compressor = zlib.createDeflate({ level });
        break;
      default:
        throw new Error(`Unsupported compression algorithm: ${algorithm}`);
    }

    await pipeline(input, compressor, output);
  }

  static async decompressFile(
    inputPath: string,
    outputPath: string,
    algorithm: 'gzip' | 'bzip2' | 'deflate' = 'gzip',
  ): Promise<void> {
    const input = createReadStream(inputPath);
    const output = createWriteStream(outputPath);

    let decompressor: zlib.Transform;
    switch (algorithm) {
      case 'gzip':
        decompressor = zlib.createGunzip();
        break;
      case 'bzip2':
        decompressor = zlib.createBrotliDecompress();
        break;
      case 'deflate':
        decompressor = zlib.createInflate();
        break;
      default:
        throw new Error(`Unsupported compression algorithm: ${algorithm}`);
    }

    await pipeline(input, decompressor, output);
  }

  static async createArchive(
    sourcePaths: string[],
    outputPath: string,
    format: 'zip' | 'tar' = 'tar',
    compressionLevel: number = 6,
  ): Promise<{ size: number; fileCount: number }> {
    return new Promise((resolve, reject) => {
      const output = createWriteStream(outputPath);
      const archive = archiver(format, {
        gzip: format === 'tar',
        gzipOptions: {
          level: compressionLevel,
        },
      });

      let fileCount = 0;

      output.on('close', () => {
        resolve({
          size: archive.pointer(),
          fileCount,
        });
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);

      // Add files to archive
      for (const sourcePath of sourcePaths) {
        if (fs.statSync(sourcePath).isDirectory()) {
          archive.directory(sourcePath, path.basename(sourcePath));
        } else {
          archive.file(sourcePath, { name: path.basename(sourcePath) });
          fileCount++;
        }
      }

      archive.finalize();
    });
  }

  static async extractArchive(
    archivePath: string,
    outputDir: string,
    format: 'zip' | 'tar' = 'tar',
  ): Promise<void> {
    // For production, use proper archive extraction libraries
    // This is a simplified example
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // In production, use libraries like:
    // - node-tar for tar files
    // - node-unzipper for zip files
    throw new Error('Archive extraction not implemented in this example');
  }

  static calculateCompressionRatio(originalSize: number, compressedSize: number): number {
    if (originalSize === 0) return 0;
    return ((originalSize - compressedSize) / originalSize) * 100;
  }

  static async estimateCompressedSize(
    filePath: string,
    algorithm: 'gzip' | 'bzip2' | 'deflate' = 'gzip',
  ): Promise<number> {
    const stats = await fs.promises.stat(filePath);
    const originalSize = stats.size;

    // Rough estimation based on typical compression ratios
    const compressionRatios = {
      gzip: 0.3, // 70% compression
      bzip2: 0.25, // 75% compression
      deflate: 0.35, // 65% compression
    };

    return Math.floor(originalSize * compressionRatios[algorithm]);
  }

  static async compressDirectory(
    sourceDir: string,
    outputFile: string,
    options: {
      algorithm?: 'gzip' | 'bzip2';
      level?: number;
      excludePatterns?: string[];
    } = {},
  ): Promise<{ size: number; fileCount: number; duration: number }> {
    const startTime = Date.now();
    const { algorithm = 'gzip', level = 6, excludePatterns = [] } = options;

    // Get all files in directory
    const files = await this.getFilesRecursive(sourceDir, excludePatterns);

    // Create tar archive
    const result = await this.createArchive(files, outputFile, 'tar', level);

    return {
      ...result,
      duration: Date.now() - startTime,
    };
  }

  private static async getFilesRecursive(
    dir: string,
    excludePatterns: string[] = [],
  ): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Check if should exclude
      const shouldExclude = excludePatterns.some((pattern) =>
        fullPath.includes(pattern),
      );

      if (shouldExclude) continue;

      if (entry.isDirectory()) {
        const subFiles = await this.getFilesRecursive(fullPath, excludePatterns);
        files.push(...subFiles);
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }
}