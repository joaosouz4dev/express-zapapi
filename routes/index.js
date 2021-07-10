import express from 'express';
import http from 'http';
import wppconnect from '@wppconnect-team/wppconnect';
import { promises as fsp } from 'fs';
import fs from 'fs';
import mimetype from 'mime-types';
import crypto from 'crypto-js';
import multer from 'multer';
import axios from 'axios';
import qs from 'qs';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';
import socket from 'socket.io';
import path from 'path';
import chalk from 'chalk';
import fnSocket from '../controllers/fnsocket.js';

const token = '4D83A1B9A15FE8C3498F998E954DB';
var clientsArray = {},
    SessionValidator = {},
    users = {},
    reloads = {},
    sessionLoop = {},
    options = {
        browserWS: `ws://0.0.0.0:3050?token=${token}`,
        logQR: false,
        browserArgs: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--aggressive-cache-discard',
            '--hide-scrollbars',
            '--metrics-recording-only',
            '--mute-audio',
            '--no-first-run',
            '--no-zygote',
            '--safebrowsing-disable-auto-update',
            '--single-process',
            '--log-level=3',
            '--no-default-browser-check',
            '--disable-site-isolation-trials',
            '--no-experiments',
            '--ignore-ssl-errors',
            '--ignore-gpu-blacklist',
            '--ignore-certificate-errors',
            '--ignore-certificate-errors-spki-list',
            '--disable-gpu',
            '--disable-extensions',
            '--disable-default-apps',
            '--enable-features=NetworkService',
            // Extras
            '--disable-dev-shm-usage',
            '--disable-webgl',
            '--disable-threaded-animation',
            '--disable-threaded-scrolling',
            '--disable-in-process-stack-traces',
            '--disable-histogram-customizer',
            '--disable-extensions',
            '--disable-gl-extensions',
            '--disable-composited-antialiasing',
            '--disable-canvas-aa',
            '--disable-3d-apis',
            '--disable-accelerated-2d-canvas',
            '--disable-accelerated-jpeg-decoding',
            '--disable-accelerated-mjpeg-decode',
            '--disable-app-list-dismiss-on-blur',
            '--disable-accelerated-video-decode',
            '--disable-background-networking',
            '--disable-default-apps',
            '--disable-extensions',
            '--disable-sync',
            '--disable-translate',
            '--disable-cache',
            '--disable-application-cache',
            '--disable-offline-load-stale-cache',
            '--disable-web-security',
            '--disable-web-security',
            '--disk-cache-size=0'
        ],
        disableSpins: true,
        disableWelcome: true,
        disableLogs: true
    },
    activelog = false;

const app = express();
const router = express.Router();
const server = http.createServer(app);
const io = socket.listen(server);
const appDir = path.resolve();
const funcoesSocket = new fnSocket(io);
const direnviar = appDir + '/upload/enviar/';
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'upload/enviar');
    },
    filename: function (req, file, cb) {
        let extArray = file.mimetype.split('/');
        let extension = extArray[extArray.length - 1];
        cb(null, file.fieldname + '-' + Date.now() + '.' + extension);
    }
});
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024
    }
}).array('doc', 1);

// validações de ambiente
if (process.env.NODE_ENV == 'development') {
    wppconnect.defaultLogger.level = 'silly';
    activelog = true;
    options.headless = false;
    options.logQR = false;
    // options.disableSpins = true;
    options.disableWelcome = true;
    // options.disableLogs = true;
    delete options.browserWS;
    delete options.browserArgs;
} else {
    // wppconnect.defaultLogger.level = 'silly';
    // activelog = true;
    wppconnect.defaultLogger.transports.forEach((t) => (t.silent = true));
}

// criando pasta caso ela nao exista
if (!fs.existsSync(direnviar)) {
    fs.mkdirSync(direnviar, {
        recursive: true
    });
}

// configurações para o socket.io
io.origins('*:*');
io.setMaxListeners(0);

// configurações para as rotas
ffmpeg.setFfmpegPath(ffmpegPath);

