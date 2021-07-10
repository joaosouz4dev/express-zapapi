export default class fnSocket {
    constructor(io) {
        this.io = io;
    }
    //emitindo mensagem que qrcode mudou 
    qrCode(session) {
        this.io.sockets.in(session).emit('qrcode', {
            retorno: 'change',
            sessionSocket: session
        });
        return true;
    }
    //emitindo que o qrcode foi deletado
    qrCodeDelete(session) {
        this.io.sockets.in(session).emit('qrcodeDelete', {
            slug: session
        });
        return true;
    }
    //mudando statusFind
    statusFind(data, session) {
        data.sessionSocket = session;
        this.io.sockets.in(session).emit('statusFind', data);
        return true;
    }
    //detectando start do servidor
    start(data, session) {
        data.sessionSocket = session;
        this.io.sockets.in(session).emit('start', data);
        return true;
    }
    //enviando mensagem como emissor
    messagesent(data, session) {
        data.sessionSocket = session;
        this.io.sockets.in(session).emit('messagesent', data);
        return true;
    }
    //recebendo mensagens
    message(data, session) {
        data.sessionSocket = session;
        this.io.sockets.in(session).emit('message', data);
        return true;
    }
    //mudando status
    stateChange(data, session) {
        this.io.sockets.in(session).emit('stateChange', data);
        return true;
    }
    //webhook para detecção de alteracoes de status nas mensagens
    ack(data, session) {
        data.sessionSocket = session;
        this.io.sockets.in(session).emit('ack', data);
        return true;
    }
    //Função para emitir um alerta
    alert(data, session) {
        data.sessionSocket = session;
        this.io.sockets.in(session).emit('alert', data);
        return true;
    }
}