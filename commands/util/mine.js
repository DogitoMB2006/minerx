const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } = require('discord.js')
const { QuickDB } = require('quick.db')
const path = require('path')
const fs = require('fs')
const activeMiners = new Set();
const db = new QuickDB()

const ores = JSON.parse(fs.readFileSync(path.join(__dirname, '../../utils/ores.json'), 'utf8'))
const world = JSON.parse(fs.readFileSync(path.join(__dirname, '../../utils/world.json'), 'utf8'))
const pickaxes = JSON.parse(fs.readFileSync(path.join(__dirname, '../../utils/pickaxes.json'), 'utf8'))

const { createMineSession } = require('../../mining/minelogic')
const { getRandomChest, getChestReward, applyReward } = require('../../utils/chestUtils')

const rarityChances = {
  common: 50,
  uncommon: 30,
  rare: 20,
  epic: 2,
  legendary: 1
}

const getRandomOre = (allowedOres) => {
  const roll = Math.random() * 100
  const valid = allowedOres.filter(ore => {
    const chance = rarityChances[ore.rarity] || 0
    return roll <= chance
  })

  if (valid.length > 0) {
    return valid[Math.floor(Math.random() * valid.length)]
  }

  return allowedOres.find(o => o.rarity === 'common') || allowedOres[0]
}

// Generate a cave map with only ores (chests will be handled separately)
const generateCaveMap = (allowedOres, caveSize) => {
  const map = [];
  
  for (let i = 0; i < caveSize; i++) {
    // Regular ore
    map.push(getRandomOre(allowedOres));
  }
  
  return map;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mine')
    .setDescription('Start mining in the cave!'),

  async execute(interaction) {
    const userId = interaction.user.id
    const username = interaction.user.username
    const userWorld = await db.get(`world_${userId}`) || 'overworld'
    const currentPickaxeId = await db.get(`pickaxe_${userId}`) || 1
    const pickaxe = pickaxes.find(p => p.id === currentPickaxeId)
    const pickaxeEmoji = pickaxe.emoji

    if (activeMiners.has(userId)) {
      return interaction.reply({
        content: "⛏️ You're already mining! Please finish your current session.",
        ephemeral: true
      });
    }
    
    activeMiners.add(userId);

    try {
      const allowedOres = ores.filter(o => pickaxe.canMine.includes(o.name))
      const minedEmoji = '⬛'
      const caveSize = 9

      // Generate cave map with potential chests
      const caveMap = generateCaveMap(allowedOres, caveSize);

      let position = 0
      const session = createMineSession(userId, username, interaction)

      const getCaveView = () => {
        return caveMap.map((ore, i) => {
          if (i < position) return minedEmoji
          if (i === position) return pickaxeEmoji
          return ore.emoji
        }).join(' ')
      }

      const getEmbed = () => {
        return new EmbedBuilder()
          .setTitle('⛏️ Mining Time')
          .setDescription(`${getCaveView()}\n\nUsing pickaxe: ${pickaxe.emoji}`)
          .setColor('Grey')
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('mine_button')
          .setLabel('Mine')
          .setStyle(ButtonStyle.Primary)
      )

      const msg = await interaction.reply({
        embeds: [getEmbed()],
        components: [row],
        fetchReply: true
      })

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30000
      });
      
      // This handles when the collector times out
      collector.on('end', () => {
        activeMiners.delete(userId);
      });
      
      collector.on('collect', async i => {
        if (i.customId !== 'mine_button') return;
        if (i.user.id !== interaction.user.id) {
          return i.reply({ content: 'This button is not for you.', ephemeral: true });
        }
      
        const currentOre = caveMap[position];
        // Handle regular ore mining
        await session.logOre(currentOre.name);
        
        position++;
      
        if (position >= caveSize) {
          const coins = session.getCoins();
          await db.add(`botcoins_${userId}`, coins);
          
          // Check if a chest should appear at the end of mining
          const foundChest = getRandomChest();
          
          // If a chest is found, generate reward and apply it
          if (foundChest) {
            const reward = getChestReward(foundChest);
            const rewardDescription = await applyReward(userId, reward);
            
            // Update the session with the chest information
            session.setChestFound(foundChest, rewardDescription);
            
            // Announce the chest discovery to the channel
            await interaction.followUp({
              content: `🎁 ${username} found a ${foundChest.emoji} ${foundChest.name} after mining and got ${rewardDescription}!`,
              ephemeral: false
            });
          }
      
          const finalEmbed = new EmbedBuilder()
            .setTitle('✅ Mining Complete')
            .setDescription('You reached the end of the cave!\n\nHere\'s what you mined:')
            .addFields(session.getSummaryFields())
            .setColor('Green');
          
          // Remove user from activeMiners when they complete mining
          activeMiners.delete(userId);
          
          return i.update({ embeds: [finalEmbed], components: [] });
        }
      
        await i.update({
          embeds: [getEmbed()],
          components: [row]
        });
      });
    } catch (error) {
      // If there's an error, make sure to remove the user from activeMiners
      activeMiners.delete(userId);
      console.error('Error in mine command:', error);
      return interaction.reply({ 
        content: 'An error occurred while mining. Please try again.', 
        ephemeral: true 
      });
    }
  }
}