// Recebendo conexão socket.io
io.on('connection', (socket) => {
    // criando sala para cada sessao/numero
    socket.on('room', (room) => {
        if (socket.room) {
            socket.leave(socket.room);
        }
        socket.join(room);
        socket.room = room;
    });

    // capturando quem conectou
    socket.on('join', (data) => {
        if (activelog) {
            console.log(chalk.green('Conectou: ') + data.name);
        }
        users[socket.id] = {};
        users[socket.id].name = data.name;
        users[socket.id].id = data.id;
        users[socket.id].sessaoname = data.sessaoname;
        socket.emit(users[socket.id].sessaoname).emit('updateUser', 'Você se conectou ao servidor.');
        socket.broadcast
            .to(users[socket.id].sessaoname)
            .emit('updateUser', users[socket.id].name + ' ingressou no servidor.');
    });

    // capturando quem desconectou
    socket.on('disconnect', () => {
        if (users[socket.id]) {
            if (activelog) {
                console.log(chalk.red('Desconectou: ') + users[socket.id].name);
            }
            socket.broadcast
                .to(users[socket.id].sessaoname)
                .emit('updateUser', users[socket.id].name + ' saiu do servidor.');
        }
        delete users[socket.id];
    });

    // pega todos os clientes online
    socket.on('usersrom', async () => {
        if (users[socket.id]) {
            let clients = io.sockets.adapter.rooms[users[socket.id].sessaoname].sockets;
            let array = [];
            for (let clientId in clients) {
                array.push(users[clientId].name);
            }
            socket.emit(users[socket.id].sessaoname).emit('usersromretorn', array);
        }
    });

    // verificando conexao
    socket.on('checkConexaoPing', async (data) => {
        if (data.check) {
            if (users[socket.id]) {
                let conn = await clientsArray[users[socket.id].sessaoname].getConnectionState();
                if (conn == 'CONNECTED') {
                    io.sockets.in(users[socket.id].sessaoname).emit('checkConexaoPong', conn);
                } else {
                    io.sockets.in(users[socket.id].sessaoname).emit('checkConexaoPong', conn);
                }
            }
        }
    });

    // verificando conexao
    socket.on('alertPing', async (data) => {
        io.sockets.in(data.session).emit('alert', data);
    });

    // recebendo open da conversa e atualizando em tempo real
    socket.on('abriuConversaAgora', async (data) => {
        if (data.numero) {
            let chatId = data.numero;
            if (chatId) {
                try {
                    if (users[socket.id]) {
                        let resp = await clientsArray[users[socket.id].sessaoname].sendSeen(chatId + '@c.us');
                        if (resp) {
                            io.sockets.in(users[socket.id].sessaoname).emit('abriuConversaAgoraResp', {
                                numero: data.numero
                            });
                        }
                    }
                } catch (e) {
                    if (activelog) {
                        console.log(e);
                    }
                }
            }
        }
    });

    // recebendo open da conversa e atualizando em tempo real
    socket.on('abriuGrupoAgora', async (data) => {
        if (data.numero) {
            let chatId = data.numero;
            if (chatId) {
                try {
                    if (users[socket.id]) {
                        let resp = await clientsArray[users[socket.id].sessaoname].sendSeen(chatId + '@g.us');
                        if (resp) {
                            io.sockets.in(users[socket.id].sessaoname).emit('abriuConversaAgoraResp', {
                                numero: data.numero
                            });
                        }
                    }
                } catch (e) {
                    if (activelog) {
                        console.log(e);
                    }
                }
            }
        }
    });

    // capturando que um usuário entrou em determinada conversa
    socket.on('entreinaconversa', async (data) => {
        if (data.numero) {
            let chatId = data.numero;
            if (chatId) {
                if (users[socket.id]) {
                    socket.broadcast.to(users[socket.id].sessaoname).emit('estounaconversa', {
                        user: users[socket.id].name,
                        number: data.numero
                    });
                }
            }
        }
    });

    // enviar mensagens
    socket.on('enviarmsg', async (data) => {
        let chatId = data.numero,
            idold = data.id,
            msg = data.msg,
            tipo = data.tipo,
            sessaoname = data.sessaoname,
            reply = data.reply ? data.reply : false,
            quotedMsgObj = data.quotedMsgObj,
            sufixo = '@c.us',
            resp;
        if (tipo == 'group') {
            sufixo = '@g.us';
        }
        if (chatId && msg) {
            msg = msg.replace(/<br>/gi, '\n');
            try {
                if (reply) {
                    resp = await clientsArray[sessaoname].reply(chatId + sufixo, msg + '', reply);
                } else {
                    resp = await clientsArray[sessaoname].sendText(chatId + sufixo, msg + '');
                }
                socket.emit(sessaoname).emit('msgenviada', {
                    idold: idold,
                    id: resp,
                    num: chatId,
                    message: msg,
                    quotedMsgObj: quotedMsgObj
                });
            } catch (e) {
                if (activelog) {
                    console.log(e);
                }
                socket.broadcast.to(sessaoname).emit('alert', {
                    titulo: 'Alerta',
                    message: 'Algo deu errado!',
                    tipo: 'danger'
                });
            }
        } else {
            socket.broadcast.to(users[socket.id].sessaoname).emit('alert', {
                titulo: 'Alerta',
                message: 'Algo deu errado!',
                tipo: 'danger'
            });
        }
    });

    // solicitar reload da tela
    socket.on('solicitereload', async (data) => {
        if (data && data.session) {
            let session = data.session;
            if (reloads[session] != 'true') {
                reloads[session] = 'true';
                funcoesSocket.alert(
                    {
                        titulo: 'Atualização',
                        message: 'Sua tela será reiniciada em 3 minutos.',
                        tipo: 'info'
                    },
                    session
                );

                // 1 minuto
                setTimeout(() => {
                    funcoesSocket.alert(
                        {
                            titulo: 'Atualização',
                            message: 'Sua tela será reiniciada em 2 minutos.',
                            tipo: 'info'
                        },
                        session
                    );
                }, 60000);

                // 1 minutos e meio
                setTimeout(() => {
                    funcoesSocket.alert(
                        {
                            titulo: 'Atualização',
                            message: 'Sua tela será reiniciada em 1 minuto e 30s.',
                            tipo: 'info'
                        },
                        session
                    );
                }, 90000);

                // 2 minutos
                setTimeout(() => {
                    funcoesSocket.alert(
                        {
                            titulo: 'Atualização',
                            message: 'Sua tela será reiniciada em 1 minuto.',
                            tipo: 'info'
                        },
                        session
                    );
                }, 120000);

                // 2 minutos e meio
                setTimeout(() => {
                    funcoesSocket.alert(
                        {
                            titulo: 'Atualização',
                            message: 'Sua tela será reiniciada em 30s.',
                            tipo: 'info'
                        },
                        session
                    );
                }, 150000);

                // 3 minutos
                setTimeout(() => {
                    funcoesSocket.alert(
                        {
                            titulo: 'Atualização',
                            message: 'Sua tela está sendo reiniciada.',
                            tipo: 'info'
                        },
                        session
                    );
                    setTimeout(() => {
                        delete reloads[session];
                        io.sockets.in(session).emit('reload');
                    }, 5000);
                }, 180000);
            }
        }
    });
});

// Exibindo todas as rotas
router.get(`/rotas`, (req, res) => {
    let tokenRES = req.query.token;
    if (tokenRES) {
        if (tokenRES == token) {
            let json = router.stack;
            let array = [];
            let arrayPath = json.map((elem) => {
                if (elem.route && elem.route.path) {
                    if (elem.route.path && elem.route.path != '/rotas')
                        return {
                            name: elem.route.path
                        };
                }
            });
            for (let i = 0; i < arrayPath.length; i++) {
                if (arrayPath[i]) {
                    array.push(arrayPath[i]);
                }
            }
            res.render('rotas', {
                names: array
            });
        } else {
            res.status(401).json({
                message: 'Token não correspondente'
            });
        }
    } else {
        res.status(400).json({
            message: 'Requisição mal formada'
        });
    }
});

