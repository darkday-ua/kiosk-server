const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const fs = require("fs");
const moment = require('moment');

const defaultClientData =
{
    "client": [],
    "presentations": [],
    "videos": []
}
let configuration = {
    "client": [],
    "presentations": [],
    "videos": []
};


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
const Presentations = [];


io.on("connection", socket => {
    log('Here is a connection from ' + socket.handshake.address);
    // let previousPID; //presentation id
    // const safeJoin = currentPID => {
    //    if (currentPID==previousPID) return; //is necessary?
    //   socket.leave(previousPID);
    //   socket.join(currentPID);
    //   previousPID = currentPID;
    //   let hasChanges=false;
    //   for (let key in configuration){
    //       if (key=="clientIP"){
    //           if (configuration[key]==socket.handshake.address) 
    //             if (configuration.selPres!=currentPID) //may  never run because there is check before
    //             {
    //                 hasChanges=true;
    //                 configuration.selPres=currentPID;
    //             }
    //       }
    //   }
    //   if (hasChanges) saveConfig();

    socket.on("getPresentation", PID => {
        if ((PID < Presentations.length()) && (PID >= 0)) {
            if (Presentations[PID]) {
                safeJoin(PID);
                socket.emit("PresentationUpdate", Presentations[PID]); //take presentation by ID and send to all subscribed clients

            }
        }
    });

    socket.on("getConfig", () => {
        refreshConfig(function (error, data) {
            if (error) {
                log('error reading config file' + error);
            }
            else {
                configuration = loadConfig(JSON.parse(data));
                let clientconfig = {
                    "client": [],
                    "presentations": [],
                    "videos": []
                };
                clientconfig.client.push(configuration.client.filter(function (el) { return el.ip == socket.handshake.address }));
                configuration.presentations.forEach(function (el) { clientconfig.presentations.push(el) });
                configuration.videos.forEach(function (el) { clientconfig.videos.push(el) });
                socket.emit("Configuration", JSON.stringify(clientconfig));
            }
        });
    });
    socket.emit("connected");
});

log('kiosk-server started');
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
  