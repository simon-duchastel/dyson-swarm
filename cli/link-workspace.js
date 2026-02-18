#!/usr/bin/env node
// This script links the local dyson-swarm workspace package
// Needed because npm workspaces with wildcard deps don't auto-link correctly
import { symlink, rm } from 'fs/promises';
import { join } from 'path';

const nodeModules = join(process.cwd(), 'node_modules');
const target = join(nodeModules, 'dyson-swarm');
const source = join(process.cwd(), '..', 'lib');

async function link() {
  try {
    // Remove existing package (could be old version from npm)
    await rm(target, { recursive: true, force: true });
  } catch {}
  
  try {
    // Create symlink to workspace package
    await symlink(source, target, 'dir');
    console.log('Linked dyson-swarm to workspace');
  } catch (e) {
    console.error('Failed to link:', e.message);
    process.exit(1);
  }
}

link();
