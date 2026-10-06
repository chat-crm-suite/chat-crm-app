# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Agent skills

`.agents/` and `.claude/` are installed, gitignored directories (never committed).
`skills-lock.json` is the source of truth, like `package.json` for npm deps.

```sh
pnpm skills:install          # install every skill in the lock
pnpm skills:install -- --skill tdd
pnpm skills:check            # verify installed skills without network
```

To add/update a skill, use the [skills.sh](https://www.skills.sh/) CLI
(which updates the lockfile), then commit only the lock:

```sh
pnpm dlx skills@latest add <owner/repo> --skill <name> -a opencode -a claude-code --copy -y
```

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Project license

This repository (chat-crm-app) is licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE):

- **Noncommercial use**: free — use, modify and distribute the code while keeping the copyright notices (`NOTICE`).
- **Commercial use**: requires a commercial license. Organizations below USD 100,000/year in revenue get a free commercial license; above that, an annual fee or revenue share — see [`COMMERCIAL.md`](COMMERCIAL.md).
- **Authorship**: `Copyright (c) 2026 Jerremi Aron Chancan Labajos`. Commercial use requires the visible credit "Built on chat-crm".

Commercial licensing contact: **chancanjeremiaron@gmail.com**.
