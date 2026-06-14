/**
 * Generate missing content/_index.md files for taxonomy terms (categories + platforms).
 * Reads all product YAML files to discover terms, then creates stub files with SEO frontmatter
 * for any term that doesn't already have a content file.
 *
 * Usage: bun run gen:terms
 */

import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'

const PRODUCTS_DIR = 'data/products'
const CONTENT_DIR = 'content'

// Hugo's slugification: lowercase, spaces → hyphens, strip non-alphanumeric (except hyphens)
function slugify(str: string): string {
	return str
		.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-]/g, '')
}

function buildFrontmatter(title: string, type: 'category' | 'platform'): string {
	const noun = type === 'category' ? 'category' : 'platform'
	const seoTitle = `${title} AI Products`
	const description = `Compare and explore AI products in the ${title} ${noun}. Find the right tool, model, or platform for your workflow.`
	return `---
title: "${title}"
seo_title: "${seoTitle}"
description: "${description}"
---
`
}

function ensureTermFile(taxonomy: string, title: string, type: 'category' | 'platform'): boolean {
	const slug = slugify(title)
	const dir = path.join(CONTENT_DIR, taxonomy, slug)
	const file = path.join(dir, '_index.md')

	if (fs.existsSync(file)) {
		return false
	}

	fs.mkdirSync(dir, { recursive: true })
	fs.writeFileSync(file, buildFrontmatter(title, type))
	return true
}

// Collect all unique categories and platforms from product YAMLs
const categories = new Set<string>()
const platforms = new Set<string>()

const files = fs.readdirSync(PRODUCTS_DIR).filter((f) => f.endsWith('.yaml'))

for (const file of files) {
	const raw = fs.readFileSync(path.join(PRODUCTS_DIR, file), 'utf8')
	const data = yaml.load(raw) as Record<string, unknown>
	for (const cat of (data.categories as string[]) || []) categories.add(cat)
	for (const plat of (data.platforms as string[]) || []) platforms.add(plat)
}

let created = 0

console.log(`\nCategories (${categories.size} found):`)
for (const cat of [...categories].sort()) {
	const wasCreated = ensureTermFile('categories', cat, 'category')
	console.log(`  ${wasCreated ? '✓ created' : '  exists '} content/categories/${slugify(cat)}/_index.md`)
	if (wasCreated) created++
}

console.log(`\nPlatforms (${platforms.size} found):`)
for (const plat of [...platforms].sort()) {
	const wasCreated = ensureTermFile('platforms', plat, 'platform')
	console.log(`  ${wasCreated ? '✓ created' : '  exists '} content/platforms/${slugify(plat)}/_index.md`)
	if (wasCreated) created++
}

console.log(`\n${created} file(s) created.\n`)
