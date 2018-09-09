var Discord = require('discord.io');
var logger = require('winston');
var auth = require('./auth.json');

var campaign = {};
var currentEvent = {};

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';
// Initialize Discord Bot
var bot = new Discord.Client({
   token: auth.token,
   autorun: true
});
bot.on('ready', function (evt) {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.username + ' - (' + bot.id + ')');
});
bot.on('message', function (user, userID, channelID, message, evt) {
    // Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `!`
    if (message.substring(0, 1) == '!') {
        var args = message.substring(1).split(' ');
        var cmd = args[0];
        var msg = "";
        //var campaign = {};
        args = args.splice(1);
        switch(cmd) {
            case 'new-campaign':
                //cria um novo objecto "Campanha" limpo
                campaign=newCampaign();
                msg = "New Campaign has started! Everybody, get ready! GM, please type **!gm**.";
                break;
            case 'gm':
                //o utilizador que 1º usa este comando torna-se o Game master
                msg = checkGM(user,userID);
                break;
            case 'trait-max':
                msg = statmax(userID,args[0]);
                break;
            case 'join':
                msg = joinPlayer(user,userID,args);
                break;
            case 'stats':
                msg = checkStats(userID);
                break;
            case 'event':
                msg = newEvent(userID,args);
                break;
            case 'roll':
                if(args.length!=1)
                    msg="Please use the command like this: **!roll __trait__** (Trait has to be 'Body', 'Mind', 'Tongue' or 'Eye')";
                msg=roll(userID,args[0]);
                break;
        }
        bot.sendMessage({
            to: channelID,
            message: msg
        });
     }
    //console.log(user);
    //console.log(channelID);
});

function newCampaign(){
    return  obj = {
        campaignName : "",
        maxStats: "",
        gm: {
            username: "",
            usercode: ""
        },
        players: []
    }
}

function checkGM(user,userID){
    if(campaign.gm.usercode == "" && campaign.gm.username == ""){
        campaign.gm.username=user;
        campaign.gm.usercode=userID;
        return "**" + user + "** has been made Game Master for this campaign! "+
               "GM, please define the maximum total of traits of your players with "+
               "**!trait-max __max(#0-400)__**";
    }
    return "This campaign already has a Game Master.";
}

function statmax(userID,max){
    if(campaign.gm.usercode==userID){
        if(isNaN(max) || max<0 || max>400){return "The total trait maximum has to be a number between 0-400!"}
        campaign.maxStats=max;
        return "The total trait maximum is **" + max + "**.\n \n"+
               "Players, you can now join with " +
               "**!join __name-of-the-character__ __body(#0-100)__ __mind(#0-100)__ __tongue(#0-100)__ __eye(#0-100)__**."+
               "\n \nGame Master, when all the players have joined you may create an event with"+
               " **!event __critical-failure-threshold__ __failure/sucess-threshold__ __critical-sucess-threshold__** "+
               " (all thresholds must be 0-100).";
    }
    return "Only the Game Master can change the trait max.";
}



function joinPlayer(user,userID,args){
    var check=true;
    var traits=[0,0,0,0];
    var newPlayer={
        username: "",
        usercode: "",
        name: "",
        body: "",
        mind: "",
        tongue: "",
        eye: ""
    };

    if(args.length!=5) return "Please use the command like this: "+
        "**!join __name-of-the-character__ __body(#0-100)__ __mind(#0-100)__ __tongue(#0-100)__ __eye(#0-100)__**.";

    campaign.players.forEach(e => {
        if(e.usercode==userID){
            check=false;
        }
    });

    if(!check)return "You've already joined.";

    for(var i=1;i<=4;i++){
        var t=parseInt(args[i]);
        if(!isNaN(t) && t>=0 && t<=100)
            traits[i-1]=t;
        else return "Your trait values have to be between 0-100!";
    }

    if((traits[4]+traits[1]+traits[2]+traits[3])<=campaign.maxStats)
        return "You have exceeded the total number of traits specified by the GM.";
    
    newPlayer.username=user;
    newPlayer.usercode=userID;
    newPlayer.name=args[0];
    newPlayer.body=traits[0];
    newPlayer.mind=traits[1];
    newPlayer.tongue=traits[2];
    newPlayer.eye=traits[3];

    campaign.players.push(newPlayer);
    
    return "Welcome " + newPlayer.name + "! You can check your stats any time with **!stats**! We're looking foward to watching your progress."
}

function checkStats(userID){
    var msg="";
    campaign.players.forEach(p => {
        if(p.usercode==userID){
            msg = p.name + "'s stats are: \n Body - **"+p.body+"** \n Mind - **"+p.mind+"** \n Tongue - **"+p.tongue+"** \n Eye - **"+p.eye+"**."
        }
    });
    if(msg == "")
        return "You are not playing the game."
    return msg;
}

function newEvent(userID,args){
    var check=true;
    var th=[];

    if(userID!=campaign.gm.usercode) return "Only the GM can execute this command.";

    if(args.length!=3)
        return "Please use the command like this: "+
        "**!event __critical-failure-threshold__ __failure/sucess-threshold__ __critical-sucess-threshold__**.";


    args.forEach(e => {
        var val=parseInt(e)
        th.push(val);
        if(isNaN(val) || val<0 || val>100) check=false;
    });
    if(!check) return "The threshold values have to be between 0 and 100.";
    console.log(th[0]+","+th[1]+","+th[2]);
    if(th[0]>th[1] || th[1]>th[2])
        return "The critical falure threshold has to be smaller than the faliure/sucess threshold, which "+
               "has to be smaller than the critical sucess threshold.";
    currentEvent={
        cfTH: th[0],
        fsTH: th[1],
        csTH: th[2]
    }
    return "The thresholds have been set! Player, please roll with **!roll __trait__**.";
    
}

function roll(userID,trait){
    var player={};
    var check=false;
    var roll;
    for(var i=0;i<campaign.players.length;i++){
        player=campaign.players[i];
        if(player.usercode=userID)
            check=true;
    }
    if(!check) return "You are not playing the game.";

    trait=trait.toLowerCase();
    roll=Math.round(Math.random()*100)
    switch(trait){
        case 'body':
            roll+=player.body;
            break;
        case 'mind':
            roll+=player.mind;
            break;
        case 'tongue':
            roll+=player.tongue;
            break;
        case 'eye':
            roll+=player.eye;
            break;
        default:
            return  "The trait has to be 'body', 'mind', 'tongue' or 'eye'."
    }

    if(roll<currentEvent.cfTH)
        return "Oof! "+player.name+" just suffered a critical failiure!";
    if(roll<currentEvent.fsTH)
        return player.name+" has failed!";
    if(roll<currentEvent.csTH)
        return player.name+" has succeeded!";
    return "Wow! "+player.name+" managed a critical success! Truly remarkable!";
}