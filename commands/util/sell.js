const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const { QuickDB } = require('quick.db')
const ores = require('../../utils/ores.json')

const db = new QuickDB()

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sell')
    .setDescription('Sell iron ingots only')
    .addStringOption(option =>
      option.setName('item')
        .setDescription('Select item to sell')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption(option =>
      option.setName('amount')
        .setDescription('How many to sell (number or "all")')
        .setRequired(true)
    ),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase()

    const options = [{
      name: 'iron_ingot',
      value: 'iron_ingot'
    }]

    const filtered = options.filter(opt => opt.name.includes(focused))
    await interaction.respond(filtered)
  },

  async execute(interaction) {
    const userId = interaction.user.id
    const item = interaction.options.getString('item')
    const amountInput = interaction.options.getString('amount')

    if (item !== 'iron_ingot') {
      return interaction.reply({ content: 'Only iron_ingot can be sold.', ephemeral: true })
    }

    const ore = ores.find(o => o.name === item)
    const userAmount = await db.get(`${item}_${userId}`) || 0

    let amountToSell = 0
    if (amountInput.toLowerCase() === 'all') {
      amountToSell = userAmount
    } else {
      const parsed = parseInt(amountInput)
      if (isNaN(parsed) || parsed <= 0) {
        return interaction.reply({ content: 'Please enter a valid number or "all".', ephemeral: true })
      }
      if (parsed > userAmount) {
        return interaction.reply({ content: `You don't have that many ${item}.`, ephemeral: true })
      }
      amountToSell = parsed
    }

    if (amountToSell <= 0) {
      return interaction.reply({ content: `You have no ${item} to sell.`, ephemeral: true })
    }

    const totalCoins = amountToSell * ore.price

    await db.set(`${item}_${userId}`, userAmount - amountToSell)
    await db.add(`botcoins_${userId}`, totalCoins)

    const embed = new EmbedBuilder()
      .setTitle('💰 Sell Complete')
      .setDescription(
        `You sold ${amountToSell}x ${item} for ${totalCoins} coins.`
      )
      .setColor('Gold')

    await interaction.reply({ embeds: [embed] })
  }
}
