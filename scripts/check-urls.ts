import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import yaml from 'js-yaml'

const CONCURRENCY = 30
const TIMEOUT_MS = 10_000

type Product = { name?: string; slug?: string; website?: string; discontinued?: boolean }

type Result = {
	slug: string
	name: string
	url: string
	status: number | null
	category: 'ok' | 'blocked' | 'redirect' | 'dead' | 'skip'
	detail: string
}

function detectBlocker(status: number, headers: Headers): string | null {
	if (headers.get('cf-ray') || headers.get('server')?.toLowerCase().includes('cloudflare')) return 'Cloudflare'
	if (headers.get('server')?.toLowerCase().includes('ddos-guard')) return 'DDoS-Guard'
	if (headers.get('x-sucuri-id')) return 'Sucuri'
	if (status === 403) return 'Blocked (403)'
	if (status === 429) return 'Rate limited (429)'
	if (status === 503) return 'Blocked (503)'
	return null
}

async function checkUrl(slug: string, name: string, url: string): Promise<Result> {
	const base = { slug, name, url }
	try {
		const res = await fetch(url, {
			method: 'HEAD',
			redirect: 'manual',
			signal: AbortSignal.timeout(TIMEOUT_MS),
			headers: {
				'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36',
				Accept: 'text/html',
			},
		})

		const { status } = res

		if (status >= 301 && status <= 308) {
			const loc = res.headers.get('location') ?? ''
			return { ...base, status, category: 'redirect', detail: `→ ${loc}` }
		}

		if (status === 200 || status === 201 || status === 202) {
			return { ...base, status, category: 'ok', detail: 'OK' }
		}

		const blocker = detectBlocker(status, res.headers)
		if (blocker) return { ...base, status, category: 'blocked', detail: blocker }

		if (status >= 400) return { ...base, status, category: 'dead', detail: `HTTP ${status}` }

		return { ...base, status, category: 'ok', detail: `HTTP ${status}` }
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err)
		const detail =
			msg.includes('timed out') || msg.includes('TimeoutError')
				? 'Timeout'
				: msg.includes('ENOTFOUND') || msg.includes('getaddrinfo')
					? 'DNS failure'
					: msg.includes('ECONNREFUSED')
						? 'Connection refused'
						: msg.includes('certificate') || msg.includes('SSL')
							? 'SSL error'
							: `Error: ${msg.slice(0, 80)}`
		return { ...base, status: null, category: 'dead', detail }
	}
}

// ── Load products ──────────────────────────────────────────────────────────────
const files = readdirSync('data/products').filter((f) => f.endsWith('.yaml'))
const tasks: { slug: string; name: string; url: string }[] = []
const skipped: Result[] = []

for (const file of files) {
	const p = yaml.load(readFileSync(`data/products/${file}`, 'utf8')) as Product
	const slug = p.slug ?? file.replace('.yaml', '')
	const name = p.name ?? slug
	if (!p.website) {
		skipped.push({ slug, name, url: '', status: null, category: 'skip', detail: 'No website' })
		continue
	}
	if (p.discontinued) {
		skipped.push({ slug, name, url: p.website, status: null, category: 'skip', detail: 'Discontinued' })
		continue
	}
	tasks.push({ slug, name, url: p.website })
}

console.log(`Checking ${tasks.length} URLs with concurrency ${CONCURRENCY}…\n`)

// ── Run with concurrency limit ─────────────────────────────────────────────────
const results: Result[] = []
let done = 0

for (let i = 0; i < tasks.length; i += CONCURRENCY) {
	const batch = tasks.slice(i, i + CONCURRENCY)
	const batchResults = await Promise.all(batch.map((t) => checkUrl(t.slug, t.name, t.url)))
	results.push(...batchResults)
	done += batch.length
	process.stdout.write(`\r${done}/${tasks.length}`)
}
console.log('\n')

// ── Categorize ─────────────────────────────────────────────────────────────────
const ok = results.filter((r) => r.category === 'ok')
const blocked = results.filter((r) => r.category === 'blocked')
const redirects = results.filter((r) => r.category === 'redirect')
const dead = results.filter((r) => r.category === 'dead')

// ── Build report ───────────────────────────────────────────────────────────────
const lines: string[] = []
const pad = (s: string, n: number) => s.slice(0, n).padEnd(n)

lines.push(`URL Health Report`)
lines.push(`Generated: ${new Date().toISOString()}`)
lines.push(
	`Checked: ${tasks.length} | OK: ${ok.length} | Blocked: ${blocked.length} | Redirects: ${redirects.length} | Dead: ${dead.length} | Skipped: ${skipped.length}`,
)
lines.push('')

const section = (title: string, items: Result[]) => {
	if (!items.length) return
	lines.push(`${'─'.repeat(80)}`)
	lines.push(`${title} (${items.length})`)
	lines.push(`${'─'.repeat(80)}`)
	for (const r of items.sort((a, b) => a.name.localeCompare(b.name))) {
		const status = r.status != null ? String(r.status) : '   '
		lines.push(`${pad(status, 4)} ${pad(r.name, 35)} ${pad(r.detail, 25)} ${r.url}`)
	}
	lines.push('')
}

section('DEAD', dead)
section('BLOCKED / BOT PROTECTION', blocked)
section('REDIRECTS', redirects)
section('OK', ok)
section('SKIPPED', skipped)

const out = lines.join('\n')
const outFile = 'url-report.txt'
writeFileSync(outFile, out)
console.log(out)
console.log(`\nSaved to ${outFile}`)
