
// Required packages
var http = require('http');
var sockjs = require('sockjs');

var fileHelper = require('./utils').fileHelper;

// Clients list
var clients = {};
var connected_users = {};

// Broadcast to all clients
function broadcast(message){
    // iterate through each client in clients object
    for (var client in connected_users){
      // send the message to that client
      connected_users[client].write(JSON.stringify(message));
    }
  }

  // create sockjs server
var echo = sockjs.createServer();
var userListJson = './users-list.json';

var login = function(data,client) {
    var usersList = JSON.parse(fileHelper.readFile(userListJson));
    if (!data.mobile || !data.password) {
        console.log('Invlaid input');
        client.handle.write(JSON.stringify({type:'login-error',data:{errorMsg: 'Invalid input'}}));
    }
    var user = usersList.filter((us)=>{ return data.mobile === us.mobile && data.password === us.password ;})[0];
    if(user) { 
        var contactsList = usersList.filter((us)=>{ return data.mobile !== us.mobile });
        contactsList = contactsList.map((us)=>{ var a= Object.assign({},us);
                                            delete a['password'];
                                            return a;
                                            });
        client.handle.write(JSON.stringify({type:'login-success',data:{contacts:contactsList,profileInfo:{username:user.username,mobile:user.mobile}}}));
        connected_users[data.mobile] = client.handle; 
    }
    else{
        client.handle.write(JSON.stringify({type:'login-error',data:{errorMsg: 'Invalid Username/password'}})) 
    }
    
}
var register = function(data,client){
    var usersList = JSON.parse(fileHelper.readFile(userListJson));
    if (!data.username || !data.mobile || !data.password) {
        console.log('Invlaid input');
        client.handle.write(JSON.stringify({type:'registration-error',data:{errorMsg: 'Invalid input'}}));
    }
    var user = usersList.filter((us)=>{ return data.mobile === us.mobile;})[0];
    if(user) { 
        client.handle.write(JSON.stringify({type:'registration-error',data:{errorMsg: 'This mobile no is already registered'}})) }
    else {
        usersList.push(
            {
                username: data.username,
                mobile: data.mobile,
                password: data.password
            }            
        );
        fileHelper.writeFile(userListJson,JSON.stringify(usersList));
        connected_users[data.mobile] = client.handle;
        client.handle.write(JSON.stringify({type:'registration-success',data:{}}));
        broadcast({type:'new-contact',data:{
                username: data.username,
                mobile: data.mobile,
            }});
     }    
}

var sendMsg = function (data) {
    var receiverhandle = connected_users[data.to];
    receiverhandle && receiverhandle.write(JSON.stringify({type:'peer-msg',data:data}));
}
// on new connection event
echo.on('connection', function(conn) {
  console.log('new connection');
  // add this client to clients object
  clients[conn.id] = {handle:conn};

  // on receive new data from client event
  conn.on('data', function(message) {
    console.log('data received',message);
    console.log(typeof(message));
    var msg = JSON.parse(message);
    switch(msg.type) {
        case 'register':
            register(msg.data,clients[conn.id]);
            break;
        case 'login':
            login(msg.data,clients[conn.id])
            break;
        case 'send-msg':
            sendMsg(msg.data);
            break;
        default:
            break;
    }
    //broadcast(JSON.parse(message));
  });

  // on connection close event
  conn.on('close', function() {
      console.log('connection closes');
    delete clients[conn.id];
  });
  
});

// Create an http server
var server = http.createServer();

// Integrate SockJS and listen on /echo
echo.installHandlers(server, {prefix:'/aegon_chat'});

// Start server
server.listen(9999, '0.0.0.0');