// Exibindo todas as sessoes
router.get(`/sessions`, (req, res) => {
    let tokenRES = req.query.token;
    var size = Object.size(clientsArray);
    if (tokenRES) {
        if (tokenRES == token) {
            if (size >= 1) {
                res.status(400).json({ sessions: Object.keys(clientsArray) });
            } else {
                res.status(400).json({
                    message: 'Ainda não foi sincronizado algum numero'
                });
            }
        } else {
            res.status(401).json({
                message: 'Token não correspondente'
            });
        }
    } else {
        res.status(400).json({
            message: 'Requisição mal formada'
        });
    }
});

// Autenticação para criar o wppconnect
router.get(`/:session/autenticacao`, async (req, res) => {
    const session = req.params.session;
    if (session) {
        if (session && typeof SessionValidator[session] == 'undefined') {
            if (activelog) {
                console.log('Iniciando sessão: ' + chalk.green(session));
            }
            SessionValidator[session] = 'true';

            // criando diretorio de upload
            let dir = appDir + '/upload/' + session;
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, {
                    recursive: true
                });
            }

            await start_session(session)
                .then(() => {
                    res.status(200).json({
                        message: 'Autenticado'
                    });
                })
                .catch(async () => {
                    delete SessionValidator[session];
                    await delete_session(session);
                    res.status(200).json({
                        message: 'Error'
                    });
                });
        } else if (SessionValidator[session]) {
            res.status(200).json({
                message: 'Autenticado ou em processo de autenticação.'
            });
        } else {
            delete SessionValidator[session];
            delete clientsArray[session];
            res.status(200).json({
                message: 'Error'
            });
        }
    } else {
        res.status(200).json({
            message: 'Error, envie todos os parametros necessários.'
        });
    }
});

// Sair e deletar cliente
router.get(`/:session/qrcode`, async (req, res) => {
    const session = req.params.session;
    if (await verify_session(session, true)) {
        let qrcode = clientsArray[session].qrCode;
        if (qrcode) {
            res.status(200).json({
                qrcode: qrcode
            });
        } else {
            res.status(200).json({
                message: 'Qrcode ainda não encontrado'
            });
        }
    } else {
        res.status(200).json({
            message: 'Esta sessão não está verificada.'
        });
    }
});

// Tudo sobre o whatsapp em sincronizado
router.get(`/:session/me`, async (req, res) => {
    const session = req.params.session;
    if (await verify_session(session)) {
        try {
            let me = await clientsArray[session].getHostDevice();
            res.status(200).json(me);
        } catch (e) {
            if (activelog) {
                console.log(e);
            }
            res.status(500).json({
                message: 'Algo deu errado!'
            });
        }
    } else {
        res.status(200).json({
            message: 'Esta sessão não está verificada.'
        });
    }
});

// Sair e deletar cliente
router.get(`/:session/sair`, async (req, res) => {
    const session = req.params.session;
    if (await verify_session(session, true)) {
        let tokenRES = req.query.token;
        if (tokenRES) {
            if (tokenRES == token) {
                try {
                    await delete_session(session);
                    res.status(200).json({
                        retorno: 'Saiu com Sucesso'
                    });
                    funcoesSocket.alert(
                        {
                            titulo: 'Alerta',
                            message: 'Saiu com Sucesso',
                            tipo: 'success'
                        },
                        session
                    );
                } catch (e) {
                    if (activelog) {
                        console.log(e);
                    }
                    res.status(500).json({
                        message: 'Algo deu errado!'
                    });
                }
            } else {
                res.status(200).json({
                    message: 'Token não correspondente'
                });
            }
        } else {
            res.status(200).json({
                message: 'Token não encontrado'
            });
        }
    } else {
        res.status(200).json({
            message: 'Esta sessão não está verificada.'
        });
    }
});

// Restartar sessao cliente
router.get(`/:session/restart`, async (req, res) => {
    const session = req.params.session;
    if (await verify_session(session, true)) {
        try {
            let resp = await restart_session(session);
            if (!resp) {
                await delete_session(session);
                await start_session(session)
                clearInterval(sessionLoop[session]);
                res.status(200).json({
                    retorno: 'Restart com Sucesso'
                });
            } else {
                res.status(200).json({
                    retorno: 'Restart com Sucesso'
                });
            }
            // funcoesSocket.alert(
            // 	{
            // 		titulo: 'Alerta',
            // 		message: 'Restart com Sucesso',
            // 		tipo: 'success'
            // 	},
            // 	session
            // );
        } catch (e) {
            if (activelog) {
                console.log(e);
            }
            res.status(500).json({
                message: 'Algo deu errado!'
            });
        }
    } else {
        res.status(200).json({
            message: 'Esta sessão não está verificada.'
        });
    }
});

// Checando a conexão
router.get(`/:session/conexao`, async (req, res) => {
    const session = req.params.session;
    if (await verify_session(session)) {
        try {
            let conn = await clientsArray[session].getConnectionState();
            res.status(200).json({
                message: conn
            });
        } catch (e) {
            if (activelog) {
                console.log(e);
            }
            res.status(500).json({
                message: 'Algo deu errado!'
            });
        }
    } else {
        res.status(200).json({
            message: 'Esta sessão não está verificada.'
        });
    }
});

// Retorna todas as conversas
router.get(`/:session/conversas`, async (req, res) => {
    const session = req.params.session;
    if (await verify_session(session)) {
        try {
            let chats = await clientsArray[session].getAllChats();
            res.status(200).json(chats);
        } catch (e) {
            if (activelog) {
                console.log(e);
            }
            res.status(500).json({
                message: 'Algo deu errado!'
            });
        }
    } else {
        res.status(200).json({
            message: 'Esta sessao não esta verificada.'
        });
    }
});

