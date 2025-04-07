const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js')
const { QuickDB } = require('quick.db')
const pickaxes = require('../../utils/pickaxes.json')

const db = new QuickDB()

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pickaxes')
    .setDescription('View and equip your pickaxes'),

  async execute(interaction) {
    const userId = interaction.user.id
    const equippedId = await db.get(`pickaxe_${userId}`) || 1
    
    // NUEVO: Obtenemos el nivel más alto de pico que posee el usuario
    const highestPickaxeId = await db.get(`highestPickaxe_${userId}`) || 1
    
    // Filter only pickaxes the user owns (by ID)
    const ownedPickaxes = pickaxes.filter(p => p.id <= highestPickaxeId)
    let selectedIndex = ownedPickaxes.findIndex(p => p.id === equippedId)
    if (selectedIndex === -1) selectedIndex = 0 // Por si acaso
    
    let equipMessage = null

    const getEmbed = () => {
      const list = ownedPickaxes.map((p, i) => {
        const isSelected = i === selectedIndex
        const isEquipped = p.id === equippedId
        return `${isSelected ? '➡️' : '   '} ${p.emoji} ${p.name}${isEquipped ? ' (equipped)' : ''}`
      }).join('\n')

      // Add the equip confirmation message if there is one
      const description = equipMessage 
        ? `${list}\n\n${equipMessage}` 
        : list;

      return new EmbedBuilder()
        .setTitle('🧰 Your Pickaxes')
        .setDescription(description)
        .setColor('Orange')
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('prev_pick').setLabel('◀️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('select_pick').setLabel('✅ Select').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('next_pick').setLabel('▶️').setStyle(ButtonStyle.Secondary)
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
      if (i.user.id !== interaction.user.id)
        return i.reply({ content: 'This button is not for you.', ephemeral: true })

      if (i.customId === 'prev_pick') {
        selectedIndex = (selectedIndex - 1 + ownedPickaxes.length) % ownedPickaxes.length
        equipMessage = null
      }

      if (i.customId === 'next_pick') {
        selectedIndex = (selectedIndex + 1) % ownedPickaxes.length
        equipMessage = null
      }

      if (i.customId === 'select_pick') {
        const selected = ownedPickaxes[selectedIndex]
        await db.set(`pickaxe_${userId}`, selected.id)
        
        // Instead of replying, we'll update the embed with a confirmation message
        equipMessage = `✅ You equipped ${selected.emoji} **${selected.name}**!`
      }

      await i.update({
        embeds: [getEmbed()],
        components: [row]
      })
    })
  }
}