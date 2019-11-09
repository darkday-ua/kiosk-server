const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const fs = require("fs");
const moment = require('moment');
const EventEmitter=require('events');
const Messenger = new EventEmitter();

let configuration = {
    "client": [],
    "presentations": [],
    "videos": []
};

function datesEqual(a, b) {
    return a.getTime() === b.getTime();
}

function log(message) {
    fs.appendFile("../logs/kiosk-server.log", "\n" + moment().format('YYYY-MM-DD:hh:mm:ss') + " " + message, () => { });
    console.log(moment().format('YYYY-MM-DD:hh:mm:ss') + " " + message);
}

function loadConfig(newconfiguration) {    
    try {
        return Object.assign({},newconfiguration);
    }
    catch (e) {
        log('got error ' + e);
        return configuration;
    }

}

function refreshConfig(resultf) {

    fs.readFile("../kiosk-config/kiosk-server.json", "utf8",
        resultf);

}

function saveConfig() {
    fs.writeFile("../kiosk-config/kiosk-server.json", configuration,
        function (error) {
            if (error) {
                log('error writing config file' + error);
            }
        });
}

io.on('connection', (socket)=> {         
    log(`connection of ${socket.id} from ${socket.handshake.address}`);    
    
    Messenger.on('MSG_RESTART_CAM',()=>{

        refreshConfig(function (error, data) {
            if (error) {
                log('error reading config file' + error);
            }
            else {
                log('refreshing conf');
                let oldconfig=configuration;
                configuration = loadConfig(JSON.parse(data));
                //let fClientConfigChanged=false;
                //configuration.client.forEach(function(el){if (!(oldconfig.client.includes(el))) {fClientConfigChanged=true; log(`client config for {el.ip} has changed`);}})
                //if (oldconfig!=configuration) log(`client config has changed`);
                let clientconfig = {
                    "message":"",
                    "client": [],
                    "presentations": [],
                    "videos": []
                };
                clientconfig.client.push(configuration.client.filter(function (el) { return el.ip == socket.handshake.address }));
                configuration.presentations.forEach(function (el) { clientconfig.presentations.push(el) });
                configuration.videos.forEach(function (el) { clientconfig.videos.push(el) });
                clientconfig.message="SS_CONFIG_UPDATE";
                socket.emit("message", JSON.stringify(clientconfig));
            }
        });

    });
    Messenger.on('MSG_RUNFALLBACK_CAM',()=>{
        log(`request for fallback cam sent to ${socket.id}`);
                let clientconfig = {
                    "message":"",
                    "client": [],
                    "presentations": [],
                    "videos": []
                };
                clientconfig.client.push(configuration.client.filter(function (el) { return el.ip == socket.handshake.address }));
                log(clientconfig);
                if (clientconfig.client[0][0].camEnabled=="true"){
                    clientconfig.client[0][0].vlist[0]=0;
                }
                configuration.presentations.forEach(function (el) { clientconfig.presentations.push(el) });
                configuration.videos.forEach(function (el) { clientconfig.videos.push(el) });
                clientconfig.message="SS_FALLBACK_UPDATE";
                socket.emit("message", JSON.stringify(clientconfig));
        });

    


    socket.on('disconnect',() => {
        log(`Socket ${socket.id} disconnected.`);           
      });
      
      socket.on('SS_GET_CONFIG', () => {
        log(`GET_CONFIG Socket ${socket.id}`);
        refreshConfig(function (error, data) {
            if (error) {
                log('error reading config file' + error);
            }
            else {
                log('refreshing conf');
                let oldconfig=configuration;
                configuration = loadConfig(JSON.parse(data));
                let clientconfig = {
                    "message":"",
                    "client": [],
                    "presentations": [],
                    "videos": []
                };
                clientconfig.client.push(configuration.client.filter(function (el) { return el.ip == socket.handshake.address }));
                configuration.presentations.forEach(function (el) { clientconfig.presentations.push(el) });
                configuration.videos.forEach(function (el) { clientconfig.videos.push(el) });
                clientconfig.message="SS_CONFIG_UPDATE";
                socket.emit("message", JSON.stringify(clientconfig));
            }
        });
      });
      
      socket.on('cam', ()=>{
        log(`manual config reload Socket ${socket.id}`);
        //do restart
      });

      socket.on('fallback', ()=>{
        log(`manual fallback config Socket ${socket.id}`);
        //do restart
      });

      socket.emit("connected");      
});

log('kiosk-server started');

refreshConfig(function (error, data) {
    if (error) {
        log('error reading config file' + error);
    }
    else {
        log('initializing conf');        
        configuration = loadConfig(JSON.parse(data));
    }
});

http.listen(3443, '0.0.0.0');