// Retorna todas conversas com algumas mensagens
router.get(`/:session/conversascommsgs`, async (req, res) => {
    const session = req.params.session;
    if (await verify_session(session)) {
        try {
            let chats = await clientsArray[session].getAllChatsWithMessages();
            res.status(200).json(chats);
        } catch (e) {
            if (activelog) {
                console.log(e);
            }
            res.status(500).json({
                message: 'Algo deu errado!'
            });
        }
    } else {
        res.status(200).json({
            message: 'Esta sessão não está verificada.'
        });
    }
});

// Retorna todas as conversas não lidas
router.get(`/:session/conversasnlidas`, async (req, res) => {
    const session = req.params.session;
    if (await verify_session(session)) {
        try {
            let messages = await clientsArray[session].getAllChats();
            messages = messages.filter((el) => {
                return el.unreadCount > 0;
            });
            res.status(200).json(messages);
        } catch (e) {
            if (activelog) {
                console.log(e);
            }
            res.status(500).json({
                message: 'Algo deu errado!'
            });
        }
    } else {
        res.status(200).json({
            message: 'Esta sessao não esta verificada.'
        });
    }
});

// Todos contatos
router.get(`/:session/todoscontatos`, async (req, res) => {
    const session = req.params.session;
    if (await verify_session(session)) {
        try {
            let contacts = await clientsArray[session].getAllContacts();
            if (contacts) {
                res.status(200).json(contacts);
            } else {
                res.status(500).json({
                    message: 'Algo deu errado!'
                });
            }
        } catch (e) {
            if (activelog) {
                console.log(e);
            }
            res.status(500).json({
                message: 'Algo deu errado!'
            });
        }
    } else {
        res.status(200).json({
            message: 'Esta sessão não está verificada.'
        });
    }
});

/*####################################################################
------- APARTIR DAQUI É REQUISITADO ALGUMA QUERY NA REQUISIÇÃO -------
####################################################################*/

// Valida se um número é válido e retorna o correto
router.get(`/:session/novocontatovalidar`, async (req, res) => {
    const session = req.params.session;
    if (await verify_session(session, true)) {
        let chatId = req.query.numero;
        if (chatId) {
            try {
                let profile = await clientsArray[session].getNumberProfile(chatId + '@c.us');
                if (profile) {
                    res.status(200).json(profile);
                } else {
                    res.status(500).json({
                        message: 'Algo deu errado!'
                    });
                }
            } catch (e) {
                if (activelog) {
                    console.log(e);
                }
                res.status(500).json({
                    message: 'Algo deu errado!'
                });
            }
        } else {
            res.status(400).json({
                success: false,
                message: 'Request incompleto, necessita revisão!'
            });
        }
    } else {
        res.status(200).json({
            message: 'Esta sessão não está verificada.'
        });
    }
});

// Inicia uma conversar com um novo contato
router.get(`/:session/novocontato`, async (req, res) => {
    const session = req.params.session;
    if (await verify_session(session, true)) {
        let chatId = req.query.numero;
        let msg = req.query.msg;
        if (chatId) {
            try {
                let profile = await clientsArray[session].sendText(chatId + '@c.us', msg + '');
                res.status(200).json(profile);
            } catch (e) {
                if (activelog) {
                    console.log(e);
                }
                res.status(500).json({
                    message: 'Algo deu errado!'
                });
            }
        } else {
            res.status(400).json({
                success: false,
                message: 'Request incompleto, necessita revisão!'
            });
        }
    } else {
        res.status(200).json({
            message: 'Esta sessão não está verificada.'
        });
    }
});

// Verifica se o chat de conversa está online
router.get(`/:session/chatonline`, async (req, res) => {
    const session = req.params.session;
    if (await verify_session(session, true)) {
        let chatId = req.query.numero;
        if (chatId) {
            try {
                let user = await clientsArray[session].getChatIsOnline(chatId + '@c.us');
                res.status(200).json(user);
            } catch (e) {
                if (activelog) {
                    console.log(e);
                }
                res.status(500).json({
                    message: 'Algo deu errado!'
                });
            }
        } else {
            res.status(400).json({
                success: false,
                message: 'Request incompleto, necessita revisão!'
            });
        }
    } else {
        res.status(200).json({
            message: 'Esta sessão não está verificada.'
        });
    }
});

// Retorna o status de um contato
router.get(`/:session/status`, async (req, res) => {
    const session = req.params.session;
    if (await verify_session(session, true)) {
        let chatId = req.query.numero;
        if (chatId) {
            try {
                let status = await clientsArray[session].getStatus(chatId + '@c.us');
                res.status(200).json(status);
            } catch (e) {
                if (activelog) {
                    console.log(e);
                }
                res.status(500).json({
                    message: 'Algo deu errado!'
                });
            }
        } else {
            res.status(400).json({
                success: false,
                message: 'Request incompleto, necessita revisão!'
            });
        }
    } else {
        res.status(200).json({
            message: 'Esta sessão não está verificada.'
        });
    }
});

// Fixa ou desfixa uma conversa
router.get(`/:session/fixarchat`, async (req, res) => {
    const session = req.params.session;
    if (await verify_session(session, true)) {
        let chatId = req.query.numero;
        let option = req.query.opcao == 'true';
        if (chatId) {
            try {
                let status = await clientsArray[session].pinChat(chatId + '@c.us', option);
                if (status) {
                    res.status(200).json(status);
                } else {
                    res.status(500).json({
                        message: 'Algo deu errado!'
                    });
                }
            } catch (e) {
                if (activelog) {
                    console.log(e);
                }
                res.status(500).json({
                    message: 'Algo deu errado!'
                });
            }
        } else {
            res.status(400).json({
                success: false,
                message: 'Request incompleto, necessita revisão!'
            });
        }
    } else {
        res.status(200).json({
            message: 'Esta sessão não está verificada.'
        });
    }
});

