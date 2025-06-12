// vitest.config.ts
import { defineConfig } from 'vitest/config'
import path from 'path' // <-- Required for path.resolve

export default defineConfig({
    
  test: {
alias: {
      '@shared': path.resolve(__dirname, 'game_shared'),
      '@': path.resolve(__dirname, 'client'), // optional but useful for client code
    },
    include: [
      "tests/*",
		"game_shared/*",
		"server/game/game_server"
    ]
  }
})

