const { QuickDB } = require('quick.db')
const db = new QuickDB()
const chests = require('./chests.json')

/**
 * Determine if a chest should appear while mining
 * @returns {Object|null} The chest that appears, or null if no chest appears
 */
function getRandomChest() {
  const roll = Math.random() * 100
  
  // Sort chests by rarity (lowest chance first to prevent overlap issues)
  const sortedChests = [...chests].sort((a, b) => a.appearance_chance - b.appearance_chance)
  
  let cumulativeChance = 0
  for (const chest of sortedChests) {
    cumulativeChance += chest.appearance_chance
    if (roll <= cumulativeChance) {
      return chest
    }
  }
  
  return null
}

/**
 * Generate a random reward from a chest
 * @param {Object} chest The chest to get a reward from
 * @returns {Object} The generated reward
 */
function getChestReward(chest) {
  const roll = Math.random() * 100
  let cumulativeChance = 0
  
  // Sort rewards by chance (ascending)
  const sortedRewards = [...chest.rewards].sort((a, b) => a.chance - b.chance)
  
  for (const reward of sortedRewards) {
    cumulativeChance += reward.chance
    if (roll <= cumulativeChance) {
      // Generate random amount between min and max
      const amount = Math.floor(Math.random() * (reward.max - reward.min + 1)) + reward.min
      
      return {
        type: reward.type,
        amount: amount,
        item: reward.item || null
      }
    }
  }
  
  // Fallback to the first reward if something goes wrong
  const fallbackReward = chest.rewards[0]
  const fallbackAmount = Math.floor(Math.random() * (fallbackReward.max - fallbackReward.min + 1)) + fallbackReward.min
  
  return {
    type: fallbackReward.type,
    amount: fallbackAmount,
    item: fallbackReward.item || null
  }
}

/**
 * Apply a reward to a user
 * @param {string} userId The user ID to apply the reward to
 * @param {Object} reward The reward to apply
 * @returns {string} A description of the reward
 */
async function applyReward(userId, reward) {
  let rewardDescription = ""
  
  switch (reward.type) {
    case "coins":
      await db.add(`botcoins_${userId}`, reward.amount)
      rewardDescription = `${reward.amount} coins`
      break
      
    case "xp":
      await db.add(`xp_${userId}`, reward.amount)
      rewardDescription = `${reward.amount} XP`
      
      // Check for level up when XP is added
      await checkLevelUp(userId)
      break
      
    case "item":
      await db.add(`${reward.item}_${userId}`, reward.amount)
      rewardDescription = `${reward.amount}x ${reward.item}`
      break
      
    default:
      rewardDescription = "Unknown reward"
  }
  
  return rewardDescription
}

/**
 * Check if a user has leveled up and handle the level up process
 * @param {string} userId The user ID to check for level up
 * @returns {boolean} Whether the user leveled up
 */
async function checkLevelUp(userId) {
  const currentXP = await db.get(`xp_${userId}`) || 0
  const currentLevel = await db.get(`level_${userId}`) || 1
  const neededXP = 20 + (currentLevel - 1) * 5

  if (currentXP >= neededXP) {
    // Level up!
    await db.add(`level_${userId}`, 1)
    await db.set(`xp_${userId}`, currentXP - neededXP)
    return true
  }
  
  return false
}

module.exports = {
  getRandomChest,
  getChestReward,
  applyReward,
  checkLevelUp
}