const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const { QuickDB } = require('quick.db')
const pickaxes = require('../../utils/pickaxes.json')
const emojis = require('../../utils/emojis.json')

const db = new QuickDB()

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Show your mining profile'),

  async execute(interaction) {
    const userId = interaction.user.id
    const username = interaction.user.username

    const coins = await db.get(`botcoins_${userId}`) || 0
    const level = await db.get(`level_${userId}`) || 1
    const xp = await db.get(`xp_${userId}`) || 0
    const pickaxeId = await db.get(`pickaxe_${userId}`) || 1
    const pickaxe = pickaxes.find(p => p.id === pickaxeId)

    const embed = new EmbedBuilder()
      .setTitle(`🧾 ${username}'s Profile`)
      .setColor('Gold')
      .addFields(
        { name: `${emojis.coins} Coins`, value: `${coins}`, inline: true },
        { name: `📈 Level`, value: `${level}`, inline: true },
        { name: `${emojis.xp} XP`, value: `${xp}`, inline: true },
        { name: `⛏️ Pickaxe`, value: `${pickaxe.emoji} ${pickaxe.name}`, inline: true }
      )

    await interaction.reply({ embeds: [embed] })
  }
}
