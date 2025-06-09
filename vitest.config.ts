// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: [
      "tests/*",
      "game_shared/",
		"server/game/game_server"
    ]
  }
})