// Enviar que esta conversa foi visualizada
router.get(`/:session/visualizar`, async (req, res) => {
    const session = req.params.session;
    if (await verify_session(session, true)) {
        let chatId = req.query.numero;
        if (chatId) {
            try {
                await clientsArray[session].sendSeen(chatId + '@c.us');
                res.status(200).json('ok');
            } catch (e) {
                if (activelog) {
                    console.log(e);
                }
                res.status(500).json({
                    message: 'Algo deu errado!'
                });
            }
        } else {
            res.status(400).json({
                success: false,
                message: 'Request incompleto, necessita revisão!'
            });
        }
    } else {
        res.status(200).json({
            message: 'Esta sessão não está verificada.'
        });
    }
});

// Marcar conversa como não visto
router.get(`/:session/marcarnlido`, async (req, res) => {
    const session = req.params.session;
    if (await verify_session(session, true)) {
        let chatId = req.query.numero;
        if (chatId) {
            try {
                let resp = await clientsArray[session].markUnseenMessage(chatId + '@c.us');
                res.status(200).json(resp);
            } catch (e) {
                if (activelog) {
                    console.log(e);
                }
                res.status(500).json({
                    message: 'Algo deu errado!'
                });
            }
        } else {
            res.status(400).json({
                success: false,
                message: 'Request incompleto, necessita revisão!'
            });
        }
    } else {
        res.status(200).json({
            message: 'Esta sessão não está verificada.'
        });
    }
});

// Retorna a url da foto de um perfil
router.get(`/:session/foto`, async (req, res) => {
    const session = req.params.session;
    if (await verify_session(session, true)) {
        let chatId = req.query.numero;
        let type = req.query.tipo;
        let sufixo;
        if (type != 'group') {
            sufixo = '@c.us';
        } else {
            sufixo = '@g.us';
        }
        if (chatId && type && sufixo) {
            // delay
            await sleep(1000);
            try {
                let url = await clientsArray[session].getProfilePicFromServer(chatId + sufixo);
                res.status(200).json(url);
            } catch (e) {
                if (activelog) {
                    console.log(e);
                }
                res.status(500).json({
                    message: 'Algo deu errado!'
                });
            }
        } else {
            res.status(400).json({
                success: false,
                message: 'Request incompleto, necessita revisão!'
            });
        }
    } else {
        res.status(200).json({
            message: 'Esta sessão não está verificada.'
        });
    }
});

// Retorna conversa e as ultimas mensagens
router.get(`/:session/mensagens`, async (req, res) => {
    const session = req.params.session;
    if (await verify_session(session, true)) {
        let chatId = req.query.numero;
        if (chatId) {
            await clientsArray[session].sendSeen(chatId + '@c.us');
            await clientsArray[session].openChat(chatId + '@c.us');
            setTimeout(async () => {
                try {
                    res.status(200).json(retorno);
                } catch (e) {
                    if (activelog) {
                        console.log(e);
                    }
                    res.status(500).json({
                        message: 'Algo deu errado!'
                    });
                }
            }, 500);
        } else {
            res.status(400).json({
                success: false,
                message: 'Request incompleto, necessita revisão!'
            });
        }
    } else {
        res.status(200).json({
            message: 'Esta sessão não está verificada.'
        });
    }
});

// Retorna conversa e as ultimas mensagens group
router.get(`/:session/mensagensgroup`, async (req, res) => {
    const session = req.params.session;
    if (await verify_session(session, true)) {
        let chatId = req.query.numero;
        if (chatId) {
            await clientsArray[session].sendSeen(chatId + '@g.us');
            await clientsArray[session].openChat(chatId + '@g.us');
            setTimeout(async () => {
                try {
                    let retorno = await clientsArray[session].getAllMessagesInChat(chatId + '@g.us', true);
                    res.status(200).json(retorno);
                } catch (e) {
                    if (activelog) {
                        console.log(e);
                    }
                    res.status(500).json({
                        message: 'Algo deu errado!'
                    });
                }
            }, 800);
        } else {
            res.status(400).json({
                success: false,
                message: 'Request incompleto, necessita revisão!'
            });
        }
    } else {
        res.status(200).json({
            message: 'Esta sessão não está verificada.'
        });
    }
});

// Retorna mensagens de uma conversa e mais um pouco
router.get(`/:session/carregarmaismensagens`, async (req, res) => {
    const session = req.params.session;
    if (await verify_session(session, true)) {
        let chatId = req.query.numero;
        let type = req.query.tipo;
        let sufixo;
        if (type != 'group') {
            sufixo = '@c.us';
        } else {
            sufixo = '@g.us';
        }
        if (chatId && type) {
            try {
                let resp = await clientsArray[session].loadEarlierMessages(chatId + sufixo);
                res.status(200).json(resp);
            } catch (e) {
                if (activelog) {
                    console.log(e);
                }
                res.status(500).json({
                    message: 'Algo deu errado!'
                });
            }
        } else {
            res.status(400).json({
                success: false,
                message: 'Request incompleto, necessita revisão!'
            });
        }
    } else {
        res.status(200).json({
            message: 'Esta sessão não está verificada.'
        });
    }
});

// Todas as mensagens de uma conversa
router.get(`/:session/todasmensagens`, async (req, res) => {
    const session = req.params.session;
    if (await verify_session(session, true)) {
        let chatId = req.query.numero;
        if (chatId) {
            try {
                let allMessages = await clientsArray[session].loadAndGetAllMessagesInChat(chatId + '@c.us', true);
                res.status(200).json(allMessages);
            } catch (e) {
                if (activelog) {
                    console.log(e);
                }
                res.status(500).json({
                    message: 'Algo deu errado!'
                });
            }
        } else {
            res.status(400).json({
                success: false,
                message: 'Request incompleto, necessita revisão!'
            });
        }
    } else {
        res.status(200).json({
            message: 'Esta sessão não está verificada.'
        });
    }
});

