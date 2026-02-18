import { describe, it, expect, beforeEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { checkInitialization, isInitialized, initialize, initializeForce } from '../init.js';
import { TaskFileUtils } from '../tasks/file-utils.js';

describe('init', () => {
  let testDir: string;
  let cwdProvider: () => string;

  beforeEach(async () => {
    // Create a temp directory for each test
    testDir = join(tmpdir(), `dyson-swarm-test-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    await fs.mkdir(testDir, { recursive: true });
    cwdProvider = () => testDir;

    // Cleanup after each test
    return async () => {
      try {
        await fs.rm(testDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    };
  });

  describe('checkInitialization', () => {
    it('should return not initialized when .swarm directory does not exist', async () => {
      const result = await checkInitialization(cwdProvider);
      
      expect(result.isInitialized).toBe(false);
      expect(result.missingComponents).toContain('.swarm directory');
    });

    it('should return not initialized when version file is missing', async () => {
      const dysonDir = join(testDir, '.swarm');
      await fs.mkdir(dysonDir, { recursive: true });

      const result = await checkInitialization(cwdProvider);
      
      expect(result.isInitialized).toBe(false);
      expect(result.missingComponents).toContain('version file');
    });

    it('should return not initialized when tasks directory is missing', async () => {
      const dysonDir = join(testDir, '.swarm');
      await fs.mkdir(dysonDir, { recursive: true });
      await fs.writeFile(join(dysonDir, 'version'), '2', 'utf-8');

      const result = await checkInitialization(cwdProvider);
      
      expect(result.isInitialized).toBe(false);
      expect(result.missingComponents).toContain('tasks directory');
    });

    it('should return not initialized when statuses directory is missing', async () => {
      const dysonDir = join(testDir, '.swarm');
      await fs.mkdir(dysonDir, { recursive: true });
      await fs.writeFile(join(dysonDir, 'version'), '2', 'utf-8');
      await fs.mkdir(join(dysonDir, 'tasks'), { recursive: true });

      const result = await checkInitialization(cwdProvider);
      
      expect(result.isInitialized).toBe(false);
      expect(result.missingComponents).toContain('statuses directory');
    });

    it('should return not initialized when status files are missing', async () => {
      const dysonDir = join(testDir, '.swarm');
      await fs.mkdir(dysonDir, { recursive: true });
      await fs.writeFile(join(dysonDir, 'version'), '2', 'utf-8');
      await fs.mkdir(join(dysonDir, 'tasks'), { recursive: true });
      await fs.mkdir(join(dysonDir, 'statuses'), { recursive: true });

      const result = await checkInitialization(cwdProvider);
      
      expect(result.isInitialized).toBe(false);
      expect(result.missingComponents).toContain('status file: draft');
      expect(result.missingComponents).toContain('status file: open');
      expect(result.missingComponents).toContain('status file: in-progress');
      expect(result.missingComponents).toContain('status file: closed');
    });

    it('should return not initialized when lockfile is missing', async () => {
      const dysonDir = join(testDir, '.swarm');
      await fs.mkdir(dysonDir, { recursive: true });
      await fs.writeFile(join(dysonDir, 'version'), '2', 'utf-8');
      await fs.mkdir(join(dysonDir, 'tasks'), { recursive: true });
      const statusesDir = join(dysonDir, 'statuses');
      await fs.mkdir(statusesDir, { recursive: true });
      await fs.writeFile(join(statusesDir, 'draft'), '', 'utf-8');
      await fs.writeFile(join(statusesDir, 'open'), '', 'utf-8');
      await fs.writeFile(join(statusesDir, 'in-progress'), '', 'utf-8');
      await fs.writeFile(join(statusesDir, 'closed'), '', 'utf-8');

      const result = await checkInitialization(cwdProvider);
      
      expect(result.isInitialized).toBe(false);
      expect(result.missingComponents).toContain('lockfile');
    });

    it('should return initialized when all components exist', async () => {
      const dysonDir = join(testDir, '.swarm');
      await fs.mkdir(dysonDir, { recursive: true });
      await fs.writeFile(join(dysonDir, 'version'), '2', 'utf-8');
      await fs.mkdir(join(dysonDir, 'tasks'), { recursive: true });
      const statusesDir = join(dysonDir, 'statuses');
      await fs.mkdir(statusesDir, { recursive: true });
      await fs.writeFile(join(statusesDir, 'draft'), '', 'utf-8');
      await fs.writeFile(join(statusesDir, 'open'), '', 'utf-8');
      await fs.writeFile(join(statusesDir, 'in-progress'), '', 'utf-8');
      await fs.writeFile(join(statusesDir, 'closed'), '', 'utf-8');
      await fs.writeFile(join(dysonDir, 'lockfile'), '', 'utf-8');

      const result = await checkInitialization(cwdProvider);
      
      expect(result.isInitialized).toBe(true);
      expect(result.missingComponents).toHaveLength(0);
    });

    it('should return not initialized when version file is invalid', async () => {
      const dysonDir = join(testDir, '.swarm');
      await fs.mkdir(dysonDir, { recursive: true });
      await fs.writeFile(join(dysonDir, 'version'), 'invalid', 'utf-8');
      await fs.mkdir(join(dysonDir, 'tasks'), { recursive: true });
      const statusesDir = join(dysonDir, 'statuses');
      await fs.mkdir(statusesDir, { recursive: true });
      await fs.writeFile(join(statusesDir, 'draft'), '', 'utf-8');
      await fs.writeFile(join(statusesDir, 'open'), '', 'utf-8');
      await fs.writeFile(join(statusesDir, 'in-progress'), '', 'utf-8');
      await fs.writeFile(join(statusesDir, 'closed'), '', 'utf-8');
      await fs.writeFile(join(dysonDir, 'lockfile'), '', 'utf-8');

      const result = await checkInitialization(cwdProvider);
      
      expect(result.isInitialized).toBe(false);
      expect(result.missingComponents).toContain('valid version file');
    });
  });

  describe('isInitialized', () => {
    it('should return false for uninitialized directory', async () => {
      const result = await isInitialized(cwdProvider);
      expect(result).toBe(false);
    });

    it('should return true for initialized directory', async () => {
      const dysonDir = join(testDir, '.swarm');
      await fs.mkdir(dysonDir, { recursive: true });
      await fs.writeFile(join(dysonDir, 'version'), '2', 'utf-8');
      await fs.mkdir(join(dysonDir, 'tasks'), { recursive: true });
      const statusesDir = join(dysonDir, 'statuses');
      await fs.mkdir(statusesDir, { recursive: true });
      await fs.writeFile(join(statusesDir, 'draft'), '', 'utf-8');
      await fs.writeFile(join(statusesDir, 'open'), '', 'utf-8');
      await fs.writeFile(join(statusesDir, 'in-progress'), '', 'utf-8');
      await fs.writeFile(join(statusesDir, 'closed'), '', 'utf-8');
      await fs.writeFile(join(dysonDir, 'lockfile'), '', 'utf-8');

      const result = await isInitialized(cwdProvider);
      expect(result).toBe(true);
    });
  });

  describe('initialize', () => {
    it('should create all required files and directories', async () => {
      await initialize(cwdProvider);

      const dysonDir = join(testDir, '.swarm');
      
      // Check .swarm directory exists
      expect(await TaskFileUtils.dirExists(dysonDir)).toBe(true);
      
      // Check version file
      expect(await TaskFileUtils.fileExists(join(dysonDir, 'version'))).toBe(true);
      const versionContent = await fs.readFile(join(dysonDir, 'version'), 'utf-8');
      expect(versionContent).toBe('2');
      
      // Check tasks directory
      expect(await TaskFileUtils.dirExists(join(dysonDir, 'tasks'))).toBe(true);
      
      // Check statuses directory and files
      const statusesDir = join(dysonDir, 'statuses');
      expect(await TaskFileUtils.dirExists(statusesDir)).toBe(true);
      expect(await TaskFileUtils.fileExists(join(statusesDir, 'draft'))).toBe(true);
      expect(await TaskFileUtils.fileExists(join(statusesDir, 'open'))).toBe(true);
      expect(await TaskFileUtils.fileExists(join(statusesDir, 'in-progress'))).toBe(true);
      expect(await TaskFileUtils.fileExists(join(statusesDir, 'closed'))).toBe(true);
      
      // Check lockfile
      expect(await TaskFileUtils.fileExists(join(dysonDir, 'lockfile'))).toBe(true);
    });

    it('should throw error when already initialized', async () => {
      // Initialize first
      await initialize(cwdProvider);

      // Try to initialize again
      await expect(initialize(cwdProvider)).rejects.toThrow('already initialized');
    });
  });

  describe('initializeForce', () => {
    it('should reinitialize even when already initialized', async () => {
      // Initialize first
      await initialize(cwdProvider);

      // Add a file to verify it gets removed
      const testFile = join(testDir, '.swarm', 'test-file.txt');
      await fs.writeFile(testFile, 'test content', 'utf-8');
      expect(await TaskFileUtils.fileExists(testFile)).toBe(true);

      // Force reinitialize
      await initializeForce(cwdProvider);

      // Verify it's fresh
      expect(await TaskFileUtils.fileExists(testFile)).toBe(false);
      
      // Verify structure is correct
      const dysonDir = join(testDir, '.swarm');
      expect(await TaskFileUtils.dirExists(dysonDir)).toBe(true);
      expect(await TaskFileUtils.fileExists(join(dysonDir, 'version'))).toBe(true);
    });

    it('should initialize fresh directory', async () => {
      await initializeForce(cwdProvider);

      const dysonDir = join(testDir, '.swarm');
      expect(await TaskFileUtils.dirExists(dysonDir)).toBe(true);
      expect(await TaskFileUtils.fileExists(join(dysonDir, 'version'))).toBe(true);
    });
  });
});
