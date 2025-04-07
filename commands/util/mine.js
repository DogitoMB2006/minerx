const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } = require('discord.js')
const { QuickDB } = require('quick.db')
const path = require('path')
const fs = require('fs')

const db = new QuickDB()

const ores = JSON.parse(fs.readFileSync(path.join(__dirname, '../../utils/ores.json'), 'utf8'))
const world = JSON.parse(fs.readFileSync(path.join(__dirname, '../../utils/world.json'), 'utf8'))
const pickaxes = JSON.parse(fs.readFileSync(path.join(__dirname, '../../utils/pickaxes.json'), 'utf8'))

const { createMineSession } = require('../../mining/minelogic')

const rarityChances = {
  common: 80,
  uncommon: 70,
  rare: 5,
  epic: 2,
  legendary: 1
}

const getRandomOre = (allowedOres) => {
  const roll = Math.random() * 100
  const valid = allowedOres.filter(ore => {
    const chance = rarityChances[ore.rarity] || 0
    return roll <= chance
  })

  if (valid.length > 0) {
    return valid[Math.floor(Math.random() * valid.length)]
  }

  return allowedOres.find(o => o.rarity === 'common') || allowedOres[0]
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mine')
    .setDescription('Start mining in the cave!'),

  async execute(interaction) {
    const userId = interaction.user.id
    const username = interaction.user.username
    const userWorld = await db.get(`world_${userId}`) || 'overworld'
    const currentPickaxeId = await db.get(`pickaxe_${userId}`) || 1
    const pickaxe = pickaxes.find(p => p.id === currentPickaxeId)
    const pickaxeEmoji = pickaxe.emoji

    const allowedOres = ores.filter(o => pickaxe.canMine.includes(o.name))
    const minedEmoji = '⬛'
    const caveSize = 9

    const caveMap = Array.from({ length: caveSize }, () => getRandomOre(allowedOres))

    let position = 0
    const session = createMineSession(userId, username, interaction)

    const getCaveView = () => {
      return caveMap.map((ore, i) => {
        if (i < position) return minedEmoji
        if (i === position) return pickaxeEmoji
        return ore.emoji
      }).join(' ')
    }

    const getEmbed = () => {
      return new EmbedBuilder()
        .setTitle('⛏️ Mining Time')
        .setDescription(`${getCaveView()}\n\nUsing pickaxe: ${pickaxe.emoji}`)
        .setColor('Grey')
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('mine_button')
        .setLabel('Mine')
        .setStyle(ButtonStyle.Primary)
    )

    const msg = await interaction.reply({
      embeds: [getEmbed()],
      components: [row],
      fetchReply: true
    })

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30000
    })

    collector.on('collect', async i => {
      if (i.customId !== 'mine_button') return
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: 'This button is not for you.', ephemeral: true })
      }

      const currentOre = caveMap[position]
      await session.logOre(currentOre.name)
      position++

      if (position >= caveSize) {
        const coins = session.getCoins()
        await db.add(`botcoins_${userId}`, coins)

        const finalEmbed = new EmbedBuilder()
          .setTitle('✅ Mining Complete')
          .setDescription('You reached the end of the cave!\n\nHere\'s what you mined:')
          .addFields(session.getSummaryFields())
          .setColor('Green')

        return i.update({ embeds: [finalEmbed], components: [] })
      }

      await i.update({
        embeds: [getEmbed()],
        components: [row]
      })
    })
  }
}
