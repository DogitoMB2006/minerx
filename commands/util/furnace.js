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
    const rawGold = await db.get(`raw_gold_${userId}`) || 0
    const goldIngot = await db.get(`gold_ingot_${userId}`) || 0

    const getEmoji = (name) => ores.find(o => o.name === name)?.emoji || '🔹'

    const now = Date.now()
    const furnaceIron = await db.get(`furnace_${userId}_iron`)
    const furnaceGold = await db.get(`furnace_${userId}_gold`)

    const ironStatus = (furnaceIron && now < furnaceIron)
      ? `⏳ Melting iron... ready <t:${Math.floor(furnaceIron / 1000)}:R>`
      : `${getEmoji('raw_iron')} Raw Iron: ${rawIron}\n${getEmoji('iron_ingot')} Iron Ingots: ${ironIngot}`

    const goldStatus = (furnaceGold && now < furnaceGold)
      ? `⏳ Melting gold... ready <t:${Math.floor(furnaceGold / 1000)}:R>`
      : `${getEmoji('raw_gold')} Raw Gold: ${rawGold}\n${getEmoji('gold_ingot')} Gold Ingots: ${goldIngot}`

    const embed = new EmbedBuilder()
      .setTitle('🔥 Furnace')
      .setThumbnail('https://static.wikia.nocookie.net/minecraft_gamepedia/images/9/99/Furnace_%28S%29_JE4.png/revision/latest/scale-to-width/360?cb=20210111063232')
      .setDescription(
        `You currently have:\n\n${ironStatus}\n\n${goldStatus}`
      )
      .setColor('DarkGrey')

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('melt_iron')
        .setLabel('🧪 Melt Iron')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(Boolean(rawIron <= 0 || (furnaceIron && now < furnaceIron))),
      new ButtonBuilder()
        .setCustomId('melt_gold')
        .setLabel('🧪 Melt Gold')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(Boolean(rawGold <= 0 || (furnaceGold && now < furnaceGold)))
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

      let oreType = ''
      let rawKey = ''
      let resultKey = ''

      if (i.customId === 'melt_iron') {
        oreType = 'iron'
        rawKey = 'raw_iron'
        resultKey = 'iron_ingot'
      }

      if (i.customId === 'melt_gold') {
        oreType = 'gold'
        rawKey = 'raw_gold'
        resultKey = 'gold_ingot'
      }

      const rawAmount = await db.get(`${rawKey}_${userId}`) || 0
      if (rawAmount <= 0) {
        return i.reply({ content: `You have no ${rawKey} to melt.`, ephemeral: true })
      }

      const activeUntil = await db.get(`furnace_${userId}_${oreType}`)
      const now = Date.now()
      if (activeUntil && now < activeUntil) {
        const timestamp = `<t:${Math.floor(activeUntil / 1000)}:R>`
        return i.reply({ content: `Your furnace is currently in use. Please wait ${timestamp}`, ephemeral: true })
      }

      const finishAt = now + 30000
      await db.set(`furnace_${userId}_${oreType}`, finishAt)

      const meltingEmbed = new EmbedBuilder()
        .setTitle(`🔥 Melting ${oreType}...`)
        .setDescription(`Melting ${rawAmount} ${getEmoji(rawKey)} into ${getEmoji(resultKey)}...\nPlease wait 🔥`)
        .setColor('Orange')

      await i.update({ embeds: [meltingEmbed], components: [] })

      setTimeout(async () => {
        await db.set(`${rawKey}_${userId}`, 0)
        await db.add(`${resultKey}_${userId}`, rawAmount)
        await db.delete(`furnace_${userId}_${oreType}`)

        const resultTotal = await db.get(`${resultKey}_${userId}`) || 0

        const resultEmbed = new EmbedBuilder()
          .setTitle(`✅ Smelting Complete`)
          .setDescription(
            `Successfully melted ${rawAmount} ${getEmoji(rawKey)} into ${rawAmount} ${getEmoji(resultKey)}\n\n` +
            `Now you have: ${resultTotal} ${getEmoji(resultKey)}`
          )
          .setColor('Green')

        await interaction.editReply({ embeds: [resultEmbed], components: [] })
      }, 30000)
    })
  }
}
