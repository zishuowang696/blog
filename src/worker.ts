import { app } from './app.tsx'
import { initD1Db } from './lib/engine/d1.ts'
import { setVars } from './lib/env.ts'

export interface WorkerEnv {
  DB: unknown
  ADMIN_USERNAMES?: string
  SITE_URL?: string
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    setVars({ ADMIN_USERNAMES: env.ADMIN_USERNAMES, SITE_URL: env.SITE_URL })
    await initD1Db(env.DB)
    return app.fetch(request, env)
  },
}
