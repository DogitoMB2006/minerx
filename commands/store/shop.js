const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js')
const { QuickDB } = require('quick.db')
const pickaxes = require('../../utils/pickaxes.json')
const emojis = require('../../utils/emojis.json')

const db = new QuickDB()

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('View and buy pickaxes'),

  async execute(interaction) {
    const userId = interaction.user.id
    let index = 0
    let purchaseMessage = null

    const getEmbed = async () => {
      const selected = pickaxes[index]
      const coins = await db.get(`botcoins_${userId}`) || 0
      
      // NUEVO: Obtenemos el nivel más alto de pico que posee el usuario
      const highestPickaxeId = await db.get(`highestPickaxe_${userId}`) || 1
      const isOwned = selected.id <= highestPickaxeId

      let description = `Selected: ➡️ ${selected.emoji} **${selected.name}**\n` +
                       `Price: ${selected.price ? `${emojis.coins} ${selected.price}` : 'Default'}\n` +
                       `Status: ${isOwned ? '✅ Owned' : coins >= selected.price ? '🟢 Available' : '🔴 Not enough coins'}`
      
      // Add purchase message if there is one
      if (purchaseMessage) {
        description += `\n\n${purchaseMessage}`;
      }

      const embed = new EmbedBuilder()
        .setTitle('🛒 Pickaxe Shop')
        .setColor('Blue')
        .setDescription(description)

      return embed
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('prev_pickaxe')
        .setLabel('◀️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('buy_pickaxe')
        .setLabel('🛒 Buy')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('next_pickaxe')
        .setLabel('▶️')
        .setStyle(ButtonStyle.Secondary)
    )

    const msg = await interaction.reply({
      embeds: [await getEmbed()],
      components: [row],
      fetchReply: true
    })

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30000
    })

    collector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: 'This button is not for you.', ephemeral: true })
      }

      if (i.customId === 'prev_pickaxe') {
        index = (index - 1 + pickaxes.length) % pickaxes.length
        purchaseMessage = null
      }

      if (i.customId === 'next_pickaxe') {
        index = (index + 1) % pickaxes.length
        purchaseMessage = null
      }

      if (i.customId === 'buy_pickaxe') {
        const selected = pickaxes[index]
        const coins = await db.get(`botcoins_${userId}`) || 0
        
        // NUEVO: Obtenemos el nivel más alto de pico que posee el usuario
        const highestPickaxeId = await db.get(`highestPickaxe_${userId}`) || 1
      
        if (selected.id <= highestPickaxeId) {
          purchaseMessage = '❌ You already own this pickaxe.';
        }
        else if (coins < selected.price) {
          purchaseMessage = '❌ Not enough coins to buy this pickaxe.';
        }
        else {
          // NUEVO: Actualizamos el nivel más alto de pico que posee el usuario
          await db.set(`highestPickaxe_${userId}`, selected.id)
          
          // También equipamos el nuevo pico automáticamente
          await db.set(`pickaxe_${userId}`, selected.id)
          
          // Restamos el costo
          await db.set(`botcoins_${userId}`, coins - selected.price)
          
          purchaseMessage = `✅ You bought ${selected.emoji} **${selected.name}**!`;
        }
      }

      await i.update({
        embeds: [await getEmbed()],
        components: [row]
      })
    })
  }
}