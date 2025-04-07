import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js'

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Responde con pong y botón'),

  async execute(interaction) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ping_button')
        .setLabel('Haz clic')
        .setStyle(ButtonStyle.Primary)
    )

    await interaction.reply({
      content: '¡Presiona el botón!',
      components: [row]
    })

    const collector = interaction.channel.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 15000
    })

    collector.on('collect', async i => {
      if (i.customId === 'ping_button') {
        if (i.user.id !== interaction.user.id) {
          return i.reply({ content: 'Este botón no es para ti.', ephemeral: true })
        }

        await i.update({
          content: '¡Botón presionado!',
          components: []
        })
      }
    })
  }
}