// Envia mensagem de texto
router.get(`/:session/enviarmsg`, async (req, res) => {
    const session = req.params.session;
    if (await verify_session(session, true)) {
        let chatId = req.query.numero;
        let msg = req.query.msg;
        if (chatId && msg) {
            msg = msg.replace(/<br>/gi, '\n');
            try {
                let element = await clientsArray[session].sendText(chatId + '@c.us', '' + msg);
                res.status(200).json(element);
                if (activelog) {
                    console.log(
                        'Inserindo mensagem: ' +
                        chalk.green(session)
                    );
                }
            } catch (e) {
                if (activelog) {
                    console.log(e);
                }
                res.status(500).json({
                    message: 'Algo deu errado!'
                });
            }
        } else {
            res.status(400).json({
                success: false,
                message: 'Request incompleto, necessita revisão!'
            });
        }
    } else {
        res.status(200).json({
            message: 'Esta sessão não está verificada.'
        });
    }
});

// Encaminha uma mensagem para algum contato
router.get(`/:session/encaminharmsg`, async (req, res) => {
    const session = req.params.session;
    if (await verify_session(session, true)) {
        let chatId = req.query.numero;
        let msgid = req.query.msgid;
        let sufixo = '@c.us';
        if (chatId && msgid && sufixo) {
            try {
                let resp = await clientsArray[session].forwardMessages(chatId + sufixo, msgid, false);
                res.status(200).json(resp);
            } catch (e) {
                if (activelog) {
                    console.log(e);
                }
                res.status(500).json({
                    message: 'Algo deu errado!'
                });
            }
        } else {
            res.status(400).json({
                success: false,
                message: 'Request incompleto, necessita revisão!'
            });
        }
    } else {
        res.status(200).json({
            message: 'Esta sessão não está verificada.'
        });
    }
});

// Envia um contato para alguém
router.get(`/:session/enviarcontato`, async (req, res) => {
    const session = req.params.session;
    if (await verify_session(session, true)) {
        let chatId = req.query.numero,
            numero = req.query.contato,
            sufixo = '@c.us';
        if (chatId && numero && sufixo) {
            try {
                let nome = await clientsArray[session].getContact(numero + sufixo);
                let resp = await clientsArray[session].sendContactVcard(chatId + sufixo, numero + sufixo, nome.name);
                res.status(200).json(resp);
            } catch (e) {
                if (activelog) {
                    console.log(e);
                }
                res.status(500).json({
                    message: 'Algo deu errado!'
                });
            }
        } else {
            res.status(400).json({
                success: false,
                message: 'Request incompleto, necessita revisão!'
            });
        }
    } else {
        res.status(200).json({
            message: 'Esta sessão não está verificada.'
        });
    }
});

// Descriptografa uma mensagem do tipo mídia
router.post(`/:session/desfile`, async (req, res) => {
    const session = req.params.session;
    if (await verify_session(session, true)) {
        let message = req.body;
        if (message) {
            try {
                message.isMedia = true;
                let idmsg = message.id;
                if (typeof idmsg === 'object') {
                    idmsg = idmsg._serialized;
                }
                let md5Hash = crypto.MD5(idmsg.toString());
                let fileName = `file${md5Hash}.${mimetype.extension(message.mimetype)}`;
                let path = `${appDir}/upload/${session}/${fileName}`;
                if (fs.existsSync(path)) {
                    if (activelog) {
                        console.log('Arquivo existe: ' + fileName);
                    }
                    res.status(200).json({
                        name: fileName
                    });
                } else {
                    if (activelog) {
                        console.log('Arquivo sendo baixado');
                    }
                    await downloadFile(path, message, session)
                        .then(() => {
                            res.status(200).json({
                                name: fileName
                            });
                            if (activelog) {
                                console.log('Arquivo baixado com sucesso: ' + fileName);
                            }
                        })
                        .catch((e) => {
                            if (activelog) {
                                console.log('Error ao tentar baixar');
                                console.log(e);
                            }
                            res.status(500).json({
                                message: 'Algo deu errado!'
                            });
                        });
                }
            } catch (e) {
                if (activelog) {
                    console.log(e);
                }
                res.status(500).json({
                    message: 'Algo deu errado!'
                });
            }
        } else {
            res.status(400).json({
                success: false,
                message: 'Post incompleto, necessita revisão!'
            });
        }
    } else {
        res.status(200).json({
            message: 'Esta sessão não está verificada.'
        });
    }
});

// Envia uma mensagem de uma imagem
router.post(`/:session/enviarimagem`, async (req, res) => {
    const session = req.params.session;
    if (await verify_session(session, true)) {
        upload(req, res, async (e) => {
            if (e instanceof multer.MulterError) {
                if (activelog) {
                    console.log(e);
                }
                res.status(500).json({
                    success: false,
                    message: e
                });
            } else if (e) {
                if (activelog) {
                    console.log(e);
                }
                res.status(500).json({
                    success: false,
                    message: e
                });
            } else {
                if (req.body.numero && req.files[0].filename) {
                    try {
                        let respo = await clientsArray[session]
                            .sendImage(
                                req.body.numero + '@c.us',
                                req.files[0].path,
                                req.files[0].originalname.split('.').slice(0, -1).join('.') + ''
                            )
                            .then(() => {
                                fs.unlinkSync(req.files[0].path);
                            });
                        res.status(200).json({
                            success: true,
                            message: 'Imagem enviada com sucesso!',
                            file: req.files,
                            numero: req.body.numero,
                            resp: respo
                        });
                    } catch (err) {
                        if (activelog) {
                            console.log(err);
                        }
                        res.status(500).json({
                            message: 'Algo deu errado!'
                        });
                    }
                } else {
                    res.status(400).json({
                        success: false,
                        message: 'Post incompleto, necessita revisão!'
                    });
                }
            }
        });
    } else {
        res.status(200).json({
            message: 'Esta sessão não está verificada.'
        });
    }
});

