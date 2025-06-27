declare module 'fastify-sqlite' {
  import { FastifyPluginCallback } from 'fastify'
  import { Database as SQLite3Database } from 'sqlite3'
  
  interface FastifySqliteOptions {
    dbFile?: string
    promiseApi?: boolean
    name?: string
    verbose?: boolean
    mode?: number
  }

  const fastifySqlite: FastifyPluginCallback<FastifySqliteOptions>
  export default fastifySqlite
  export { fastifySqlite }
}

// Extend Fastify instance when promiseApi is enabled
declare module 'fastify' {
  interface FastifyInstance {
    sqlite: {
      run(sql: string, params?: any[]): Promise<{ lastID: number; changes: number }>
      get(sql: string, params?: any[]): Promise<any>
      all(sql: string, params?: any[]): Promise<any[]>
      each(sql: string, params?: any[], callback: (err: Error | null, row: any) => void): Promise<void>
    }
  }
}
