export function createCloudPresence(endpoint,onVisitors){
 let socket=null,opening=null,sequence=0,lastState='',visitors=[],lastPong=Date.now();const pending=new Map();
 const response=(status,data)=>({ok:status>=200&&status<300,status,json:async()=>data});
 function close(){socket?.close();socket=null;lastState='';}
 function connect(){
  if(socket?.readyState===WebSocket.OPEN)return Promise.resolve();if(opening)return opening;
  opening=new Promise((resolve,reject)=>{
   const ws=new WebSocket(endpoint);socket=ws;
   const timer=setTimeout(()=>{ws.close();reject(Error('연결 시간이 초과됐어요. 다시 시도해주세요.'));},8000);
   ws.onopen=()=>{clearTimeout(timer);lastPong=Date.now();resolve();};
   ws.onmessage=e=>{
    if(e.data==='pong'){lastPong=Date.now();return;}const message=JSON.parse(e.data);
    if(message.visitors){visitors=message.visitors;onVisitors(visitors);}
    const task=pending.get(message.rid);if(task){pending.delete(message.rid);clearTimeout(task.timer);if(message.data.visitors)visitors=message.data.visitors;task.resolve(response(message.status,message.data));}
   };
   ws.onerror=()=>{clearTimeout(timer);reject(Error('전시관 연결을 확인해주세요.'));};
   ws.onclose=()=>{clearTimeout(timer);if(socket===ws){socket=null;lastState='';visitors=[];onVisitors([]);}for(const task of pending.values()){clearTimeout(task.timer);task.reject(Error('연결이 끊겼어요.'));}pending.clear();reject(Error('연결이 끊겼어요.'));};
  }).finally(()=>opening=null);return opening;
 }
 setInterval(()=>{if(socket?.readyState===WebSocket.OPEN){if(Date.now()-lastPong>60000)close();else socket.send('ping');}},20000);
 async function fetchPresence(url,options){
  const body=JSON.parse(options.body);
  if(body.action!=='join'&&socket?.readyState!==WebSocket.OPEN)return response(401,{});
  if(body.action==='join'){await connect();lastState='';}
  const state=JSON.stringify([body.x,body.z,body.rotation,body.moving]);
  if(body.action==='update'&&state===lastState)return response(200,{visitors});
  const rid=++sequence;
  const result=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(rid);close();reject(Error('연결이 지연되고 있어요.'));},4500);pending.set(rid,{resolve,reject,timer});socket.send(JSON.stringify({...body,rid}));});
  if(result.ok&&body.action==='update')lastState=state;return result;
 }
 return {fetch:fetchPresence,close};
}
