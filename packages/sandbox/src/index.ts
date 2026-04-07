/**
 * Public barrel for the sandbox adapter layer.
 *
 * Import only from this file; the internal module structure is not part of
 * the public API and may change.
 *
 * Example:
 *
 * ```ts
 * import type { SandboxProvider, SandboxFile, SandboxHandle } from '@/server/sandbox'
 * import { SandboxStartFailedError, assertSafeSandboxPath } from '@/server/sandbox'
 * ```
 */

export {
	CloudflareSandboxProvider,
	type CloudflareSandboxProviderConfig,
} from './cloudflare-provider'
export {
	SandboxError,
	SandboxNotFoundError,
	SandboxNotReadyError,
	SandboxStartFailedError,
	SandboxUnsafePathError,
	SandboxWriteFailedError,
} from './errors'
export type { SandboxProvider } from './provider'
export { assertSafeSandboxPath, isSafeSandboxPath } from './safety'
export type {
	SandboxFile,
	SandboxHandle,
	SandboxStatus,
	StartSandboxOptions,
	WriteFilesOptions,
} from './types'
