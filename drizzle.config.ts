import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/lib/tables.ts',
  out: './migrations/drizzle',
})
