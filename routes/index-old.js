const express = require('express');
const router = express.Router();
const cors = require('cors');
const venom = require('venom-bot');
const fs = require("fs");
const mime = require('mime-types');
const CryptoJS = require("crypto-js");
const server = require('http').Server(express);
const io = require('socket.io')(server);
const multer = require('multer');

io.origins('*:*')
server.listen(3500);
router.use(express.json({limit: '50mb'}));
router.use(express.urlencoded({limit: '50mb', extended: true, parameterLimit: 1000000}));
router.use(cors());

startVenom("sessionName");

/**
 * Inicializa o componente
 */
function startVenom(session){
    let conterQR = 1;
    const NautoClose = 60000;
    const OPTIONS = {
        headless: true,
        devtools: false,
        useChrome: false,
        debug: false,
        logQR: false,
        browserArgs: ['--no-sandbox'],
        refreshQR: 15000,
        autoClose: NautoClose,
        disableSpins: false
    };
    venom.create(session+'', (base64Qr, asciiQR) => {
        console.log(conterQR);
        if(conterQR > 1 && conterQR < 4 || conterQR == 16 || conterQR == 31 || conterQR == 46){
            exportQR(base64Qr, "upload/qrcode.json");
        }
        if(conterQR > 59){
            restartServer();
        }
        conterQR ++
    }, (statusFind) =>{
        io.local.emit('statusFind', statusFind);
    }, OPTIONS).then((client) => {
        start(client);
    }).catch((erro) => console.log(erro));
}

/**
 * Starta o objeto no cliente
 * @param {object} client Objeto client
 */
