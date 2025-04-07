const { QuickDB } = require('quick.db')
const db = new QuickDB()

const ores = require('../utils/ores.json')

const createMineSession = (userId) => {
  const session = {
    userId,
    mined: [],
    totalCoins: 0
  }

  return {
    logOre: (oreName) => {
      const oreData = ores.find(o => o.name === oreName)
      if (!oreData) return

      session.mined.push(oreData)
      session.totalCoins += oreData.price
    },
    getSummaryFields: () => {
      const counts = {}

      for (const ore of session.mined) {
        if (!counts[ore.name]) counts[ore.name] = { ...ore, count: 0 }
        counts[ore.name].count++
      }

      const fields = Object.values(counts).map(ore => ({
        name: `${ore.emoji} ${ore.name}`,
        value: `${ore.count}x (${ore.count * ore.price} coins)`,
        inline: true
      }))

      fields.push({
        name: 'Total Coins',
        value: `${session.totalCoins} coins`,
        inline: false
      })

      return fields
    },
    getCoins: () => session.totalCoins
  }
}

module.exports = {
  createMineSession
}
