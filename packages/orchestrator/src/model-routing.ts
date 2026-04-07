import { MODELS, type ModelId } from '@meldar/tokens'
import type { ComponentTypeId } from './component-vocabulary'

const HAIKU_COMPONENTS: readonly ComponentTypeId[] = [
	'chart',
	'table',
	'form',
	'filter',
	'export',
	'data-input',
	'page',
	'search',
	'notification',
	'file-upload',
	'import',
]

const HAIKU_TASK_TYPES: readonly string[] = ['feature', 'page', 'data', 'fix', 'polish']

export function routeModel(componentOrTaskType: string | undefined): ModelId {
	if (!componentOrTaskType) return MODELS.SONNET

	if (HAIKU_COMPONENTS.includes(componentOrTaskType as ComponentTypeId)) {
		return MODELS.HAIKU
	}

	if (HAIKU_TASK_TYPES.includes(componentOrTaskType)) {
		return MODELS.HAIKU
	}

	return MODELS.SONNET
}
