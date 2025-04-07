import { Client, Collection, GatewayIntentBits } from 'discord.js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'url'
import 'dotenv/config'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const client = new Client({ intents: [GatewayIntentBits.Guilds] })
client.commands = new Collection()

const foldersPath = path.join(__dirname, 'commands')
const commandFolders = fs.readdirSync(foldersPath)

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder)
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'))
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file)
    const command = (await import(`file://${filePath}`)).default
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command)
    }
  }
}

client.on('ready', () => {
  console.log(`MinerX bot iniciado como ${client.user.tag}`)
})

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return
  const command = client.commands.get(interaction.commandName)
  if (!command) return
  await command.execute(interaction)
})
import('./deployslashcommands.js')

client.login(process.env.TOKEN)
