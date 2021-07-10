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
const path = require('path');
const appDir = path.dirname(require.main.filename);

io.origins('*:*')
server.listen(3500);
router.use(express.json({limit: '50mb'}));
router.use(express.urlencoded({limit: '50mb', extended: true, parameterLimit: 1000000}));
router.use(cors());

var clientsArray = [];
var users = [];
var funcoesSocket = {};
// checando conexão
io.on('connection', (socket) => {
    function joinRoom(socket, room) {
        if (socket.room) {
            socket.leave(socket.room);
        }
        socket.join(room);
        socket.room = room;
        // console.info(socket.id + ' joined room ' + room, socket.room);
    }

    socket.on('room', function(room){
        joinRoom(socket, room);
    });

    socket.on("join", function(data){
        console.log("Conectou: " + data.name);
        users[socket.id] = {};
        users[socket.id]['name'] = data.name;
        users[socket.id]['sessaoname'] = data.sessaoname;
        socket.emit(users[socket.id].sessaoname).emit("updateUser", "Você se conectou ao servidor.");
        socket.broadcast.to(users[socket.id].sessaoname).emit("update", data.name + " ingressou no servidor.")
    });

    socket.on("disconnect", function(){
        if(users[socket.id]){
            console.log("Desconectou: " + users[socket.id].name);
            socket.broadcast.to(users[socket.id].sessaoname).emit("updateUser", users[socket.id].name + " saiu do servidor.");
        }
        delete users[socket.id];
    });

    socket.on('checkConexaoPing', async (data) => {
        if(data.check){
            if(users[socket.id]){
                let conn = await clientsArray[users[socket.id].sessaoname].getConnectionState();
                if(conn == 'CONNECTED'){
                    socket.emit('checkConexaoPong', conn);
                }else{
                    socket.emit('checkConexaoPong', conn);
                }
            }
        }
    });

    // recebendo open da conversa e atualizando em tempo real
    socket.on('abriuConversaAgora', async (data) => {
        if(data.numero){
            let chatId = data.numero;
            if(chatId){
                try {
                    if(users[socket.id]){
                        let resp = await clientsArray[users[socket.id].sessaoname].sendSeen(chatId+'@c.us');
                        if(resp){
                            io.emit('abriuConversaAgoraResp', {numero: data.numero});
                        }
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
                    if(users[socket.id]){
                        let resp = await clientsArray[users[socket.id].sessaoname].sendSeen(chatId+'@g.us');
                        if(resp){
                            io.emit('abriuConversaAgoraResp', {numero: data.numero});
                        }
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

    funcoesSocket = {
        //emitindo mensagem que qrcode mudou 
        qrCode : () => {
            if(socket.room){
                io.to(socket.room).emit('qrcode', { retorno: 'change' });
            }
        },
        //mudando statusFind
        statusFind : (data) => {
            if(socket.room){
                io.to(socket.room).emit('statusFind', data);
            }
        },
        //detectando start do servidor
        start : (data) => {
            console.log('Start message')
            if(socket.room){
                io.to(socket.room).emit('start', data);
            }
        },
        //enviando mensagem como emissor
        messagesent : (data) => {
            if(socket.room){
                io.to(socket.room).emit('messagesent', data);
            }
        },
        //recebendo mensagens
        message : (data) => {
            console.log('message')
            if(socket.room){
                io.to(socket.room).emit('message', data);
            }
        },
        //mudando status
        stateChange : (data) => {
            if(socket.room){
                io.to(socket.room).emit('stateChange', data);
            }
        },
        //webhook para detecção de alteracoes de status nas mensagens
        ack : (data) => {
            console.log('message')
            if(socket.room){
                io.to(socket.room).emit('ack', data);
            }
        }
    }
});

// autenticação
router.get('/autenticacao/:slug/', async function (req, res) {
    const session = req.params.slug;
    if(session && !clientsArray[session]){
        clientsArray[session] = true;
        // criando diretorios
        var dir = appDir+'/upload/'+session;
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }
        var dir2 = appDir+'/upload/'+session+'enviar';
        if (!fs.existsSync(dir2)){
            fs.mkdirSync(dir2);
        }
        var dir3 = appDir+'/upload/'+session+'/qrcode.json';
        fs.writeFileSync(dir3, '');
        await startVenom(session);
        /**
         * Inicializa o componente
         */
        async function startVenom(session){
            let conterQR = 1;
            const NautoClose = 60000;
            const argsBrowser = [
                '--log-level=3',
                '--no-default-browser-check',
                '--disable-site-isolation-trials',
                '--no-experiments',
                '--ignore-gpu-blacklist',
                '--ignore-certificate-errors',
                '--ignore-certificate-errors-spki-list',
                '--disable-gpu',
                '--disable-extensions',
                '--disable-default-apps',
                '--enable-features=NetworkService',
                '--disable-setuid-sandbox',
                '--no-sandbox',
                '--unhandled-rejections=strict',
                // Extras
                '--disable-webgl',
                '--disable-threaded-animation',
                '--disable-threaded-scrolling',
                '--disable-in-process-stack-traces',
                '--disable-histogram-customizer',
                '--disable-gl-extensions',
                '--disable-composited-antialiasing',
                '--disable-canvas-aa',
                '--disable-3d-apis',
                '--disable-accelerated-2d-canvas',
                '--disable-accelerated-jpeg-decoding',
                '--disable-accelerated-mjpeg-decode',
                '--disable-app-list-dismiss-on-blur',
                '--disable-accelerated-video-decode',
            ];
            const OPTIONS = {
                headless: true,
                devtools: false,
                useChrome: false,
                debug: false,
                logQR: false,
                browserArgs: argsBrowser,
                refreshQR: 15000,
                autoClose: NautoClose,
                disableSpins: true
            };
            clientsArray[session] = await venom.create(session, async (base64Qr, asciiQR) => {
                console.log(conterQR);
                if(conterQR > 0 && conterQR < 4 || conterQR == 16 || conterQR == 31 || conterQR == 46){
                    exportQR(base64Qr, "upload/"+ session +"/qrcode.json");
                }
                if(conterQR > 59){
                    delete clientsArray[session];
                }
                conterQR++
            }, (statusFind) =>{
                funcoesSocket.statusFind(statusFind);
            }, OPTIONS).catch((erro) => console.log(erro));
            if(clientsArray[session] != true && clientsArray[session] != false && clientsArray[session]){
                await start(clientsArray[session], session);
                res.status(200).json({message: 'Autenticado'});
            }else{
                delete clientsArray[session];
                res.status(200).json({message: 'Error'});
            }
        }
    }else{
        if(clientsArray[session] != true && clientsArray[session] != false && clientsArray[session]){
            res.status(200).json({message: 'Autenticado'});
        }else{
            delete clientsArray[session];
            res.status(200).json({message: 'Error'});
        }
    }
});


/**
 * Starta o objeto no cliente
 * @param {object} client Objeto client
 */
async function start(client, session) {
    console.log('Start Cliente');
    funcoesSocket.start({'logado': true});

    // autenticação
    router.get(`/${session}`, function (req, res) {
        res.render('home')
    });

    // todos contatos
    router.get(`/${session}/todoscontatos`, async function (req, res) {
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
    router.get(`/${session}/novocontatovalidar`, async function (req, res) {
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
    router.get(`/${session}/novocontato`, async function (req, res) {
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
    router.get(`/${session}'/verperfil`, async function (req, res) {
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
    router.get(`/${session}/conexao`, async function (req, res) {
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
    router.get(`/${session}/me`, async function (req, res) {
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
    router.get(`/${session}/foto`, async function (req, res) {
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
    router.get(`/${session}/conversas`, async function (req, res) {
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
    router.get(`/${session}/conversascommsgs`, async function (req, res) {
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
    router.get(`/${session}/mensagens`, async function (req, res) {
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
    router.get(`/${session}/mensagensgroup`, async function (req, res) {
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
    router.get(`/${session}/abrirconversa`, async function (req, res) {
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
    router.get(`/${session}/carregarmaismensagens`, async function (req, res) {
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
    router.get(`/${session}/visualizar`, async function (req, res) {
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
    router.get(`/${session}/todasmensagens`, async function (req, res) {
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
    router.get(`/${session}/enviarmsg`, async function (req, res) {
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

    router.get(`/${session}/enviarmsgreply`, async function (req, res) {
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
    router.get(`/${session}/enviargroupmsg`, async function (req, res) {
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
    router.get(`/${session}/status`, async function (req, res) {
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
    router.post(`/${session}/desfile`, async function (req, res) {
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
    router.post(`/${session}/enviarimagem`,(req, res) => {
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
    router.post(`/${session}/enviardoc`,(req, res) => {
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
    router.post(`/${session}/enviaraudio`, async (req, res) => {
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
        if (message.body.includes('Fala mano') || message.body.includes('fala mano')) { 
            var message2 = 'Mano!'
            var resp = await client.reply(message.from, message2, message.id.toString());
            var resp = await client.reply(message.from, "Tu é?");
            var resp = await client.reply(message.from, "KKKKk");
            funcoesSocket.messagesent({msg:message2,num:message.from, id:resp});
        }
        if (message.body === '!Oi' || message.body === '!oi') {
            var message2 = 'Olá 👋, em que posso te ajudar?'
            var resp = await client.sendText(message.from, message2);
            funcoesSocket.messagesent({msg:message2,num:message.from, id:resp});
        }
        if (message.isMedia) {
            let md5Hash = CryptoJS.MD5(''+message.filehash);
            let fileName = `file${md5Hash}.${mime.extension(message.mimetype)}`;
            let path = 'upload/'+session+fileName;
            if (!fs.existsSync(path)) {
                let buffer = await client.downloadFile(message);
                fs.writeFile(path, buffer, function (err) {
                    if(err){
                        console.log(err);
                    }
                });
            }
            funcoesSocket.message(message);
        }else{
            funcoesSocket.message(message);
        }
    });

    // Monitora o estado da conexao
    client.onStateChange( async (state) => {
        funcoesSocket.stateChange(state);
        const conflits = [
            venom.SocketState.CONFLICT,
            venom.SocketState.UNPAIRED,
            venom.SocketState.UNLAUNCHED,
            venom.SocketState.UNPAIRED_IDLE
        ];
        if (conflits.includes(state)) {
            client.useHere();
            if(state == 'UNPAIRED' || state == 'UNPAIRED_IDLE'){
                await clientsArray[session].killServiceWorker();
                await clientsArray[session].close();
                delete clientsArray[session];
            }
        }
    });

    // Listen to ack's
    client.onAck(ack => {
        console.log('ack', ack)
        funcoesSocket.ack(ack);
    });

    process.on('SIGINT', function() {
        clientsArray[session].close();
    });
    
    // funcao para enviar mensagem de 3 em 3 minutos em um grupo para evitar timeout
    // let counterInterval = 0;
    // async function intervalFunc() {
    //     let resp  = await client.sendText('5531920023565-1594382064@g.us', 'Servidor em execução há '+counterInterval+' minutos');
    //     if(!resp){
    //         let InviteCode = 'https://chat.whatsapp.com/Hpqm8xF9tOwHztHZY8OOgQ';
    //         await client.joinGroup(InviteCode);
    //         setTimeout(async () => { 
    //             await client.sendText('5531920023565-1594382064@g.us', 'Servidor em execução há '+counterInterval+' minutos');
    //         }, 3000);
    //     }
    //     console.log('Servidor em execução há '+counterInterval+' minutos')
    //     counterInterval = counterInterval + 3;
    // }
    // setTimeout(() => { 
    //     intervalFunc();
    // }, 3000);
    // setInterval(intervalFunc, 180000);
}

/**
 * É preciso usar npm install -g pm2
 * com comando pm2 start index.js
 */
// function restartServer() {
//     process.exit(1);
// }


/**
 * Callback para gerar e capturar o qrcode
 * @param {*} qrCode qrcode em base64
 * @param {*} path caminho para a exportacao
 */
function exportQR(qrCode, path) {
    funcoesSocket.qrCode();
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