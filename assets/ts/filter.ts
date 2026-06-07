export interface FilterState {
	category: string
	searchTerm: string
	showOpenSource: boolean
	showProprietary: boolean
	showDiscontinuedOnly: boolean
	showFreeTrialOnly: boolean
	showFreemiumOnly: boolean
	showFreeOnly: boolean
	selectedPlatforms: string[]
	selectedCompliance: string[]
	selectedAuthentication: string[]
	signupIsOpenOnly: boolean
}

export class FilterEngine {
	private state: FilterState = {
		category: 'CMS',
		searchTerm: '',
		showOpenSource: true,
		showProprietary: true,
		showDiscontinuedOnly: false,
		showFreeTrialOnly: false,
		showFreemiumOnly: false,
		showFreeOnly: false,
		selectedPlatforms: [],
		selectedCompliance: [],
		selectedAuthentication: [],
		signupIsOpenOnly: false,
	}
	private rows: HTMLElement[]
	private matchingRows: HTMLElement[] = []
	private currentPage = 1
	private pageSize = 50
	private listeners: Array<() => void> = []

	constructor(container: HTMLElement) {
		// Works for both <table> (tbody .product-row) and <div> (.product-row) containers
		const scopeEl = container.querySelector('tbody') ?? container
		this.rows = Array.from(scopeEl.querySelectorAll<HTMLElement>('.product-row'))
	}

	sortRows(compareFn: (a: HTMLElement, b: HTMLElement) => number): void {
		const parent = this.rows[0]?.parentElement
		if (!parent) return
		this.rows.sort(compareFn)
		for (const row of this.rows) {
			parent.appendChild(row)
		}
		this.applyFilters()
	}

	getState(): FilterState {
		return { ...this.state }
	}

	setState(partial: Partial<FilterState>): void {
		Object.assign(this.state, partial)
		this.currentPage = 1
		this.applyFilters()
	}

	setPage(page: number): void {
		this.currentPage = page
		this.applyPagination()
		this.updateVisibleCount()
		this.dispatchChange()
	}

	getMatchingRows(): HTMLElement[] {
		return [...this.matchingRows]
	}

	getPageInfo(): { current: number; total: number; matchCount: number } {
		const total = Math.max(1, Math.ceil(this.matchingRows.length / this.pageSize))
		return {
			current: this.currentPage,
			total,
			matchCount: this.matchingRows.length,
		}
	}

	onChange(fn: () => void): void {
		this.listeners.push(fn)
	}

	applyFilters(): void {
		this.matchingRows = []
		for (const row of this.rows) {
			const matches =
				this.matchesCategory(row) &&
				this.matchesSearch(row) &&
				this.matchesOpenSource(row) &&
				this.matchesDiscontinued(row) &&
				this.matchesFreeTrial(row) &&
				this.matchesFreemium(row) &&
				this.matchesFree(row) &&
				this.matchesPlatforms(row) &&
				this.matchesCompliance(row) &&
				this.matchesAuthentication(row) &&
				this.matchesSignup(row)
			if (matches) {
				this.matchingRows.push(row)
			}
		}

		const totalPages = Math.max(1, Math.ceil(this.matchingRows.length / this.pageSize))
		if (this.currentPage > totalPages) {
			this.currentPage = totalPages
		}

		this.applyPagination()
		this.updateCounts()
		this.toggleEmptyState(this.matchingRows.length)
		this.dispatchChange()
	}

	private applyPagination(): void {
		const start = (this.currentPage - 1) * this.pageSize
		const end = start + this.pageSize
		const matchingSet = new Set(this.matchingRows)

		for (const row of this.rows) {
			if (!matchingSet.has(row)) {
				row.classList.add('hidden')
			} else {
				const idx = this.matchingRows.indexOf(row)
				row.classList.toggle('hidden', idx < start || idx >= end)
			}
		}
	}

	private matchesCategory(row: HTMLElement): boolean {
		if (!this.state.category) return true
		const cats = (row.dataset.categories || '').split(',')
		return cats.includes(this.state.category)
	}

	private matchesSearch(row: HTMLElement): boolean {
		const term = this.state.searchTerm.toLowerCase()
		if (!term) return true
		return (
			(row.dataset.name || '').includes(term) ||
			(row.dataset.website || '').includes(term)
		)
	}

