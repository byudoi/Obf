import 'dotenv/config';
import {
    Client, Intents, MessageButton, MessageActionRow, Message, MessageAttachment,
} from 'discord.js';
import '@colors/colors';
import { v4 as uuid } from 'uuid';
import tmp from 'tmp';
import Axios from 'axios';
import fs from 'fs';
import logger from './logger';
import obfuscate from './obfuscate';

const token = process.env.DISCORD_TOKEN;
const MAX_SIZE = 40000;

const TAG = '-- obfuscated by y8y9 obf https://discord.gg/2DQbVrXJ8A\n';

logger.log('Bot is starting ...');

const client = new Client({
    intents: [
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
    ],
    partials: ['CHANNEL'],
});

client.login(token);

client.once('ready', () => {
    logger.log(`Logged in as ${(client.user?.tag || 'Unknown').cyan}`);
});

interface ButtonInfo {
  url: string;
  preset: string;
  tag: string;
  message: Message,
  buttonIds: string[],
}

const buttonInfos = new Map<string, ButtonInfo>();

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) {
        return;
    }

    const buttonInfo = buttonInfos.get(interaction.customId);
    if (!buttonInfo) {
        interaction.update({
            embeds: [
                {
                    title: 'y8y9 Obf',
                    description: 'Something went wrong. Please try again.',
                    color: '#ff8800',
                },
            ],
            components: [],
        });
        return;
    }

    buttonInfo.buttonIds.forEach((id) => {
        buttonInfos.delete(id);
    });

    const { message } = buttonInfo;
    interaction.update({});

    console.log(`${(buttonInfo.tag || 'Unknown User').cyan} -> ${buttonInfo.url} @ ${buttonInfo.preset}`);

    await message.edit({
        embeds: [
            {
                title: 'y8y9 Obf',
                description: `ðŸ”„ Uploading your file ...\nðŸ”„ Obfuscating your file using ${buttonInfo?.preset} Preset ...\nðŸ”„ Downloading your file ...`,
                color: '#ff8800',
            },
        ],
        components: [],
    });

    const tmpFile = tmp.fileSync({ postfix: '.lua' });

    const response = await Axios({
        method: 'GET',
        url: buttonInfo.url,
        responseType: 'stream',
    });

    if (response.headers['content-length'] && Number.parseInt(response.headers['content-length'], 10) > MAX_SIZE) {
        message.edit({
            embeds: [
                {
                    title: 'y8y9 Obf',
                    description: 'The max filesize is 40KB.',
                    color: '#ff0000',
                },
            ],
            components: [],
        });
        return;
    }

    response.data.pipe(fs.createWriteStream(tmpFile.name));

    try {
        await new Promise<void>((resolve, reject) => {
            response.data.on('end', () => { resolve(); });
            response.data.on('error', () => { reject(); });
        });
    } catch (e) {
        message.edit({
            embeds: [
                {
                    title: 'y8y9 Obf',
                    description: 'Upload failed! Please try again.',
                    color: '#ff0000',
                },
            ],
            components: [],
        });
        return;
    }

    await message.edit({
        embeds: [
            {
                title: 'y8y9 Obf',
                description: `âœ… Uploading your file ...\nðŸ”„ Obfuscating your file using ${buttonInfo?.preset} Preset ...\nðŸ”„ Downloading your file ...`,
                color: '#ff8800',
            },
        ],
        components: [],
    });

    let outFile;
    try {
        outFile = await obfuscate(tmpFile.name, buttonInfo.preset);
    } catch (e) {
        message.edit({
            embeds: [
                {
                    title: 'y8y9 Obf',
                    description: `Obfuscation failed:\n${e}`,
                    color: '#ff0000',
                },
            ],
            components: [],
        });
        return;
    }

    await message.edit({
        embeds: [
            {
                title: 'y8y9 Obf',
                description: `âœ… Uploading your file ...\nâœ… Obfuscating your file using ${buttonInfo?.preset} Preset ...\nðŸ”„ Downloading your file ...`,
                color: '#ff8800',
            },
        ],
        components: [],
    });

    // Leer el archivo obfuscado y agregar el tag al inicio
    const obfuscatedContent = fs.readFileSync(outFile.name, 'utf8');
    const taggedContent = TAG + obfuscatedContent;
    const taggedFile = tmp.fileSync({ postfix: '.lua' });
    fs.writeFileSync(taggedFile.name, taggedContent, 'utf8');

    const attachment = new MessageAttachment(taggedFile.name, 'obfuscated.lua');
    const fileMessage = await message.channel.send({
        files: [attachment],
    });
    const url = fileMessage.attachments.first()?.url;
    if (!url) {
        message.edit({
            embeds: [
                {
                    title: 'y8y9 Obf',
                    description: 'Download failed! Please try again.',
                    color: '#ff0000',
                },
            ],
            components: [],
        });
        return;
    }
    fileMessage.delete();

    await message.edit({
        embeds: [
            {
                title: 'y8y9 Obf',
                description: `âœ… Uploading your file ...\nâœ… Obfuscating your file using ${buttonInfo?.preset} Preset ...\nâœ… Downloading your file ...\n\nðŸ”— [Download](${url})`,
                color: '#00ff00',
            },
        ],
        components: [],
    });

    outFile.removeCallback();
    taggedFile.removeCallback();
    tmpFile.removeCallback();
});

client.on('messageCreate', async (message) => {
    if (!message.author.bot) {
        const file = message.attachments.first()?.url;
        if (!file) {
            message.reply('Please upload a file!');
            return;
        }

        const buttonIds = new Array(3).fill(0).map(() => uuid());

        const row = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId(buttonIds[0])
                    .setLabel('Weak')
                    .setStyle('SUCCESS'),
                new MessageButton()
                    .setCustomId(buttonIds[1])
                    .setLabel('Medium')
                    .setStyle('PRIMARY'),
                new MessageButton()
                    .setCustomId(buttonIds[2])
                    .setLabel('Strong')
                    .setStyle('DANGER'),
            );

        const content = 'Select the Preset to use:';

        const msg = await message.reply({
            embeds: [{
                title: 'y8y9 Obf',
                color: '#ff8800',
                description: content,
            }],
            components: [row],
        });

        buttonInfos.set(buttonIds[0], {
            url: file,
            preset: 'Weak',
            tag: message.author.tag,
            message: msg,
            buttonIds,
        });
        buttonInfos.set(buttonIds[1], {
            url: file,
            preset: 'Medium',
            tag: message.author.tag,
            message: msg,
            buttonIds,
        });
        buttonInfos.set(buttonIds[2], {
            url: file,
            preset: 'Strong',
            tag: message.author.tag,
            message: msg,
            buttonIds,
        });
    }
});
    
