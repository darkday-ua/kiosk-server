const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const fs = require("fs");
const moment = require('moment');
const EventEmitter=require('events');
const Messenger = new EventEmitter();


let fCam108Disabled=false;
let Cam108Disabled=0;
let lastCam108Time=0;

let fCam109Disabled=false;
let Cam109Disabled=0;
let lastCam109Time=0;

let configuration = {
    "client": [],
    "presentations": [],
    "videos": []
};

function datesEqual(a, b) {
    return a.getTime() === b.getTime();
}

function log(message) {
    fs.appendFile(__dirname + "/kiosk-server.log", "\n" + moment().format('YYYY-MM-DD:hh:mm:ss') + " " + message, () => { });
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

    fs.readFile(__dirname + "/kiosk-server.json", "utf8",
        resultf);

}

function saveConfig() {
    fs.writeFile(__dirname + "/kiosk-server.json", configuration,
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
        Messenger.emit('MSG_RESTART_CAM_108');
        Messenger.emit('MSG_RESTART_CAM_109');
      });

      socket.on('fallback', ()=>{
        log(`manual fallback config Socket ${socket.id}`);
        //do restart
        Messenger.emit('MSG_RUNFALLBACK_CAM_108');
        Messenger.emit('MSG_RUNFALLBACK_CAM_109');
      });

      socket.emit("connected");      
});

function intervalFunc108() {
    
    if (Cam108Disabled==3){
        log('Cam 108 disabled for too long!');        
        //run FALLBACK
        if (!fCam108Disabled) Messenger.emit('MSG_RUNFALLBACK_CAM');        
        Cam108Disabled++;
        fCam108Disabled=true;
        return;
    }
    fs.stat("/tmp/streaming/hls/gopro108_.m3u8", function(err, stats){
        if (err){                        
            Cam108Disabled++;            
            return;
        }
        var mtime = stats.mtime;
        
        if (lastCam108Time!=0&&!(datesEqual(mtime,lastCam108Time))){                                    
            
            if (fCam108Disabled) { log('Restart cam 108!'); Messenger.emit('MSG_RESTART_CAM');}        
            Cam108Disabled=0;
            fCam108Disabled=false;            
        }else
        {  
            Cam108Disabled++;
        }
        lastCam108Time=mtime;
        
    });
  }

  function intervalFunc109() {
    
    if (Cam109Disabled==3){
        log('Cam 109 disabled for too long!');        
        //run FALLBACK
        if (!fCam109Disabled) Messenger.emit('MSG_RUNFALLBACK_CAM');        
        Cam109Disabled++;
        fCam109Disabled=true;
        return;
    }
    fs.stat("/tmp/streaming/hls/gopro109_.m3u8", function(err, stats){
        if (err){                        
            Cam109Disabled++;            
            return;
        }
        var mtime = stats.mtime;
        
        if (lastCam109Time!=0&&!(datesEqual(mtime,lastCam109Time))){                                    
            
            if (fCam109Disabled) { log('Restart cam 109!'); Messenger.emit('MSG_RESTART_CAM');}        
            Cam109Disabled=0;
            fCam109Disabled=false;            
        }else
        {  
            Cam109Disabled++;
        }
        lastCam109Time=mtime;
        
    });
  }
  
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

function restartService108(){
	if (fCam109Disabled)
        {
	        log('restartService 108');

      	  var shell  = require('shelljs');
	        if (shell.exec('supervisorctl restart gopro108').code !== 0) {
        	  shell.echo('Error: restart failed');
	          shell.exit(1);
        	}
	}
}

function restartService109(){
	if (fCam109Disabled)
        {
	        log('restartService 109');

      	  var shell  = require('shelljs');
	        if (shell.exec('supervisorctl restart gopro109').code !== 0) {
        	  shell.echo('Error: restart failed');
	          shell.exit(1);
        	}
	}
}


setInterval(intervalFunc108, 2000);
setInterval(intervalFunc109, 2000);

setInterval(restartService108, 15000);
setInterval(restartService109, 15000);

http.listen(3443, '0.0.0.0');
app.get('/PresentationData/:name', function (req, res,next) {
    var options = {
        root: __dirname+'/PresentationData',
        dotfiles: 'deny',
        headers: {
          'x-timestamp': Date.now(),
          'x-sent': true
        }
      }
      res.type('png');    
      var fileName = req.params.name
      res.sendFile(fileName, options, function (err) {
        if (err) {
          next(err)
        } 
      })
  
  });
  
