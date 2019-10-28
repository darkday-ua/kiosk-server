const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const fs = require("fs");
const moment = require('moment');

const defaultClientData = {clientIP:'',camIP:'',camFormat:'',selPres:''};
let configuration = defaultClientData;

function log(message){
    console.log(moment().format('YYYY-MM-DD:hh:mm:ss')+" "+message);
}

function loadConfig(newconfiguration){
    let prevConfig=configuration;
    try
    {
        return Object.assign(configuration,newconfiguration);
    }
    catch (e)
    {
        log('got error '+e);
        return prevConfig;
    }

}

function refreshConfig(resultf){

fs.readFile(__dirname + "/kiosk-server.json", "utf8", 
            resultf);

}

function saveConfig(){
    fs.writeFile(__dirname + "/kiosk-server.json", configuration, 
    function(error){
        if(error) {
            log('error writing config file'+error);                
        }});  
}
const Presentations = [
    {
    name:"First",
    version:1.0,
    pages:[
        {
            title:'title01',
            contentType:'img',
            linkBlob:'/assets/PresentationData/img-01-01.png',
            text:'Blah blaah blah blah blah <b>BOLD BLAH</b><br><i>Next string italic blah</i>',
            duration:0,
            width:'100%',
            height:'auto',
            linkOut:''
        },
        {
            title:'title02',
            contentType:'img',
            linkBlob:'/assets/PresentationData/img-01-02.png',
            text:'<i>in DIV idual text</i>',
            duration:0,
            width:'100%',
            height:'auto',
            linkOut:''
        }
    ]
    },
    {
        name:"Second",
        version:1.1,
        pages:[
            {
                title:'title02-01',
                contentType:'img',
                linkBlob:'/assets/PresentationData/img-02-01.png',
                text:'<i>P02-01</i>',
                duration:0,
                width:'100%',
                height:'auto',
                linkOut:''
            },
            {
                title:'title02-02',
                contentType:'video',
                linkBlob:'/assets/PresentationData/video-02-02.mp4',
                text:'<i>P02-02</i>',
                duration:0,
                width:'100%',
                height:'auto',
                linkOut:''
            }
        ]
        }

];

io.on("connection", socket => {
    log('here is a connection');
    let previousPID; //presentation id
    const safeJoin = currentPID => {
       if (currentPID==previousPID) return; //is necessary?
      socket.leave(previousPID);
      socket.join(currentPID);
      previousPID = currentPID;
      let hasChanges=false;
      for (let key in configuration){
          if (key=="clientIP"){
              if (configuration[key]==socket.handshake.address) 
                if (configuration.selPres!=currentPID) //may  never run because there is check before
                {
                    hasChanges=true;
                    configuration.selPres=currentPID;
                }
          }
      }
      if (hasChanges) saveConfig();
    };
    var clientIP = socket.handshake.address;
    log(clientIP);
    socket.on("getPresentation", PID => {
      if ((PID<Presentations.length())&&(PID>=0))
      {
          if (Presentations[PID])
          {
            safeJoin(PID);
            socket.emit("PresentationUpdate", Presentations[PID]); //take presentation by ID and send to all subscribed clients
      
          }
      }
    });
  
    socket.on("getPresentationsList", () => {
        refreshConfig(function(error,data){
            if(error) {
                log('error reading config file'+error);                
            }
            else
            {                    
                configuration = loadConfig(JSON.parse(data));
                log('send pupd');
                socket.emit("PresentationUpdate",JSON.stringify(configuration)); 
            }});
            log('send plist');
            socket.emit("PresentationsList", JSON.stringify(Presentations.map(function(x){return x['name'];})));
    });
    socket.emit("connected");
  });

  log('kiosk-server started');
  http.listen(3333,'0.0.0.0');