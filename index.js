const { Client, Util } = require('discord.js');
const { TOKEN, PREFIX, GOOGLE_API_KEY } = require('./config');
const YouTube = require('simple-youtube-api');
const ytdl = require('ytdl-core');
const Discord = require('discord.js');

const client = new Client({disableEveryone: true });

const youtube = new YouTube(GOOGLE_API_KEY);

const queue = new Map();

require('http').createServer().listen(3000)

client.on('warn', console.warn);

client.on('error', console.error);

client.on('ready', () => console.log('FBot Online'));

client.on('disconnect', () => console.log('FBot Disconnected'));

client.on('reconnecting', () => console.log('FBot Reconnecting'));

client.on('message', async message => {
    if(message.author.bot) return undefined;
    if(!message.content.startsWith(PREFIX)) return undefined;

    const args = message.content.split(' ');
    const searchString = args.slice(1).join(' ');
    const url = args[1] ? args[1].replace(/<(.+)>/g, '$1'): '';
    const serverQueue = queue.get(message.guild.id);

    let command = message.content.toLowerCase().split(' ')[0];
    command = command.slice(PREFIX.length)

    if(command === 'play' || command === 'p') {
        const voiceChannel = message.member.voiceChannel;
        if(!voiceChannel) return message.channel.send(':x: 음성 채널에서 음악을 재생하기 위해서는 음악 채널에 우선 있어야 합니다.');
        const permissions = voiceChannel.permissionsFor(message.client.user);
        if(!permissions.has('CONNECT')) {
            return message.channel.send(':x: 해당 음성 채널에 연결할 수 없습니다. 정확한 권한이 봇에 있는지 확인해주세요!');
        }
        if(!permissions.has('SPEAK')) {
            return message.channel.send(':x: 해당 음성 채널에 연결할 수 없습니다. 정확한 권한이 봇에 있는지 확인해주세요!');
        }

        if(url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
            const playlist = await youtube.getPlaylist(url);
            const videos = await playlist.getVideos();
            for (const video of Object.values(videos)) {
                const video2 = await youtube.getVideoByID(video.id);
                await handleVideo(video2, message, voiceChannel, true);
            }
            return message.channel.send(`:white_check_mark: 유튜브 재생목록 **${playlist.title}** 이 음악 재생목록에 추가되었습니다!`);
        } else {
            try {
                var video = await youtube.getVideo(url);
            } catch (error) {
                try {
                    var videos = await youtube.searchVideos(searchString, 10);
                    let index = 0;
                    messaeg.channel.send(`
__**검색 결과:**__
${videos.map(video2 => `**${++index} -** ${video2.title}`).join('\n')}
다음 검색 결과 중 1부터 10까지의 수로 원하는 노래를 선택해 주세요.
                    `);

                    try {
                        var response = await message.channel.awaitMessages(msg2 => msg2.content > 0 && msg2.content < 11, {
                            maxMatches: 1,
                            time: 10000,
                            errors: ['time']
                        });
                    } catch (err) {
                        console.error(err);
                        return message.channel.send(':x: 부정확한 값을 입력하거나 값이 입력되지 않았습니다. 음악 선택을 취소합니다.');
                    }
                    const videoIndex = parseInt(response.first().content);
                    var video = await youtube.getVideoByID(videos[videoIndex - 1].id);
                } catch (err) {
                    console.error(err);
                    return message.channel.send(':x: 검색 결과를 불러올 수 없습니다.');
                }
            }
            return handleVideo(video, message, voiceChannel);
        }
    }
    else if(command === 'skip' || command === 's') {
        
    }
    else if(command === 'stop' || command === 'st') {

    }
    else if(command === 'lenny') {
        message.channel.send('( ͡° ͜ʖ ͡°)');
        return;
    }
    else if(command === 'lennyd') {
        message.channel.send('( ͡° ͜ʖ ͡°)');
        message.delete();
        return;
    }
});

async function handleVideo(video, message, voiceChannel, playlist = false) {
    const serverQueue = queue.get(message.guild.id);
    console.log(video);
    const song = {
        id: video.id,
        title: Util.escapeMarkdown(video.title),
        url: `https://www.youtube.com/watch?v=${video.id}`
    };
    if(!serverQueue){
        const queueConstruct = {
            textChannel = message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 5,
            playing: true
        };
        queue.set(message.guild.id, queueConstruct);

        queueConstruct.songs.push(song);

        try{
            var connection = await voiceChannel.join();
            queueConstruct.connection = connection;
            play(message.guild, queueConstruct.songs[0]);
        }catch(error){
            console.error(error);
            queue.delete(message.guild.id);
            return message.channel.send(`:x: 해당 오류로 음성 채널에 접근할 수 없습니다: ${error}`);
        }
    } else {
        serverQueue.songs.push(song);
        console.log(serverQueue.songs);
        if(playlist) return undefined;
        else return message.channel.send(`:white_check_mark: **${song.title}** 이 재생 목록에 추가되었습니다!`);
    }
    return undefined;
}

function play(guild, song) {
    const serverQueue = queue.get(guild.id);

    if(!song) {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        return;
    }
    console.log(serverQueue.songs);
    
    const dispatcher = serverQueue.connection.playStream(ytdl(song.url)).on('end', reason => {
            if(reason === 'Stream is not generating quickly enough.') console.log('Song ended');
            else console.log(reason);
            serverQueue.songs.shift();
            play(guild, serverQueue.songs[0]);
        }).on('error', error => console.error(error));
        var volval;
        if(serverQueue.volume == 1) {
            volval = `○──── :loud_sound:`
        }
        if (serverQueue.volume == 2) {
            volval = `─○─── :loud_sound:`
        }
        if (serverQueue.volume == 3) {
            volval = `──○── :loud_sound:`
        }
        if (serverQueue.volume == 4) {
            volval = `───○─ :loud_sound:`
        }
        if (serverQueue.volume == 5) {
            volval = `────○ :loud_sound:`
        }
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    var NowEmbed = new Discord.RichEmbed()
        .setColor(0x7FFF00)
        .addField('=========================================================', `
        현재 재생중인 곡은 **${song.title}** 입니다.
:white_circle:─────────────────────────────────────────── 
◄◄⠀▐▐ ⠀►►⠀⠀　　${volval}    　　 :gear: ❐ ⊏⊐ 
=========================================================`)
        .setFooter('FBot 노래 재생중')
        .setTimestamp();
        

    serverQueue.textChannel.send(NowEmbed);
}