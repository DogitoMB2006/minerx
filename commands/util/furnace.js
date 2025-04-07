const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js')
const { QuickDB } = require('quick.db')
const ores = require('../../utils/ores.json')

const db = new QuickDB()

module.exports = {
  data: new SlashCommandBuilder()
    .setName('furnace')
    .setDescription('Smelt your raw materials into ingots'),

  async execute(interaction) {
    const userId = interaction.user.id
    const rawIron = await db.get(`raw_iron_${userId}`) || 0
    const ironIngot = await db.get(`iron_ingot_${userId}`) || 0

    const rawEmoji = ores.find(o => o.name === 'raw_iron')?.emoji || '🪨'
    const ingotEmoji = ores.find(o => o.name === 'iron_ingot')?.emoji || '🔩'

    const embed = new EmbedBuilder()
      .setTitle('🔥 Furnace')
      .setThumbnail('https://static.wikia.nocookie.net/minecraft_gamepedia/images/9/99/Furnace_%28S%29_JE4.png/revision/latest/scale-to-width/360?cb=20210111063232')
      .setDescription(
        `You currently have:\n\n` +
        `${rawEmoji} Raw Iron: ${rawIron}\n` +
        `${ingotEmoji} Iron Ingots: ${ironIngot}`
      )
      .setColor('DarkGrey')

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('melt_iron')
        .setLabel('🧪 Melt Iron')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(rawIron <= 0)
    )

    const msg = await interaction.reply({
      embeds: [embed],
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

      const currentRaw = await db.get(`raw_iron_${userId}`) || 0
      if (currentRaw <= 0)
        return i.reply({ content: 'You have no raw iron to melt.', ephemeral: true })

      await i.update({
        embeds: [
          new EmbedBuilder()
            .setTitle('🔥 Melting...')
            .setDescription('Melting iron... please wait 🔥')
            .setColor('Orange')
        ],
        components: []
      })

      setTimeout(async () => {
        await db.set(`raw_iron_${userId}`, 0)
        await db.add(`iron_ingot_${userId}`, currentRaw)

        const newIron = await db.get(`iron_ingot_${userId}`) || 0

        const resultEmbed = new EmbedBuilder()
          .setTitle('✅ Smelting Complete')
          .setDescription(
            `Successfully melted ${currentRaw} ${rawEmoji} into ${currentRaw} ${ingotEmoji}\n\n` +
            `Now you have: ${newIron} ${ingotEmoji}`
          )
          .setColor('Green')

        await interaction.editReply({
          embeds: [resultEmbed],
          components: []
        })
      }, 30000)
    })
  }
}
