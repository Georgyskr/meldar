/**
 * Runs the ProjectStorage contract against the in-memory implementation.
 *
 * When the Postgres implementation lands, a parallel test file will run the
 * SAME contract against a real Neon dev branch.
 */

import { InMemoryBlobStorage } from '../in-memory-blob'
import { InMemoryProjectStorage } from '../in-memory-provider'
import { runProjectStorageContract } from './provider-contract'

runProjectStorageContract('InMemory', () => {
	const blob = new InMemoryBlobStorage()
	const storage = new InMemoryProjectStorage(blob)
	return {
		storage,
		blob,
		softDeleteProject: async (projectId: string) => {
			storage._softDeleteProject(projectId)
		},
	}
})
