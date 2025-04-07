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
    const ownedId = await db.get(`pickaxe_${userId}`) || 1

    // Filter only pickaxes the user owns (by ID)
    const ownedPickaxes = pickaxes.filter(p => p.id <= ownedId)
    let selectedIndex = 0

    const getEmbed = () => {
      const list = ownedPickaxes.map((p, i) => {
        const isSelected = i === selectedIndex
        const isEquipped = p.id === ownedId
        return `${isSelected ? '➡️' : '   '} ${p.emoji} ${p.name}${isEquipped ? ' (equipped)' : ''}`
      }).join('\n')

      return new EmbedBuilder()
        .setTitle('🧰 Your Pickaxes')
        .setDescription(list)
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
      }

      if (i.customId === 'next_pick') {
        selectedIndex = (selectedIndex + 1) % ownedPickaxes.length
      }

      if (i.customId === 'select_pick') {
        const selected = ownedPickaxes[selectedIndex]
        await db.set(`pickaxe_${userId}`, selected.id)
        await i.reply({ content: `✅ You equipped ${selected.emoji} **${selected.name}**!`, ephemeral: true })
      }

      await i.update({
        embeds: [getEmbed()],
        components: [row]
      })
    })
  }
}