	private matchesOpenSource(row: HTMLElement): boolean {
		const { showOpenSource, showProprietary } = this.state
		if (!showOpenSource && !showProprietary) return true // no filter active
		const isOpen = row.dataset.openSource === 'true'
		if (showOpenSource && isOpen) return true
		if (showProprietary && !isOpen) return true
		return false
	}

	private matchesDiscontinued(row: HTMLElement): boolean {
		if (!this.state.showDiscontinuedOnly) return true
		return row.dataset.discontinued === 'true'
	}

	private matchesFreeTrial(row: HTMLElement): boolean {
		if (!this.state.showFreeTrialOnly) return true
		return row.dataset.freeTrial === 'true'
	}

	private matchesFreemium(row: HTMLElement): boolean {
		if (!this.state.showFreemiumOnly) return true
		return row.dataset.freemium === 'true'
	}

	private matchesFree(row: HTMLElement): boolean {
		if (!this.state.showFreeOnly) return true
		if (row.dataset.openSource === 'true') return true
		// Freemium only counts when there is actual pricing data
		if (row.dataset.hasPricing !== 'true') return false
		return row.dataset.freemium === 'true'
	}

	private matchesPlatforms(row: HTMLElement): boolean {
		if (this.state.selectedPlatforms.length === 0) return true
		const platforms = (row.dataset.platforms || '').split(',').filter(Boolean)
		return this.state.selectedPlatforms.every((p) => platforms.includes(p))
	}

	private matchesCompliance(row: HTMLElement): boolean {
		if (this.state.selectedCompliance.length === 0) return true
		const compliance = (row.dataset.compliance || '').split(',').filter(Boolean)
		return this.state.selectedCompliance.every((c) => compliance.includes(c))
	}

	private matchesAuthentication(row: HTMLElement): boolean {
		if (this.state.selectedAuthentication.length === 0) return true
		const authentication = (row.dataset.authentication || '').split(',').filter(Boolean)
		return this.state.selectedAuthentication.every((a) => authentication.includes(a))
	}

	private matchesSignup(row: HTMLElement): boolean {
		if (!this.state.signupIsOpenOnly) return true
		return row.dataset.selfSignup === 'true'
	}

	private toggleEmptyState(visibleCount: number): void {
		const emptyState = document.querySelector('#empty-state')
		const tableWrapper = document.querySelector<HTMLElement>('.table-wrapper')
		const listWrapper = document.querySelector<HTMLElement>('#product-list-wrapper')
		if (emptyState) {
			emptyState.classList.toggle('hidden', visibleCount > 0)
		}
		if (tableWrapper) {
			tableWrapper.style.display = visibleCount === 0 ? 'none' : ''
		}
		if (listWrapper) {
			listWrapper.style.display = visibleCount === 0 ? 'none' : ''
		}
	}

	private updateCounts(): void {
		const categories = ['CMS', 'Content provider', 'Computer vision']
		for (const cat of categories) {
			const countEl = document.querySelector(`[data-category-count="${cat}"]`)
			if (countEl) {
				let count = 0
				for (const row of this.rows) {
					const cats = (row.dataset.categories || '').split(',')
					if (!cats.includes(cat)) continue
					if (
						this.matchesSearch(row) &&
						this.matchesOpenSource(row) &&
						this.matchesPlatforms(row) &&
						this.matchesCompliance(row) &&
						this.matchesAuthentication(row) &&
						this.matchesSignup(row)
					)
						count++
				}
				countEl.textContent = String(count)
			}
		}

		this.updateVisibleCount()

		const matchingSet = new Set(this.matchingRows)
		const platformCheckboxes = document.querySelectorAll<HTMLElement>('[data-platform-count]')
		for (const el of platformCheckboxes) {
			const platform = el.dataset.platformCount || ''
			let count = 0
			for (const row of this.rows) {
				if (!matchingSet.has(row)) continue
				const platforms = (row.dataset.platforms || '').split(',').filter(Boolean)
				if (platforms.includes(platform)) count++
			}
			el.textContent = String(count)
		}
	}

	private updateVisibleCount(): void {
		const { current, total, matchCount } = this.getPageInfo()
		const text = total <= 1
			? String(matchCount)
			: `${(current - 1) * this.pageSize + 1}–${Math.min(current * this.pageSize, matchCount)} of ${matchCount}`
		for (const el of document.querySelectorAll('.visible-count')) {
			el.textContent = text
		}
	}

	private dispatchChange(): void {
		for (const fn of this.listeners) fn()
	}
}
