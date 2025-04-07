const { Client, Collection, GatewayIntentBits } = require('discord.js')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

client.commands = new Collection()
const foldersPath = path.join(__dirname, 'commands')
const commandFolders = fs.readdirSync(foldersPath)

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder)
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'))
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file)
    const command = require(filePath)
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command)
    }
  }
}

client.once('ready', () => {
  console.log(`MinerX bot iniciado como ${client.user.tag}`)
  require('./deployslashcommands.js')
})

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return
  const command = client.commands.get(interaction.commandName)
  if (!command) return
  try {
    await command.execute(interaction)
  } catch (error) {
    console.error(error)
    await interaction.reply({ content: 'Ocurrió un error al ejecutar el comando.', ephemeral: true })
  }
})

client.login(process.env.TOKEN)
