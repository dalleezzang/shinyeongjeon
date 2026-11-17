import {DurableObject} from 'cloudflare:workers';
const motions=['','bboy','headspin','lie','dance'];
const colors=['#7d927e','#798ca5','#b89366','#9a83a1','#b5796c','#729c99'];
export default {fetch(request,env){
 const url=new URL(request.url);
 if(url.pathname==='/health')return Response.json({ok:true});
 if(url.pathname!=='/visitors')return new Response('Not found',{status:404});
 const origin=request.headers.get('Origin');
 if(!(env.ALLOWED_ORIGINS||'').split(',').includes(origin))return new Response('Forbidden',{status:403});
 if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response('WebSocket required',{status:426});
 return env.GALLERY.getByName('shinyoung').fetch(request);
}};
export class Gallery extends DurableObject {
 constructor(ctx,env){super(ctx,env);this.sessions=new Map(ctx.getWebSockets().map(ws=>[ws,ws.deserializeAttachment()]));ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping','pong'));}
 fetch(){
  if(this.sessions.size>=80)return new Response('Gallery full',{status:503});
  const pair=new WebSocketPair(),client=pair[0],socket=pair[1];
  this.ctx.acceptWebSocket(socket);socket.serializeAttachment(null);this.sessions.set(socket,null);
  return new Response(null,{status:101,webSocket:client});
 }
 visitors(socket){return [...this.sessions].filter(([ws,v])=>ws!==socket&&v).map(([,v])=>{const {id,name,color,x,z,rotation,moving,y=.12,running=false,motion='',motionAt=0}=v;return {id,name,color,x,z,rotation,moving,y,running,motion,motionAt};});}
 reply(ws,rid,status,data){ws.send(JSON.stringify({rid,status,data}));}
 broadcast(){for(const [ws,v] of this.sessions)if(v){try{ws.send(JSON.stringify({visitors:this.visitors(ws)}));}catch{this.sessions.delete(ws);}}}
 webSocketMessage(ws,raw){
  if(typeof raw!=='string'||raw.length>2048){ws.close(1009,'Invalid message');return;}
  let body;try{body=JSON.parse(raw);}catch{ws.close(1007,'Invalid JSON');return;}
  if(!body||!Number.isInteger(body.rid))return;
  const rid=body.rid;let v=this.sessions.get(ws);
  if(body.action==='join'){
   if(v){this.reply(ws,rid,200,{...v,spawn:{x:v.x,z:v.z},visitors:this.visitors(ws)});return;}
   const name=typeof body.name==='string'?body.name.normalize('NFC').trim():'';
   if(!name||Array.from(name).length>16||/[\u0000-\u001f\u007f]/.test(name)){this.reply(ws,rid,400,{error:'이름을 1~16자로 입력해주세요.'});return;}
   const index=[...this.sessions.values()].filter(Boolean).length;
   v={id:crypto.randomUUID(),name,color:colors[index%colors.length],x:-1.5+(index%4)*.55,z:4+Math.floor(index%8/4)*.5,rotation:.12,moving:false};
   this.sessions.set(ws,v);ws.serializeAttachment(v);this.reply(ws,rid,200,{...v,spawn:{x:v.x,z:v.z},visitors:this.visitors(ws)});this.broadcast();return;
  }
  if(!v){this.reply(ws,rid,401,{});return;}
  if(body.action==='chat'){
   const text=typeof body.text==='string'?body.text.trim():'';
   if(!text||Array.from(text).length>200||/[\u0000-\u001f\u007f]/.test(text)){this.reply(ws,rid,400,{error:'메시지는 1~200자로 입력해주세요.'});return;}
   if(Date.now()-(v.lastChat||0)<1000){this.reply(ws,rid,429,{error:'잠시 후 다시 보내주세요.'});return;}
   v.lastChat=Date.now();ws.serializeAttachment(v);
   const chat={id:crypto.randomUUID(),senderId:v.id,name:v.name,text};
   for(const [peer,user] of this.sessions)if(user){try{peer.send(JSON.stringify({chat}));}catch{}}
   this.reply(ws,rid,200,{});return;
  }
  if(body.action==='leave'){this.sessions.delete(ws);ws.serializeAttachment(null);this.reply(ws,rid,200,{});ws.close(1000,'Leaving');this.broadcast();return;}
  if((body.motion!==undefined&&!motions.includes(body.motion))||(body.y!==undefined&&(!Number.isFinite(body.y)||body.y<.12||body.y>3.1))||(body.running!==undefined&&typeof body.running!=='boolean')||body.action!=='update'||![body.x,body.z,body.rotation].every(Number.isFinite)||typeof body.moving!=='boolean'||!((Math.abs(body.x)<=8.04&&body.z>=-6.04&&body.z<=6.15)||(Math.abs(body.x)<=2.67&&body.z>=5.9&&body.z<=10.15))){this.reply(ws,rid,400,{error:'Invalid position'});return;}
  const motion=body.moving?'':(body.motion||'');if(motion!==(v.motion||'')){v.motion=motion;v.motionAt=Date.now();}
  Object.assign(v,{x:body.x,z:body.z,rotation:body.rotation,moving:body.moving,y:body.y??.12,running:body.running??false});ws.serializeAttachment(v);this.reply(ws,rid,200,{visitors:this.visitors(ws)});this.broadcast();
 }
 webSocketClose(ws){this.sessions.delete(ws);this.broadcast();}
 webSocketError(ws){this.sessions.delete(ws);try{ws.close(1011,'Connection error');}catch{}this.broadcast();}
}
