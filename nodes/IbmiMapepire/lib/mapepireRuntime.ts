import { createRequire } from 'node:module';
import type { MapepirePoolConstructor } from './mapepireTypes';

interface BundledMapepireRuntime {
	Pool: MapepirePoolConstructor;
}

// The release build copies the official @ibm/mapepire-js 0.6.1 CommonJS bundle
// into this relative path. createRequire keeps the runtime load relative to this
// compiled file without a source-level third-party package import.
const loadBundledModule = createRequire(__filename);
const runtime = loadBundledModule('./vendor/mapepire-js.cjs') as BundledMapepireRuntime;

export const Pool = runtime.Pool;
export type { MapepirePool } from './mapepireTypes';
