# AI List

AI List is a massive open source directory for the AI industry: tools, products, platforms, models, agents, developer infrastructure, research labs, and the ecosystem around them.

The project uses a Hugo-powered open directory system and is being shaped into a neutral, structured, community-maintained catalog for discovering and comparing AI products.

**[Browse the directory](https://spacesitenet.github.io/ailist/)** | **[Submit an AI product](https://github.com/spacesitenet/ailist/issues/new?template=suggest-a-new-product.md)**

## What This Is

AI is moving too quickly for static blog lists and vendor-sponsored rankings. AI List aims to be a durable open dataset and fast static website that tracks practical product details such as:

- Product category and use case
- Website, description, founding year, and headquarters
- Open-source status, license, and source URL
- Pricing model, free trial, freemium, and self-signup support
- Supported platforms, developer APIs, MCP support, SSO, and compliance signals
- Notes and sources that make the data auditable

## Tech Stack

- **[Hugo](https://gohugo.io/)** for static generation and Content Adapters
- **[Bun](https://bun.sh/)** for package management and TypeScript scripts
- **[Tailwind CSS v4](https://tailwindcss.com/)** for styling
- **[Biome](https://biomejs.dev/)** for linting and formatting
- **[Zod](https://zod.dev/)** for product data validation

## Getting Started

```bash
bun install
bun run dev
```

Useful commands:

```bash
bun run check      # validate product YAML files
bun run add        # add a product interactively
bun run lint       # check TypeScript and scripts
bun run build      # production build
```

## Data Model

Product data lives in `data/products/`. Each YAML file is the source of truth for one product, and Hugo generates product pages directly from the dataset.

The current schema is intentionally reusable for AI products. As the directory grows, the categories and fields can evolve toward AI-specific needs such as model provider, agent runtime, API availability, context protocol support, evals, safety posture, and deployment options.

## Contributing

Contributions are welcome through issues and pull requests. Good contributions include:

- Adding missing AI products
- Correcting stale pricing, platform, or open-source data
- Improving categories and taxonomies
- Adding reliable sources for claims
- Improving the Hugo UI, search, filtering, and product pages

Please include official sources where possible so the dataset stays useful and reviewable.

## License And Attribution

The product dataset in `data/products/` remains licensed under the [Open Data Commons Open Database License (ODbL) v1.0](LICENSE-DATA).

This project is maintained by [spacesitenet](https://github.com/spacesitenet). Initially forked from [514sid](https://github.com/514sid)
