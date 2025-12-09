# Contributing Guidelines & Engineering Standards

## Core Principles

### 1. Architectural Discipline
- **Analyze before changing**: Understand the full impact of any modification
- **Ask questions**: When something is unclear, seek clarification before implementing
- **Minimal footprint**: Make the smallest change that solves the problem
- **No ripple effects**: Changes to one file should not require cascading changes unless necessary

### 2. Code Quality Standards

#### Type Safety
- Use TypeScript strictly - no `any` types without justification
- Define interfaces at the point of use, not globally unless shared
- Remove unused types, interfaces, and props immediately
- Prefer `type` for simple type aliases, `interface` for object shapes that may be extended

#### Component Design
- Single responsibility: Each component does one thing well
- Props should be minimal - only pass what's needed
- Avoid prop drilling - use context or composition patterns
- Co-locate related code (component + types + utils)

#### Naming Conventions
- Components: PascalCase (`CsvUploader.tsx`)
- Utilities: camelCase (`csvParser.ts`)
- Types/Interfaces: PascalCase (`SchemaField`, `ParsedCsvData`)
- Constants: SCREAMING_SNAKE_CASE for true constants
- Files match their primary export name

### 3. Development Workflow

#### Before Every Change
1. Run `pnpm lint` to understand current state
2. Run `pnpm build` to ensure it compiles
3. Identify the minimal set of files to modify

#### After Every Change
1. Run `pnpm build` - must pass
2. Run `pnpm lint` - fix errors, address warnings thoughtfully
3. Run tests - maintain ≥60% coverage per file
4. Commit with concise message

#### Commit Messages
- Format: `<type>: <description>`
- Types: `fix`, `feat`, `refactor`, `docs`, `test`, `chore`
- Keep under 72 characters
- Examples:
  - `fix: resolve React import error in CsvUploader`
  - `feat: add clear all button to ImageUploader`
  - `refactor: remove unused props from TypeSelector`

### 4. Linting Rules

We use the `sanity` ESLint config with these principles:
- **Errors are blockers** - must be fixed before commit
- **Warnings are debt** - address in the same PR when reasonable
- **No rule disabling** without team consensus and documentation

Rules we enforce strictly:
- `@typescript-eslint/no-unused-vars` - clean up dead code
- `no-undef` - all references must be defined
- `prettier/prettier` - consistent formatting

Rules we treat as guidance:
- `no-nested-ternary` - refactor when it hurts readability
- `react/jsx-no-bind` - optimize in hot paths only
- `no-array-index-key` - use stable keys when data has them

### 5. Testing Standards

#### Coverage Requirements
- Minimum 60% coverage per file
- Focus on business logic (`/lib/*`)
- Component tests for user interactions
- Integration tests for the full import flow

#### Test Structure
```typescript
describe('ModuleName', () => {
  describe('functionName', () => {
    it('should handle the happy path', () => {})
    it('should handle edge case X', () => {})
    it('should throw on invalid input', () => {})
  })
})
```

### 6. Documentation

#### Code Comments
- Explain *why*, not *what*
- Document complex algorithms
- Mark TODOs with ticket references

#### README Updates
- Document new features
- Update usage examples
- Keep installation instructions current

### 7. Architecture Decisions

When facing a design choice:
1. Document the options
2. List pros/cons
3. Choose the simplest solution that works
4. Document the decision in code comments if non-obvious

### 8. Review Checklist

Before requesting review:
- [ ] Build passes
- [ ] Lint passes (no new warnings)
- [ ] Tests pass with ≥60% coverage
- [ ] No console.logs or debug code
- [ ] Types are clean (no `any`, no unused)
- [ ] Props are minimal
- [ ] Commit messages are clear
- [ ] Changes are focused (one concern per PR)

---

## Quick Reference

```bash
# Development
pnpm dev          # Watch mode
pnpm build        # Production build
pnpm lint         # Check linting
pnpm lint --fix   # Auto-fix what's possible
pnpm test         # Run tests
pnpm test:coverage # Run with coverage report

# Before commit
pnpm build && pnpm lint && pnpm test
```
