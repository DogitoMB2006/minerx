import { REST, Routes } from 'discord.js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'url'
import 'dotenv/config'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const commands = []
const foldersPath = path.join(__dirname, 'commands')
const commandFolders = fs.readdirSync(foldersPath)

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder)
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'))
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file)
    const command = (await import(`file://${filePath}`)).default
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON())
    }
  }
}

const rest = new REST().setToken(process.env.TOKEN)

await rest.put(
  Routes.applicationCommands(process.env.CLIENT_ID),
  { body: commands }
)