// Envia uma mensagem de um documento
router.post(`/:session/enviardoc`, async (req, res) => {
    const session = req.params.session;
    if (await verify_session(session, true)) {
        upload(req, res, async (e) => {
            if (e) {
                if (activelog) {
                    console.log(e);
                }
                res.status(500).json({
                    success: false,
                    message: e
                });
            } else {
                if (req.body.numero && req.files[0] && req.files[0].filename) {
                    try {
                        let respo = await clientsArray[session]
                            .sendFile(
                                req.body.numero + '@c.us',
                                req.files[0].path,
                                req.files[0].originalname.split('.').slice(0, -1).join('.') + ''
                            )
                            .then(() => {
                                fs.unlinkSync(req.files[0].path);
                            });
                        res.status(200).json({
                            success: true,
                            message: 'Documento enviado com sucesso!',
                            file: req.files,
                            numero: req.body.numero,
                            resp: respo
                        });
                    } catch (err) {
                        if (activelog) {
                            console.log(err);
                        }
                        res.status(500).json({
                            message: 'Algo deu errado!'
                        });
                    }
                } else {
                    res.status(400).json({
                        success: false,
                        message: 'Post incompleto, necessita revisão!'
                    });
                }
            }
        });
    } else {
        res.status(200).json({
            message: 'Esta sessão não está verificada.'
        });
    }
});

// Envia uma mensagem como um audio do wpp
router.post(`/:session/enviaraudio`, async (req, res) => {
    const session = req.params.session;
    if (await verify_session(session, true)) {
        let json = await req.body;
        if (json.numero && json.audio_data) {
            let base64Image = json.audio_data.split(';base64,').pop();
            let filename = 'ptt-' + Date.now() + Math.floor(Math.random() * 1000000) + '.wav';
            let filename2 = filename.split('.')[0] + '.mp3';
            let retorno;
            fs.writeFile(
                filename,
                base64Image,
                {
                    encoding: 'base64'
                },
                (err) => {
                    if (!err) {
                        convertAudio(filename, filename2, async (err) => {
                            if (!err) {
                                contents = await fsp.readFile(filename2, {
                                    encoding: 'base64'
                                });
                                retorno = 'data:audio/mp3;base64,' + contents;
                                // deletando os arquivos gerados
                                if (fs.existsSync(filename)) {
                                    fs.unlinkSync(filename);
                                }
                                if (fs.existsSync(filename2)) {
                                    fs.unlinkSync(filename2);
                                }
                                try {
                                    if (contents) {
                                        await clientsArray[session].sendPttFromBase64(
                                            json.numero + '@c.us',
                                            retorno,
                                            'teste'
                                        );
                                        res.status(200).json({
                                            success: true,
                                            message: 'Audio enviado com sucesso!'
                                        });
                                    } else {
                                        res.status(500).json({
                                            message: 'Algo deu errado!'
                                        });
                                    }
                                } catch (e) {
                                    if (activelog) {
                                        console.log(e);
                                    }
                                    res.status(500).json({
                                        message: 'Algo deu errado!'
                                    });
                                }
                            } else {
                                res.status(500).json({
                                    message: 'Algo deu errado!'
                                });
                            }
                        });
                    }
                }
            );
        } else {
            res.status(400).json({
                success: false,
                message: 'Post incompleto, necessita revisão!'
            });
        }
    } else {
        res.status(200).json({
            message: 'Esta sessão não está verificada.'
        });
    }
});

/**
 * Inicia as rotas e funcões da sessão
 * @param {string} session string identificadora
 */
async function start(session) {
    // Enviando para o front que o server foi startado
    funcoesSocket.start({ logado: true }, session);

    // Retrieve all unread message
    const messages = await clientsArray[session].getAllUnreadMessages();
    const messagesize = messages.length;
    if (messagesize && messagesize > 0) {
        messages.forEach(async (element) => {
            element = await clientsArray[session].getMessageById(element.id._serialized);
            if (activelog) {
                console.log(
                    'Inserindo mensagem: ' +
                    chalk.green(session)
                );
            }
        });
    }

    // Monitora as mensagens
    clientsArray[session].onMessage(async (message) => {
        if (message.from != 'status@broadcast') {
            if (message.isMedia === true || message.isMMS === true) {
                let idmsg = message.id;
                if (typeof idmsg === 'object') {
                    idmsg = idmsg._serialized;
                }
                let md5Hash = crypto.MD5(idmsg.toString());
                let fileName = `file${md5Hash}.${mimetype.extension(message.mimetype)}`;
                let path = `${appDir}/upload/${session}/${fileName}`;
                if (!fs.existsSync(path)) {
                    try {
                        await downloadFile(path, message, session);
                    } catch (e) { }
                }
                funcoesSocket.message(message, session);
            } else {
                funcoesSocket.message(message, session);

                // retornando algo quando recebe "!oi"
                let msg = message.body.toLowerCase();
                if (msg == '!oi') {
                    let message2 = 'Olá 👋, em que posso te ajudar?';
                    let resp = await clientsArray[session].sendText(message.from, message2);
                    funcoesSocket.messagesent(
                        {
                            msg: message2,
                            num: message.from,
                            id: resp
                        },
                        session
                    );
                }
            }
            if (activelog) {
                console.log(
                    'Inserindo mensagem: ' +
                    chalk.green(session)
                );
            }
        }
    });

    // Monitora o estado do whatsapp, pode sair esses valores:
    clientsArray[session].onStateChange(async (state) => {
        if (state) {
            if (activelog) {
                console.log('State changed: ', state);
            }
            if ('CONFLICT'.includes(state)) {
                setTimeout(() => {
                    if (clientsArray[session]) clientsArray[session].useHere();
                }, 1000);
            }
            if ('UNPAIRED'.includes(state)) {
                await delete_session(session);
            }
            funcoesSocket.stateChange(state, session);
        }
    });

    // Monitora as atualizações das mensagens
    clientsArray[session].onAck(async (ack) => {
        let getMessage = await clientsArray[session].getMessageById(ack.id._serialized.toString());
        funcoesSocket.ack(getMessage, session);
        if (activelog) {
            console.log(
                'Atualizando mensagem: ' + chalk.green(session));
        }
    });

    // Captura mensagens enviadas
    clientsArray[session].onAnyMessage(async (message) => {
        if (message.fromMe) {
            if (activelog) {
                console.log(
                    'Inserindo mensagem: ' +
                    chalk.green(session)
                );
            }
        }
    });
}

