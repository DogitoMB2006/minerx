const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const { QuickDB } = require('quick.db')
const ores = require('../../utils/ores.json')

const db = new QuickDB()

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('Check your stored materials'),

  async execute(interaction) {
    const userId = interaction.user.id
    const username = interaction.user.username

    // Materiales que se almacenan y no se venden automáticamente
    const storedItems = ['raw_iron', 'iron_ingot', 'raw_gold', 'gold_ingot']

    let inventoryText = ''

    for (const oreName of storedItems) {
      const itemData = ores.find(o => o.name === oreName)
      const emoji = itemData?.emoji || '🔹'
      const amount = await db.get(`${oreName}_${userId}`) || 0
      inventoryText += `${emoji} ${oreName.replace('_', ' ')}: ${amount}\n`
    }

    const embed = new EmbedBuilder()
      .setTitle(`🎒 ${username}'s Inventory`)
      .setDescription(inventoryText || 'Your inventory is empty.')
      .setColor('DarkGreen')

    await interaction.reply({ embeds: [embed] })
  }
}
