/**
 * Global `fetch` test mock factory. `globalThis.fetch` has an overloaded
 * signature that's painful to stub inline, so this helper confines the
 * `as unknown as typeof globalThis.fetch` cast to one place. The handler
 * parameter is loosened to `unknown` because `vi.fn(...)` can't satisfy the
 * overloaded input union; arity is still type-checked at the call site.
 */

export type FetchMockHandler = (input: unknown, init?: unknown) => Promise<Response>

export function makeFetchMock(handler: FetchMockHandler): typeof globalThis.fetch {
	return handler as unknown as typeof globalThis.fetch
}
