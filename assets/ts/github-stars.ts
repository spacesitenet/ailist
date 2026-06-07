const CACHE_TTL = 60 * 60 * 1000 // 1 hour

export function initGitHubStars(): void {
	const elements = document.querySelectorAll<HTMLElement>('[data-github-repo]')
	if (!elements.length) return

	for (const el of elements) {
		const repo = el.dataset.githubRepo
		if (!repo) continue

		const row = el.closest('[data-github-stars-row]')
		const cacheKey = `gh-stars-${repo}`

		const cached = readCache(cacheKey)
		if (cached !== null) {
			showStars(el, row, cached)
			continue
		}

		fetch(`https://api.github.com/repos/${repo}`)
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				if (!data?.stargazers_count) return
				const count = data.stargazers_count
				writeCache(cacheKey, count)
				showStars(el, row, count)
			})
			.catch(() => {})
	}
}

function readCache(key: string): number | null {
	try {
		const raw = localStorage.getItem(key)
		if (!raw) return null
		const { value, expires } = JSON.parse(raw)
		if (Date.now() > expires) {
			localStorage.removeItem(key)
			return null
		}
		return value
	} catch {
		return null
	}
}

function writeCache(key: string, value: number): void {
	try {
		localStorage.setItem(key, JSON.stringify({ value, expires: Date.now() + CACHE_TTL }))
	} catch {}
}

function showStars(el: HTMLElement, row: Element | null, count: number): void {
	el.textContent = formatStars(count)
	row?.classList.remove('hidden')
}

function formatStars(count: number): string {
	if (count >= 1000) return `${(count / 1000).toFixed(1)}k`
	return String(count)
}
