export type ProposalService = {
	readonly name: string
	readonly durationMinutes: number
}

export type ProposalData = {
	readonly verticalId: string
	readonly verticalLabel: string
	readonly businessName: string
	readonly services: readonly ProposalService[]
	readonly hours: {
		readonly days: readonly string[]
		readonly start: string
		readonly end: string
	}
}

export type FunnelState =
	| { readonly screen: 'doorPicker' }
	| {
			readonly screen: 'doorA'
			readonly selectedVerticalId: string | null
			readonly businessName: string
			readonly websiteUrl: string
	  }
	| { readonly screen: 'doorB' }
	| { readonly screen: 'doorC'; readonly freeformText: string }
	| {
			readonly screen: 'proposalPreview'
			readonly proposal: ProposalData
			readonly sourceDoor: 'a' | 'b' | 'c'
			readonly websiteUrl: string | null
			readonly error: string | null
	  }
	| {
			readonly screen: 'submitting'
			readonly proposal: ProposalData
			readonly sourceDoor: 'a' | 'b' | 'c'
			readonly websiteUrl: string | null
	  }
	| { readonly screen: 'complete'; readonly projectId: string; readonly subdomain?: string }

export type FunnelAction =
	| { readonly type: 'selectDoor'; readonly door: 'a' | 'b' | 'c' }
	| { readonly type: 'back' }
	| {
			readonly type: 'submitDoorA'
			readonly verticalId: string
			readonly businessName: string
			readonly websiteUrl: string
	  }
	| { readonly type: 'selectExample'; readonly proposal: ProposalData }
	| { readonly type: 'submitFreeform'; readonly proposal: ProposalData }
	| { readonly type: 'confirm' }
	| { readonly type: 'success'; readonly projectId: string; readonly subdomain?: string }
	| { readonly type: 'failure'; readonly error: string }
