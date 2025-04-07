const { QuickDB } = require('quick.db')
const db = new QuickDB()
const ores = require('../utils/ores.json')

const createMineSession = (userId, username, interaction) => {
  const session = {
    userId,
    mined: [],
    totalCoins: 0,
    totalXP: 0
  }

  const getXPFromOre = (ore) => {
    const base = {
      common: 2,
      uncommon: 4,
      rare: 8,
      epic: 12,
      legendary: 20
    }
    return base[ore.rarity] || 1
  }

  const checkLevelUp = async () => {
    const currentXP = await db.get(`xp_${userId}`) || 0
    const currentLevel = await db.get(`level_${userId}`) || 1
    const neededXP = 20 + (currentLevel - 1) * 5

    if (currentXP >= neededXP) {
      await db.add(`level_${userId}`, 1)
      await db.set(`xp_${userId}`, currentXP - neededXP)
      await interaction.followUp({
        content: `🎉 ${username} has reached level ${currentLevel + 1}!`,
        ephemeral: false
      })
    }
  }

  return {
    logOre: async (oreName) => {
      const oreData = ores.find(o => o.name === oreName)
      if (!oreData) return

      session.mined.push(oreData)
      session.totalCoins += oreData.price
      const xpGain = getXPFromOre(oreData)
      session.totalXP += xpGain
      await db.add(`xp_${userId}`, xpGain)
      await checkLevelUp()
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

      fields.push({
        name: 'Total XP',
        value: `${session.totalXP} XP`,
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