async function downloadFile(path, message, session) {
    return new Promise(async (res, rej) => {
        try {
            let data = await clientsArray[session].downloadMedia(message).catch((e) => {
                if (activelog) {
                    console.log(e);
                }
                rej(e);
            });
            const parts = data.split(',');
            const buffer = Buffer.from(parts[1], 'base64');
            fs.writeFile(path, buffer, function (e) {
                if (e) {
                    if (activelog) {
                        console.log(e);
                        rej(e);
                    }
                }
                res(true);
            });
        } catch (e) {
            rej(e);
        }
    });
}

/**
 * Função para iniciar a sessão
 * @param {string} session string identificadora
 */
async function start_session(session) {
    return new Promise(async (resolve, reject) => {
        await sleep(500);

        let CreateOptions = {
            session: session,
            catchQR: (base64Qrimg, asciiQR, attempts, urlCode) => {
                exportQR(urlCode, session);
            },
            statusFind: async (statusSession, session) => {
                if (activelog) {
                    console.log('Status da sessão: ' + chalk.green(statusSession));
                }
                const conflits = ['browserClose', 'qrReadFail', 'autocloseCalled', 'serverClose', 'deleteToken'];
                if (conflits.includes(statusSession)) {
                    delete clientsArray[session];
                }
                funcoesSocket.statusFind({ message: statusSession }, session);
            },
            ...options
        };
        try {
            await wppconnect
                .create(CreateOptions)
                .then(async (client) => {
                    delete clientsArray[session];
                    clientsArray[session] = client;
                    // post para o banco de dados
                    if (clientsArray[session]) {
                        try {
                            let me = await clientsArray[session].getHostDevice();
                            if (me && me.wid && me.wid.user) {
                                start(session);
                                resolve(true);
                            } else {
                                reject(false);
                            }
                        } catch (e) {
                            if (activelog) {
                                console.log(e);
                            }
                            reject(false);
                        }
                    } else {
                        reject(false);
                    }
                })
                .catch(async (e) => {
                    if (activelog) {
                        console.log(e);
                    }
                    reject(false);
                });
        } catch (e) {
            if (activelog) {
                console.log(e);
            }
            reject(false);
        }
    });
}

/**
 * Função para verificar a sessão
 * @param {string} session string identificadora da sessão
 * @param {string} option booleana para mudar a funcao apenas para verificar se a sessao existe
 */
async function verify_session(session, option = false) {
    if (typeof clientsArray[session] !== 'undefined') {
        try {
            if (!option) {
                let me = await clientsArray[session].getHostDevice();
                if (me && me.wid && me.wid.user) {
                    return true;
                }
            } else {
                return true;
            }
        } catch (error) {
            delete clientsArray[session];
            return false;
        }
    } else {
        return false;
    }
}

/**
 * Função para remover a sessão
 * @param {string} session string identificadora da sessão
 */
async function delete_session(session) {
    if (await verify_session(session, true)) {
        funcoesSocket.qrCodeDelete(session);
        if (session && clientsArray[session]) {
            funcoesSocket.alert(
                {
                    titulo: 'Alerta',
                    message: 'A sincronização foi removida do dispositivo.',
                    tipo: 'danger'
                },
                session
            );
        }
        if (sessionLoop[session]) clearInterval(sessionLoop[session]);
        try {
            // settimeout para nao esperar o close finalizar
            setTimeout(() => {
                delete SessionValidator[session];
                delete clientsArray[session];
            }, 1000);
            await clientsArray[session].close();
            return true;
        } catch (e) {
            if (activelog) {
                console.log('Error when try closeing: ', e);
            }
            return false;
        }
    } else {
        delete SessionValidator[session];
        delete clientsArray[session];
        return true;
    }
}

/**
 * Função para restartar a sessão
 * @param {string} session string identificadora da sessão
 */
async function restart_session(session) {
    console.log('restarting');
    if (await verify_session(session)) {
        clientsArray[session].page.reload();
        return true;
    } else {
        return false;
    }
}

/**
 * Função para fazer um post por axios
 * @param {string} url string url para o post
 * @param {object} dados objeto com os dados a enviar
 */
async function axiosPost(url, dados) {
    try {
        return await axios
            .post(url.toString(), qs.stringify(dados))
            .then((r) => {
                return r.data;
            })
            .catch((e) => {
                return e;
            });
    } catch (e) {
        return e;
    }
}

/**
 * Função callback para gerar e capturar o qrcode
 * @param {*} qrCode qrcode em base64
 * @param {string} path caminho para a exportacao
 * @param {string} session string identificadora
 */
function exportQR(qrCode, session) {
    if (typeof clientsArray[session] === 'object') {
        clientsArray[session].qrCode = qrCode;
    } else {
        clientsArray[session] = {};
        clientsArray[session].qrCode = qrCode;
    }
    funcoesSocket.qrCode(session);
}

/**
 * Função para gerar delay em Função assíncrona
 * @param {string} ms quantidade de ms
 */
function sleep(ms = 0) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Função para converter um audio
 * @param {string} input path of input file
 * @param {string} output path of output file
 * @param {function} callback node-style callback fn (error, result)
 */
function convertAudio(input, output, callback) {
    ffmpeg(input)
        .output(output)
        .on('end', function () {
            callback(null);
        })
        .on('error', function (e) {
            if (activelog) {
                console.log(e);
            }
            callback(e);
        })
        .run();
}

/**
 * Melhorando funcao object para saber a quantidade
 * @param {object} obj variavel que deseja saber a quantidade
 */
Object.size = function (obj) {
    var size = 0,
        key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

export { app, router, server };
