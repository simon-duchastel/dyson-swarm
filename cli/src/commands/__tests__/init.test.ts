import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initAction } from '../init.js';

// Mock the dyson-swarm module using factory with vi.hoisted
const mocks = vi.hoisted(() => ({
  checkInitialization: vi.fn(),
  initialize: vi.fn(),
}));

vi.mock("dyson-swarm", () => ({
  checkInitialization: mocks.checkInitialization,
  initialize: mocks.initialize,
}));

// Mock console
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

// Mock process.exit
const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('process.exit called');
});

describe('init command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize successfully in uninitialized directory', async () => {
    mocks.checkInitialization.mockResolvedValue({
      isInitialized: false,
      missingComponents: ['.swarm directory'],
    });
    mocks.initialize.mockResolvedValue(undefined);

    await initAction();

    expect(mocks.checkInitialization).toHaveBeenCalled();
    expect(mocks.initialize).toHaveBeenCalled();
    expect(mockConsoleLog).toHaveBeenCalledWith('✓ Initialized dyson-swarm in the current directory');
    expect(mockExit).not.toHaveBeenCalled();
  });

  it('should show warning and exit when already initialized', async () => {
    mocks.checkInitialization.mockResolvedValue({
      isInitialized: true,
      missingComponents: [],
    });

    await expect(initAction()).rejects.toThrow('process.exit called');

    expect(mocks.checkInitialization).toHaveBeenCalled();
    expect(mocks.initialize).not.toHaveBeenCalled();
    expect(mockConsoleWarn).toHaveBeenCalledWith('Warning: This directory is already initialized for dyson-swarm.');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should handle initialization errors', async () => {
    mocks.checkInitialization.mockResolvedValue({
      isInitialized: false,
      missingComponents: ['.swarm directory'],
    });
    mocks.initialize.mockRejectedValue(new Error('Permission denied'));

    await expect(initAction()).rejects.toThrow('process.exit called');

    expect(mocks.checkInitialization).toHaveBeenCalled();
    expect(mockConsoleError).toHaveBeenCalledWith('Failed to initialize:', 'Permission denied');
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
