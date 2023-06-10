const fs = require('node:fs');
const path = require('node:path');
const axios = require('axios');
const { Client, Collection, Events, GatewayIntentBits, EmbedBuilder, Embed } = require('discord.js');
const { token, channelId, messageId } = require('./config.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

client.once(Events.ClientReady, () => {
	console.log('Ready!');
});

async function displayTopMods() {
  setInterval(async () => {
    const response = await axios.get('https://mstats.astromods.xyz/top-mods');
    const data = response.data;

    const channel = client.channels.cache.get(channelId);
    console.log(channel);
    const message = await channel.messages.fetch(messageId);
    channel.messages.fetch(messageId);

    const installedMods = data.mods.map(mod => `${mod.mod} (${mod.totalCount})`).join('\n');

    const usedResponse = await axios.get('https://mstats.astromods.xyz/top-mods?sort=enabled');
    const usedData = usedResponse.data;
    const usedMods = usedData.mods.map(mod => `${mod.mod} (${mod.enabledCount})`).join('\n');

    const updatedEmbed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('Top Mods')
      .setURL('https://astromods.xyz/')
      .addFields(
        { name: 'Top Installed Mods', value: installedMods, inline: true },
        { name: 'Top Used Mods', value: usedMods, inline: true },
      )
      .setTimestamp();

    message.edit({ embeds: [updatedEmbed] });
  }, 60000);
}

displayTopMods();

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = client.commands.get(interaction.commandName);

	if (!command) return;

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
});

client.login(token);