async function start(client) {
    io.local.emit('start', {'logado': true});

    // checando conexão
    io.on('connection', (socket) => {
        socket.on('checkConexaoPing', async (data) => {
            if(data.check){
                let conn = await client.getConnectionState();
                if(conn == 'CONNECTED'){
                    socket.emit('checkConexaoPong', conn);
                }else{
                    socket.emit('checkConexaoPong', conn);
                }
            }
        });
        // recebendo open da conversa e atualizando em tempo real
        socket.on('abriuConversaAgora', async (data) => {
            if(data.numero){
                let chatId = data.numero;
                if(chatId){
                    try {
                        let resp = await client.sendSeen(chatId+'@c.us');
                        if(resp){
                            io.emit('abriuConversaAgoraResp', {numero: data.numero});
                        }
                    }
            catch (e) {
                console.log(e);
                res.status(400).json({
                    message: 'Algo deu errado!'
                });
            }
                }
            }
        });

        // recebendo open da conversa e atualizando em tempo real
        socket.on('abriuGrupoAgora', async (data) => {
            if(data.numero){
                let chatId = data.numero;
                if(chatId){
                    try {
                        let resp = await client.sendSeen(chatId+'@g.us');
                        if(resp){
                            io.emit('abriuConversaAgoraResp', {numero: data.numero});
                        }
                    }
                    catch (e) {
                        console.log(e);
                        res.status(400).json({
                            message: 'Algo deu errado!'
                        });
                    }
                }
            }
        });
    });

    // autenticação
    router.get('/', function (req, res) {
        res.render('home')
    });

    // todos contatos
    router.get('/todoscontatos', async function (req, res) {
        try {
            let contacts = await client.getAllContacts();
            if(contacts){
                res.status(200).json(contacts);
            }else{

            }
        }
        catch (e) {
            console.log(e);
            res.status(400).json({message: 'Algo deu errado!'});
        }
    });

    // novo contato validar
    router.get('/novocontatovalidar', async function (req, res) {
        let chatId = req.query.numero;
        if(chatId){
            try {
                let profile = await client.getNumberProfile(chatId+'@c.us');
                if(profile){
                    res.status(200).json(profile);
                }else{
                    res.status(400).json({message: 'Algo deu errado!'});
                }
            }
            catch (e) {
                console.log(e);
                res.status(400).json({
                    message: 'Algo deu errado!'
                });
            }
        }else{
            res.status(400).json({message: 'Algo deu errado!'});
        }
    });

    // novo contato
    router.get('/novocontato', async function (req, res) {
        let chatId = req.query.numero;
        let msg = req.query.msg;
        if(chatId){
            try {
                let profile = await client.sendMessageToId(chatId+'@c.us', msg+'');
                res.status(200).json(profile);
            }
            catch (e) {
                console.log(e);
                res.status(400).json({
                    message: 'Algo deu errado!'
                });
            }
        }else{
            res.status(400).json({message: 'Algo deu errado!'});
        }
    });

    // ver perfil do chat
    router.get('/verperfil', async function (req, res) {
        let chatId = req.query.numero;
        if(chatId){
            try {
                let user = await client.getChat(chatId+'@c.us');
                res.status(200).json(user);
            }
            catch (e) {
                console.log(e);
                res.status(400).json({
                    message: 'Algo deu errado!'
                });
            }
        }else{
            res.status(400).json({message: 'Algo deu errado!'});
        }
    });

    // checando a conexão
    router.get('/conexao', async function (req, res) {
        try {
            let conn = await client.getConnectionState();
            res.status(200).json(conn);
        }
        catch (e) {
            console.log(e);
            res.status(400).json({
                message: 'Algo deu errado!'
            });
        }
    });

    // tudo sobre o perfil principal
    router.get('/me', async function (req, res) {
        try {
            let me = await client.getHostDevice();
            res.status(200).json(me);
        }
        catch (e) {
            console.log(e);
            res.status(400).json({
                message: 'Algo deu errado!'
            });
        }
    });

    // get perfil url
    router.get('/foto', async function (req, res) {
        let chatId = req.query.numero;
        let type = req.query.tipo;
        let sufixo;
        if(type != 'group'){
            sufixo = '@c.us';
        }else{
            sufixo = '@g.us';
        }
        try {
            let url = await client.getProfilePicFromServer(chatId+sufixo);
            res.status(200).json(url);
        }
        catch (e) {
            console.log(e);
            res.status(400).json({
                message: 'Algo deu errado!'
            });
        }
    });

    // conversas
    router.get('/conversas', async function (req, res) {
        try {
            let chats = await client.getAllChats();
            res.status(200).json(chats);
        }
        catch (e) {
            console.log(e);
            res.status(400).json({
                message: 'Algo deu errado!'
            });
        }
    });

    // conversas
    router.get('/conversascommsgs', async function (req, res) {
        try {
            let chats = await client.getAllChatsWithMessages();
            res.status(200).json(chats);
        }
        catch (e) {
            console.log(e);
            res.status(400).json({
                message: 'Algo deu errado!'
            });
        }
    });

    // carregar conversa e ultimas conversas
    router.get('/mensagens', async function (req, res) {
        let chatId = req.query.numero;
        await client.sendSeen(chatId+'@c.us');
        await client.openChat(chatId+'@c.us');
        setTimeout(async function(){
            if(chatId){
                try {
                    let retorno = await client.getAllMessagesInChat(chatId+'@c.us', true);
                    res.status(200).json(retorno);
                }
                catch (e) {
                    console.log(e);
                    res.status(400).json({
                        message: 'Algo deu errado!'
                    });
                }
            }else{
                res.status(400).json({message: 'Algo deu errado!'});
            }
        },800)
    });

    // carregar conversa as ultimas conversas group
    router.get('/mensagensgroup', async function (req, res) {
        let chatId = req.query.numero;
        await client.sendSeen(chatId+'@g.us');
        await client.openChat(chatId+'@g.us');
        setTimeout(async function(){
            if(chatId){
                try {
                    let retorno = await client.getAllMessagesInChat(chatId+'@g.us', true);
                    res.status(200).json(retorno);
                }
                catch (e) {
                    console.log(e);
                    res.status(400).json({
                        message: 'Algo deu errado!'
                    });
                }
            }else{
                res.status(400).json({message: 'Algo deu errado!'});
            }
        },800)
    });

    // abrir conversa e menssagens do wpp web
    router.get('/abrirconversa', async function (req, res) {
        let chatId = req.query.numero;
        if(chatId){
            try {
                let resp = await client.openChat(chatId+'@c.us');
                res.status(200).json(resp);
            }
            catch (e) {
                console.log(e);
                res.status(400).json({
                    message: 'Algo deu errado!'
                });
            }
        }else{
            res.status(400).json({message: 'Algo deu errado!'});
        }
    });

    // carregar conversa e mais um pouco de mensagem
    router.get('/carregarmaismensagens', async function (req, res) {
        let chatId = req.query.numero;
        let type = req.query.tipo;
        let sufixo;
        if(type != 'group'){
            sufixo = '@c.us';
        }else{
            sufixo = '@g.us';
        }
        if(chatId && type){
            try {
                await client.openChat(chatId+sufixo);
                await client.loadEarlierMessages(chatId+sufixo);
                setTimeout(async function(){
                    let resp = await client.getAllMessagesInChat(chatId+sufixo, true);
                    res.status(200).json(resp);
                },3000)
            }
            catch (e) {
                console.log(e);
                res.status(400).json({
                    message: 'Algo deu errado!'
                });
            }
        }else{
            res.status(400).json({message: 'Algo deu errado!'});
        }
    });

    // abrir conversas
    router.get('/visualizar', async function (req, res) {
        let chatId = req.query.numero;
        if(chatId){
            try {
                await client.sendSeen(chatId+'@c.us');
                res.status(200).json('ok');
            }
            catch (e) {
                console.log(e);
                res.status(400).json({
                    message: 'Algo deu errado!'
                });
            }
        }else{
            res.status(400).json({message: 'Algo deu errado!'});
        }
    });

    // mensagens
    router.get('/todasmensagens', async function (req, res) {
        let chatId = req.query.numero;
        if(chatId){
            try {
                let allMessages = await client.loadAndGetAllMessagesInChat(chatId+'@c.us', true);
                res.status(200).json(allMessages);
            }
            catch (e) {
                console.log(e);
                res.status(400).json({
                    message: 'Algo deu errado!'
                });
            }
        }else{
            res.status(400).json({message: 'Algo deu errado!'});
        }
    });

    // enviar mensagens
    router.get('/enviarmsg', async function (req, res) {
        let chatId = req.query.numero;
        let msg = req.query.msg.replace(/<br>/gi,"\n");
        if(chatId && msg){
            try {
                let resp = await client.sendText(chatId+'@c.us', ''+msg);
                res.status(200).json(resp);
            }
            catch (e) {
                console.log(e);
                res.status(400).json({
                    message: 'Algo deu errado!'
                });
            }
        }else{
            res.status(400).json({message: 'Algo deu errado!'});
        }
    });

    router.get('/enviarmsgreply', async function (req, res) {
        let chatId = req.query.numero;
        let msg = req.query.msg.replace(/<br>/gi,"\n");
        let replyid = req.query.replyid;
        let type = req.query.tipo;
        let sufixo;
        if(type != 'group'){
            sufixo = '@c.us';
        }else{
            sufixo = '@g.us';
        }
        if(chatId && msg && replyid && sufixo){
            try {
                let resp = await client.reply(chatId+sufixo, msg+'', replyid);
                res.status(200).json(resp);
            }
            catch (e) {
                console.log(e);
                res.status(400).json({
                    message: 'Algo deu errado!'
                });
            }
        }else{
            res.status(400).json({message: 'Algo deu errado!'});
        }
    });

    // enviar mensagens group
    router.get('/enviargroupmsg', async function (req, res) {
        let chatId = req.query.numero;
        let msg = req.query.msg.replace(/<br>/gi,"\n");
        if(chatId && msg){
            try {
                let resp = await client.sendText(chatId+'@g.us', ''+msg);
                res.status(200).json(resp);
            }
            catch (e) {
                console.log(e);
                res.status(400).json({
                    message: 'Algo deu errado!'
                });
            }
        }else{
            res.status(400).json({message: 'Algo deu errado!'});
        }
    });

    // pegar status do contato
    router.get('/status', async function (req, res) {
        let chatId = req.query.numero;
        if(chatId){
            try {
                let status = await client.getStatus(chatId+'@c.us');
                res.status(200).json(status);
                
            }
            catch (e) {
                console.log(e);
                res.status(400).json({
                    message: 'Algo deu errado!'
                });
            }
        }else{
            res.status(400).json({message: 'Algo deu errado!'});
        }
    });

    // descriptografar arquivo
    router.post('/desfile', async function (req, res) {
        let message = req.body;
        if(message){
            try {
                message.isMedia = true;
                let md5Hash = CryptoJS.MD5(''+message.filehash);
                let fileName = `file${md5Hash}.${mime.extension(message.mimetype)}`;
                let path = 'upload/'+fileName;
                if (fs.existsSync(path)) {
                    res.status(200).json({name : fileName});
                }else{
                    let buffer = await client.downloadFile(message);
                    fs.writeFile(path, buffer, function (err) {
                        if(err){
                            console.log(err);
                        }
                    });
                    res.status(200).json({name : fileName});
                }
            }
            catch (e) {
                console.log(e);
                res.status(400).json({
                    message: 'Algo deu errado!'
                });
            }
        }else{
            res.status(400).json({message: 'Algo deu errado!'});
        }
    });

    // enviar imagem
    router.post('/enviarimagem',(req, res) => {
        upload(req, res, async function(err) {
            if(err){
                res.status(400).json({success:false,message:err});
            } else{
                if(req.body.numero && req.files[0].filename){
                    try {
                        await client.sendImage(
                            req.body.numero+'@c.us',
                            req.files[0].destination+req.files[0].filename+'',
                            req.files[0].filename+''
                        );
                        res.status(200).json({success:true,message:"Imagem enviada com sucesso!", file: req.files, numero: req.body.numero});
                    }
                    catch (e) {
                        console.log(e);
                        res.status(400).json({
                            message: 'Algo deu errado!'
                        });
                    }
                }
            }
        });
    });

    // enviar documento
    router.post('/enviardoc',(req, res) => {
        upload(req, res, async function(err) {
            if(err){
                res.status(400).json({success:false,message:err});
            } else{
                if(req.body.numero && req.files[0].filename){
                    try {
                        let respo = await client.sendFile(
                            req.body.numero+'@c.us',
                            req.files[0].destination+req.files[0].filename+'',
                            req.files[0].originalname+''
                        );
                        if(!respo){
                            respo = 'nao retornou nada';
                        }
                        res.status(200).json({success:true,message:"Documento enviado com sucesso!", file: req.files, numero: req.body.numero, resp: respo});
                    }
                    catch (e) {
                        console.log(e);
                        res.status(400).json({
                            message: 'Algo deu errado!'
                        });
                    }
                }
            }
        });
    });

    // enviar audio
    router.post('/enviaraudio', async (req, res) => {
        let json = req.body;
        if(json.numero && json.audio_data){
            try {
                await client.sendFileFromBase64(
                    json.numero+'@c.us',
                    json.audio_data,
                    'audio_' + Date.now() +'.wav',
                    ''
                );
                res.status(200).json({success:true,message:"Audio enviado com sucesso!"});
            }
            catch (e) {
                console.log(e);
                res.status(400).json({
                    message: 'Algo deu errado!'
                });
            }
        } else{
            res.status(400).json({success:false,message:'Post imcompleto, necessita revisão!'});
        }
    });

    // Monitora as mensagens
    client.onMessage( async (message) => {
        if (message.body === '!Oi' || message.body === '!oi') {
            var message2 = 'Olá 👋, em que posso te ajudar?'
            var resp = await client.sendText(message.from, message2);
            io.local.emit('messagesent', {msg:message2,num:message.from, id:resp});
        }
        if (message.isMedia) {
            let md5Hash = CryptoJS.MD5(''+message.filehash);
            let fileName = `file${md5Hash}.${mime.extension(message.mimetype)}`;
            let path = 'upload/'+fileName;
            if (!fs.existsSync(path)) {
                let buffer = await client.downloadFile(message);
                fs.writeFile(path, buffer, function (err) {
                    if(err){
                        console.log(err);
                    }
                });
            }
            io.local.emit('message', message);
        }else{
            io.local.emit('message', message);
        }
    });

    // Monitora o estado da conexao
    client.onStateChange( async (state) => {
        io.local.emit('stateChange', state);
        const conflits = [
            venom.SocketState.CONFLICT,
            venom.SocketState.UNPAIRED,
            venom.SocketState.UNLAUNCHED,
            venom.SocketState.UNPAIRED_IDLE
        ];
        if (conflits.includes(state)) {
            client.useHere();
            if(state == 'UNPAIRED' || state == 'UNPAIRED_IDLE'){
                restartServer();
            }
        }
    });

    // Listen to ack's
    client.onAck(ack => {
        io.local.emit('ack', ack);
    });

    process.on('SIGINT', function() {
        client.close();
    });
    
    // funcao para enviar mensagem de 3 em 3 minutos em um grupo para evitar timeout
    let counterInterval = 0;
    async function intervalFunc() {
        let resp  = await client.sendText('5531920023565-1594382064@g.us', 'Servidor em execução há '+counterInterval+' minutos');
        if(!resp){
            let InviteCode = 'https://chat.whatsapp.com/Hpqm8xF9tOwHztHZY8OOgQ';
            await client.joinGroup(InviteCode);
            setTimeout(async () => { 
                await client.sendText('5531920023565-1594382064@g.us', 'Servidor em execução há '+counterInterval+' minutos');
            }, 3000);
        }
        console.log('Servidor em execução há '+counterInterval+' minutos')
        counterInterval = counterInterval + 3;
    }
    setTimeout(() => { 
        intervalFunc();
    }, 3000);
    setInterval(intervalFunc, 180000);
}

/**
 * É preciso usar npm install -g pm2
 * com comando pm2 start index.js
 */
function restartServer() {
    process.exit(1);
}


/**
 * Callback para gerar e capturar o qrcode
 * @param {*} qrCode qrcode em base64
 * @param {*} path caminho para a exportacao
 */
function exportQR(qrCode, path) {
    io.local.emit('qrcode', { retorno: 'change' });
    fs.writeFileSync(path, JSON.stringify({'qrcode':qrCode}));
}

/**
 * Funcao responsavel por upload de arquivos
 */
var Storage = multer.diskStorage({
    destination: function(req, file, callback) {
        callback(null, "upload/enviar/");
    },
    filename: function(req, file, callback) {
        callback(null, file.fieldname + "_" + Date.now() + "_" + file.originalname.replace(/ /gi, '_'));
    }
});
var upload = multer({
    storage: Storage
}).array("doc", 1);

module.exports = router;