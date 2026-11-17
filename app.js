import {createCloudPresence} from './presence-client.js';
const cloudPresence=createCloudPresence("wss://shinyoung-presence.songsari722.workers.dev/visitors",list=>receiveVisitors(list));
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const $=s=>document.querySelector(s), scene=new THREE.Scene();
let initialLoading=true,entryStarted=0,guideDone=false,assetsReady=false,admitted=false,visitorName='';
function loadingMessage(text){$('#loading-status').textContent=text;}
function loadingError(text){loadingMessage(text);$('#loading-retry').hidden=false;}
function finishEntry(){
 if(!initialLoading||!assetsReady||!admitted)return;initialLoading=false;entryStarted=performance.now();document.body.classList.remove('is-loading');
 $('#loading-screen').classList.add('finished');setTimeout(()=>$('#loading-screen').hidden=true,650);
 $('#welcome').classList.add('show');setTimeout(()=>$('#welcome').classList.remove('show'),2600);
 $('.controls-hint').classList.add('started');
}
$('#loading-retry').onclick=()=>location.reload();
scene.background=new THREE.Color('#d9d6cc');
const camera=new THREE.PerspectiveCamera(38,innerWidth/innerHeight,.1,120);
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true});}catch{loadingError('3D 화면을 실행할 수 없어요. 브라우저의 하드웨어 가속을 켜주세요.');throw new Error('WebGL unavailable');}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;$('#scene').appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=5;controls.maxDistance=65;controls.maxPolarAngle=Math.PI/2.12;controls.minPolarAngle=.2;controls.enablePan=false;
const mat=(c,extra={})=>new THREE.MeshStandardMaterial({color:c,roughness:.85,...extra});
// ---- Materials -------------------------------------------------------------
function canvasTex(w,h,draw,repeat){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();if(repeat){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(...repeat);}return t;}
const rand=(()=>{let s=7;return()=>(s=(s*16807)%2147483647)/2147483647;})();
// Oak planks with staggered joints and grain, one texture tile = 4m x 4m.
const floorTex=canvasTex(1024,1024,(ctx,w,h)=>{const pw=w/10;for(let col=0;col<10;col++){let y=-rand()*h;while(y<h){const len=h*(.3+rand()*.32);const l=50+rand()*6,tone=`hsl(${29+rand()*4},${26+rand()*6}%,${l}%)`;ctx.fillStyle=tone;ctx.fillRect(col*pw,y,pw,len);ctx.globalAlpha=.08;for(let g=0;g<9;g++){ctx.strokeStyle=rand()>.5?'#3d2715':'#f3dcb8';ctx.lineWidth=.6+rand()*1.4;ctx.beginPath();const gx=col*pw+rand()*pw;ctx.moveTo(gx,y);ctx.bezierCurveTo(gx+rand()*8-4,y+len*.3,gx+rand()*8-4,y+len*.7,gx+rand()*6-3,y+len);ctx.stroke();}ctx.globalAlpha=.55;ctx.fillStyle='#4a3420';ctx.fillRect(col*pw,y,pw,1.5);ctx.globalAlpha=1;y+=len;}ctx.fillStyle='rgba(60,40,22,.55)';ctx.fillRect(col*pw,0,1.5,h);}},[17/4,13/4]);
const floorMat=new THREE.MeshStandardMaterial({map:floorTex,roughness:.48,metalness:0,envMapIntensity:.7});
const plasterTex=canvasTex(512,512,(ctx,w,h)=>{ctx.fillStyle='#aaa69a';ctx.fillRect(0,0,w,h);for(let i=0;i<5000;i++){ctx.fillStyle=`rgba(${rand()>.5?'255,255,250':'150,140,120'},${rand()*.05})`;ctx.fillRect(rand()*w,rand()*h,2+rand()*5,2+rand()*5);}},[4,2]);
const wallMat=new THREE.MeshStandardMaterial({map:plasterTex,roughness:.95});
const accentMat=new THREE.MeshStandardMaterial({color:'#4d5c49',roughness:.9});
const wood=mat('#a87a4f',{roughness:.55}),dark=mat('#2b2d27',{roughness:.5,metalness:.3}),white=mat('#fbf8f0'),brass=mat('#b8925a',{roughness:.35,metalness:.8}),stone=mat('#b9b3a6',{roughness:.7});
function box(w,h,d,m,x,y,z,parent=scene){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function cylinder(r1,r2,h,m,x,y,z,parent=scene,segments=8){const o=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,segments),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
const ground=box(200,.1,200,mat('#d9d6cc'),0,-.25,0);ground.castShadow=false;
const obstacles=[];
function solid(w,h,d,m,x,y,z){const mesh=box(w,h,d,m,x,y,z);obstacles.push({x,z,w,d});return mesh;}
// ---- Room shell -------------------------------------------------------------
box(17,.28,13,mat('#8a7b66'),0,-.03,0);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(16.8,12.8),floorMat);floor.rotation.x=-Math.PI/2;floor.position.y=.115;floor.receiveShadow=true;scene.add(floor);
solid(17,4.8,.2,wallMat,0,2.5,-6.5);
solid(.2,4.8,13,wallMat,-8.5,2.5,0);
solid(.2,4.8,13,wallMat,8.5,2.5,0);
// One continuous gallery with an open entrance.
solid(6.5,4.8,.2,wallMat,-5.25,2.5,6.5);
solid(6.5,4.8,.2,wallMat,5.25,2.5,6.5);
box(4,1,.2,wallMat,0,4.4,6.5);
// A two-sided hanging wall inside one continuous exhibition.
solid(.24,3.8,5.4,accentMat,0,2.1,-2.5);box(.3,.06,5.46,brass,0,4.02,-2.5);
// Recessed dark skirting (shadow gap) instead of a bright strip.
for(const [w,d,x,z] of [[16.8,.04,0,-6.38],[.04,12.8,-8.38,0],[.04,12.8,8.38,0],[6.4,.04,-5.25,6.38],[6.4,.04,5.25,6.38]])box(w,.1,d,mat('#5d564b'),x,.17,z);
const ceiling=box(17,.12,13,mat('#f4f1ea',{emissive:'#d8d2c4',emissiveIntensity:.55}),0,4.94,0);ceiling.castShadow=false;
// Skylights: soft glowing panels with a thin frame.
const glow=new THREE.MeshBasicMaterial({color:'#fffaf0'});
for(const [x,z] of [[-4.2,1.6],[4.4,2.4]]){box(2.9,.08,2.1,mat('#d8d3c8'),x,4.86,z).castShadow=false;const p=box(2.6,.02,1.8,glow,x,4.82,z);p.castShadow=false;}
// ---- Tracks follow the perimeter; the centre remains open ---------------------
for(const z of [-4.85,4.9])box(16,.04,.05,dark,0,4.86,z).castShadow=false;
for(const x of [-6.85,6.85])box(.05,.04,11,dark,x,4.86,0).castShadow=false;
const exhibitionLights=new THREE.Group();scene.add(exhibitionLights);
function exhibitionLayout(count){
  // Eye-level hanging only. Reserve corners for plants, sculpture and reception.
  const slots=[
    {x:-4.3,y:2.5,z:-6.33,ry:0,w:4.5,h:3.05},
    ...[1.25,3.35,5.45].map(x=>({x,y:2.5,z:-6.33,ry:0,w:1.7,h:2.15})),
    ...[-4.5,-1.7,1.1].map(z=>({x:-8.33,y:2.5,z,ry:Math.PI/2,w:2.15,h:2.35})),
    ...[-1.4,1.1,3.6].map((z,i)=>({x:8.33,y:2.5,z,ry:-Math.PI/2,w:i===1?2.1:1.9,h:i===1?2.7:2.35})),
    ...[-1,1].flatMap(side=>[-3.85,-1.15].map(z=>({x:side*.18,y:2.35,z,ry:side*Math.PI/2,w:2.1,h:2.3})))
  ].slice(0,count);
  const remaining=Math.max(0,count-14);
  // The front-right wall is clear of the entrance desk and corner plants.
  for(let i=0;i<remaining;i++)slots.push({x:2.65+(i+.5)*3.8/remaining,y:2.5,z:6.33,ry:Math.PI,w:Math.min(1.65,3.8/remaining-.2),h:2.3});
  return slots;
}
function lightExhibition(slots){
  exhibitionLights.traverse(o=>{o.geometry?.dispose();if(o.isLight)o.dispose();});exhibitionLights.clear();
  slots.forEach(slot=>{const nx=Math.sin(slot.ry),nz=Math.cos(slot.ry),x=slot.x+nx*1.5,z=slot.z+nz*1.5;
    const g=new THREE.Group();g.position.set(x,4.72,z);exhibitionLights.add(g);
    cylinder(.025,.025,.14,dark,0,0,0,g);const can=cylinder(.07,.06,.22,dark,0,-.13,0,g,12);g.updateMatrixWorld();can.lookAt(slot.x,slot.y,slot.z);can.rotateX(-Math.PI/2);
    const spot=new THREE.SpotLight('#ffe4bd',slot.compact?38:65,9,slot.w>3?.65:.46,.65,1.5);
    spot.position.set(x,4.62,z);spot.target.position.set(slot.x,slot.y,slot.z);exhibitionLights.add(spot,spot.target);
  });
}
// ---- Signs ------------------------------------------------------------------
function sign(text,x,y,z,angle=0,w=2,color='#4e5749',size=65){const c=document.createElement('canvas');c.width=700;c.height=180;const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.font=`500 ${size}px sans-serif`;ctx.textBaseline='middle';ctx.textAlign='center';ctx.fillText(text,350,92);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,w*180/700),new THREE.MeshStandardMaterial({map:t,transparent:true,depthWrite:false,roughness:.9}));mesh.position.set(x,y,z);mesh.rotation.y=angle;scene.add(mesh);return mesh;}

sign('신영전',-4.5,3.5,6.38,Math.PI,3.1,'#252d26',140);
sign('그녀의 인생을 둘러보세요.',-4.5,2.95,6.38,Math.PI,3.1,'#343b32',47);
// ---- Lighting -----------------------------------------------------------------
scene.add(new THREE.HemisphereLight('#fff8ec','#a8957a',.85));
const sun=new THREE.DirectionalLight('#fff5e6',1.1);sun.position.set(2.5,14,3.5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:.5,far:30});sun.shadow.normalBias=.035;sun.shadow.radius=4;scene.add(sun);
// Soft studio reflections without extra files: a tiny glowing room baked to an env map.
{const env=new THREE.Scene();env.background=new THREE.Color('#c9c3b6');const lightBox=(w,h,d,x,y,z,c,i)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshBasicMaterial({color:new THREE.Color(c).multiplyScalar(i)}));m.position.set(x,y,z);env.add(m);};lightBox(6,.2,3,0,6,0,'#fff6e8',3);lightBox(.2,3,4,7,2,0,'#f2f5ea',2);lightBox(20,.2,20,0,-3,0,'#7d6248',1);const pm=new THREE.PMREMGenerator(renderer);scene.environment=pm.fromScene(env,.04).texture;scene.environmentIntensity=.45;}
// ---- Vestibule outside the entrance, so turning around never shows the void --
box(6.4,.28,4,mat('#5f5a52',{roughness:.6}),0,-.03,8.6);box(3.6,.02,1.6,mat('#3b3a35',{roughness:1}),0,.12,7.4);
solid(.2,4.8,4,accentMat,-3.1,2.5,8.6);solid(.2,4.8,4,accentMat,3.1,2.5,8.6);solid(6.4,4.8,.2,accentMat,0,2.5,10.6);box(6.4,.12,4,mat('#f4f1ea',{emissive:'#d8d2c4',emissiveIntensity:.4}),0,4.94,8.6).castShadow=false;
sign('신영전',0,3.45,10.47,Math.PI,2.8,'#efe6d2',140);
{
 const c=document.createElement('canvas');c.width=1600;c.height=640;
 const ctx=c.getContext('2d');ctx.fillStyle='#e9e2cf';ctx.font='400 43px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
 const lines=[
  ['〈신영전〉은 남윤주 작가의 시선으로 바라본',70],
  ['신영의 여러 얼굴을 담은 인물 기록이다.',144],
  ['다정함과 장난기, 피로와 반항이 교차하는 순간들.',284],
  ['익숙한 일상의 장면들은 애정 어린 시선을 만나',358],
  ['한 사람을 오래 들여다보는 작은 전시가 된다.',432]
 ];
 for(const [line,y] of lines)ctx.fillText(line,800,y);
 const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();
 const introduction=new THREE.Mesh(new THREE.PlaneGeometry(4.8,1.92),new THREE.MeshStandardMaterial({map:texture,transparent:true,depthWrite:false,roughness:.9}));
 introduction.position.set(0,2.12,10.47);introduction.rotation.y=Math.PI;scene.add(introduction);
}
{const l=new THREE.PointLight('#ffe9c9',8,7,1.6);l.position.set(0,4,8.6);scene.add(l);}
// ---- Furniture and decor ------------------------------------------------------
function bench(x,z,rot=0){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;scene.add(g);box(2.6,.09,.75,wood,0,.82,0,g);box(2.5,.05,.65,mat('#6a4c33'),0,.765,0,g);for(const sx of [-1,1])box(.08,.62,.62,dark,sx*1.05,.46,0,g);const w=rot?.75:2.6,d=rot?2.6:.75;obstacles.push({x,z,w,d});}
bench(4.4,1.5);bench(-4.3,-1.6);
// Rugs anchor the seating areas.
function rug(x,z,w,d,c1,c2){const t=canvasTex(512,Math.round(512*d/w),(ctx,cw,ch)=>{ctx.fillStyle=c1;ctx.fillRect(0,0,cw,ch);ctx.strokeStyle=c2;ctx.lineWidth=10;ctx.strokeRect(22,22,cw-44,ch-44);ctx.lineWidth=3;ctx.strokeRect(42,42,cw-84,ch-84);for(let i=0;i<9000;i++){ctx.fillStyle=`rgba(0,0,0,${rand()*.05})`;ctx.fillRect(rand()*cw,rand()*ch,2,2);}});const m=new THREE.Mesh(new THREE.BoxGeometry(w,.02,d),new THREE.MeshStandardMaterial({map:t,roughness:1}));m.position.set(x,.13,z);m.receiveShadow=true;scene.add(m);}
rug(4.4,1.5,4.2,2.6,'#b9a487','#7d5c43');rug(-4.3,-1.6,4,2.4,'#a9ad97','#5b6650');
// Reception desk: oak top, slatted front, a small lamp and brochures.
solid(2.3,1.05,.8,mat('#e6e0d3'),-5.5,.72,4.8);box(2.45,.07,.95,wood,-5.5,1.29,4.8);for(let i=0;i<14;i++)box(.09,.98,.03,wood,-6.55+i*.162,.72,4.39);
cylinder(.09,.12,.04,brass,-6.25,1.35,4.85,scene,16);cylinder(.012,.012,.42,brass,-6.25,1.56,4.85,scene,6);const shade=cylinder(.07,.16,.17,mat('#f3ead8',{emissive:'#ffd9a0',emissiveIntensity:.6}),-6.25,1.8,4.85,scene,16);{const l=new THREE.PointLight('#ffd7a0',1.5,3,2);l.position.set(-6.25,1.7,4.85);scene.add(l);}
for(let i=0;i<3;i++){const b=box(.21,.02,.3,mat(['#c96f4c','#f2eee3','#4f5d49'][i]),-5.2+i*.27,1.335,4.75);b.rotation.y=(i-1)*.12;}
// Plants: low-poly leaves around a stem, in ceramic pots.
function plant(x,z,s=1,pot='#ded2bc'){cylinder(.43*s,.32*s,.65*s,mat(pot,{roughness:.5}),x,.12+.33*s,z,scene,14);cylinder(.05,.07,1.8*s,mat('#786c49'),x,.2+1.4*s,z);for(let i=0;i<9;i++){const a=i*2.4;const leaf=new THREE.Mesh(new THREE.IcosahedronGeometry(.55*s,0),mat(['#5f7149','#7c8f5c','#94a46f'][i%3]));leaf.scale.set(.7,1.35,.5);leaf.position.set(x+Math.cos(a)*.38*s,.2+(1.5+i*.13)*s,z+Math.sin(a)*.4*s);leaf.rotation.z=Math.sin(a)*.7;leaf.rotation.y=a;leaf.castShadow=true;scene.add(leaf);}obstacles.push({x,z,w:1.1*s,d:1.1*s});}
plant(-7.3,4.0,.9);plant(7.7,-3.4,.85,'#3f4b3c');plant(7.65,5.6,.9,'#c96f4c');
// Plinths with sculptures.
solid(.9,.85,.9,white,6.8,.6,-4.6);const sculpture=new THREE.Mesh(new THREE.TorusKnotGeometry(.28,.09,96,12),mat('#8c9a78',{roughness:.35,metalness:.25}));sculpture.position.set(6.8,1.45,-4.6);sculpture.castShadow=true;scene.add(sculpture);
solid(.7,1.05,.7,white,-7.6,.7,5.4);{const v=new THREE.Mesh(new THREE.LatheGeometry([[0,0],[.16,0],[.2,.12],[.13,.32],[.08,.42],[.1,.48]].map(([a,b])=>new THREE.Vector2(a,b)),24),mat('#c96f4c',{roughness:.45}));v.position.set(-7.6,1.23,5.4);v.scale.setScalar(1.2);v.castShadow=true;scene.add(v);}

// Soft, simple silhouettes with a face and articulated shoulders.
function person(x,z,shirt,rotation=0){
 const g=new THREE.Group();g.position.set(x,.12,z);g.rotation.y=rotation;scene.add(g);
 const skin=mat('#d6ae89'),pants=mat('#454a43'),cloth=mat(shirt),shoe=mat('#e8e3d5'),hairMat=mat('#40392f');
 function shape(geometry,material,position,scale,parent=g){const mesh=new THREE.Mesh(geometry,material);mesh.position.set(...position);if(scale)mesh.scale.set(...scale);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 const sphere=(radius,material,pos,scale,parent=g)=>shape(new THREE.SphereGeometry(radius,12,8),material,pos,scale,parent);
 const capsule=(radius,length,material,pos,scale,parent=g)=>shape(new THREE.CapsuleGeometry(radius,length,4,10),material,pos,scale,parent);
 const legs=[],arms=[];
 for(const side of [-1,1]){
  const leg=new THREE.Group();leg.position.set(side*.115,.68,0);g.add(leg);capsule(.085,.37,pants,[0,-.255,0],[1,1,1],leg);sphere(.11,shoe,[0,-.58,.055],[.95,.65,1.5],leg);legs.push(leg);
  const arm=new THREE.Group();arm.position.set(side*.235,1.19,0);arm.rotation.z=side*.08;g.add(arm);capsule(.071,.29,cloth,[0,-.18,0],[1,1,1],arm);sphere(.073,skin,[0,-.405,.01],[.85,1.1,.85],arm);arms.push(arm);
 }
 capsule(.18,.28,cloth,[0,.99,0],[1.22,1,.82]);cylinder(.07,.075,.12,skin,0,1.34,0,g,10);
 const head=new THREE.Group();head.position.y=1.52;g.add(head);
 sphere(.225,skin,[0,0,0],[.9,1.06,.88],head);
 for(const side of [-1,1]){
  sphere(.043,skin,[side*.199,-.015,0],[.65,1,.7],head);
  sphere(.036,mat('#fff9ee'),[side*.073,.015,.185],[1,1.05,.45],head);
  sphere(.019,mat('#292b26'),[side*.073,.014,.202],[1,1.15,.55],head);
  sphere(.006,white,[side*.073-.005,.022,.213],[1,1,1],head);
 }
 sphere(.027,skin,[0,-.035,.205],[.8,1,1],head);
 const smile=new THREE.CatmullRomCurve3([new THREE.Vector3(-.035,-.087,.18),new THREE.Vector3(0,-.097,.187),new THREE.Vector3(.035,-.087,.18)]);
 shape(new THREE.TubeGeometry(smile,8,.004,5,false),mat('#8a5a47'),[0,0,0],null,head);
 shape(new THREE.SphereGeometry(.232,12,7,0,Math.PI*2,0,Math.PI*.46),hairMat,[0,.035,-.007],[.92,1.03,.91],head);
 sphere(.06,hairMat,[-.135,.145,.105],[1.3,.8,.8],head);
 g.userData={legs,arms,head,cloth};return g;
}
function animatePerson(person,now,moving){
 const swing=moving?Math.sin(now*.0105)*.4:0;
 person.userData.legs.forEach((leg,i)=>leg.rotation.x=i?-swing:swing);
 person.userData.arms.forEach((arm,i)=>arm.rotation.x=i?swing*.7:-swing*.7);
 person.userData.head.rotation.z=moving?Math.sin(now*.005)*.025:Math.sin(now*.0015)*.012;
}
const player=person(-1.5,4,'#b27f63',.12);
const clerk=person(-5.5,5.65,'#6d7c67',Math.PI);
obstacles.push({x:-5.5,z:5.65,w:.5,d:.5});
let focusArt=null,focusBlend=0,lastManualLook=0,lastMovement=0,focusEligible=false;
let focusSuppressedUntil=0;
let playerMoving=false;
const artGroup=new THREE.Group();scene.add(artGroup);let works=[],signature='',targets=[];
const sampleNames=['A softer morning','The shape of quiet','Somewhere, slowly','After the rain','Soft edges','A little blue','Still growing','Between moments'];
function sample(i){const c=document.createElement('canvas');c.width=600;c.height=760;const ctx=c.getContext('2d');const colors=[['#eee5ce','#a8ae89','#d6815d'],['#e9e0d2','#444f62','#b9bec4'],['#e9bc8c','#c96647','#f4ddaa'],['#d1dddc','#67908b','#f0dfb8'],['#e3ddc6','#6c7c54','#b3b88d'],['#e3e4dc','#6a83a1','#b6c6ca'],['#e4dec8','#868e5a','#b49a77'],['#eed6c2','#c29481','#6f7e72']][i];ctx.fillStyle=colors[0];ctx.fillRect(0,0,600,760);ctx.fillStyle=colors[1];if(i%3===0){ctx.beginPath();ctx.arc(300,330,190,Math.PI,0);ctx.lineTo(490,650);ctx.lineTo(110,650);ctx.fill();ctx.fillStyle=colors[2];ctx.beginPath();ctx.arc(380,230,85,0,Math.PI*2);ctx.fill();}else if(i%3===1){for(let j=0;j<6;j++){ctx.fillStyle=j%2?colors[1]:colors[2];ctx.beginPath();ctx.ellipse(310,150+j*90,190-j*15,65,-.3,0,Math.PI*2);ctx.fill();}}else{ctx.fillRect(100,100,310,460);ctx.fillStyle=colors[2];ctx.beginPath();ctx.arc(370,490,165,0,Math.PI*2);ctx.fill();}return {name:sampleNames[i],url:c.toDataURL(),sample:true};}
const samples=Array.from({length:8},(_,i)=>sample(i));
function clearArt(){approachArt=null;clickedArt=null;focusBlend=0;focusArt=null;focusEligible=false;artGroup.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){o.material.map?.dispose();o.material.dispose();}});artGroup.clear();targets=[];}
let generation=0;
function showRoom(){
 const version=++generation;clearArt();const all=works.length?works:samples;const slots=exhibitionLayout(all.length);lightExhibition(slots);
 let completed=0;
 const jobs=all.map((work,i)=>new Promise(resolve=>{
  let settled=false;
  function settle(ok){if(settled)return;settled=true;clearTimeout(timer);completed++;if(initialLoading){loadingMessage(`사진을 걸고 있어요 · ${completed} / ${all.length}`);$('#loading-progress').value=completed/all.length;}resolve(ok);}
  const timer=setTimeout(()=>settle(false),20000);
  const slot=slots[i],group=new THREE.Group();group.position.set(slot.x,slot.y,slot.z);group.rotation.y=slot.ry;artGroup.add(group);
  new THREE.TextureLoader().load(work.url,tex=>{
   if(settled||version!==generation){tex.dispose();settle(false);return;}
   tex.colorSpace=THREE.SRGBColorSpace;
   const ratio=tex.image.width/tex.image.height,w=Math.min(slot.w,slot.h*ratio),h=w/ratio;
   const matWidth=w,matHeight=h;
   box(matWidth+.09,matHeight+.09,.09,mat('#2e2620',{roughness:.45}),0,0,0,group);
   const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,toneMapped:false}));
   mesh.position.z=.08;mesh.userData.work=work;mesh.userData.index=i;group.add(mesh);targets.push(mesh);
   const c=document.createElement('canvas');c.width=400;c.height=100;const ctx=c.getContext('2d');ctx.fillStyle='#fbf9f2';ctx.fillRect(0,0,400,100);ctx.fillStyle='#51574a';ctx.font='500 24px sans-serif';ctx.fillText((work.title||work.name).slice(0,23),12,42);ctx.font='16px sans-serif';ctx.fillStyle='#909483';ctx.fillText(work.sample?'신영전 · DEMO':'신영전',12,76);
   const labelTex=new THREE.CanvasTexture(c);labelTex.colorSpace=THREE.SRGBColorSpace;const labelWidth=slot.compact?.75:1.05;
   const label=new THREE.Mesh(new THREE.PlaneGeometry(labelWidth,labelWidth/4),new THREE.MeshStandardMaterial({map:labelTex,roughness:.9}));
   label.position.set(-(matWidth+.09)/2+labelWidth/2,-(matHeight+.09)/2-.18,.075);group.add(label);settle(true);
  },undefined,()=>{if(version===generation&&!initialLoading)toast('읽을 수 없는 이미지: '+work.name);settle(false);});
 }));
 return Promise.all(jobs);
}
let refreshing=false;
async function refresh(){
 if(refreshing)return;refreshing=true;
 try{const res=await fetch('./artworks-manifest.json',{signal:AbortSignal.timeout(8000)});if(!res.ok)throw Error();const data=await res.json();const sig=JSON.stringify(data);
 if(sig!==signature){const first=!signature;signature=sig;works=data;const results=await showRoom();if(initialLoading){await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));assetsReady=true;finishEntry();if(results.some(ok=>!ok))toast('일부 사진을 불러오지 못했어요. 새로고침하면 다시 시도합니다.');}else if(!first)toast('전시가 업데이트되었어요');}
 }catch{if(initialLoading)loadingError('전시를 불러오지 못했어요. 서버 연결을 확인하고 다시 시도해주세요.');else toast('폴더 연결이 끊겼어요. 실행 창을 확인해주세요.');}
 finally{refreshing=false;}
}
let toastTimer;function toast(text){$('#status').textContent=text;$('#status').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#status').style.display='none',4000);}

// Shoulder camera: physical key codes work even with a Korean keyboard layout.
let yaw=Math.PI+.12,pitch=-.06,dragging=false,camLength=0,lookPointer=null,lookX=0,lookY=0;
const keys=new Set();
const movementCodes=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight']);
function releaseArtworkView(){
 const now=performance.now();focusSuppressedUntil=now+120;lastMovement=now;focusEligible=false;clickedArt=null;
}
addEventListener('keydown',e=>{if(!initialLoading&&admitted&&movementCodes.has(e.code)){e.preventDefault();releaseArtworkView();keys.add(e.code);}});
addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{keys.clear();dragging=false;lookPointer=null;});
renderer.domElement.addEventListener('pointerdown',e=>{if(initialLoading||lookPointer!==null)return;dragging=true;lookPointer=e.pointerId;lookX=e.clientX;lookY=e.clientY;renderer.domElement.setPointerCapture(e.pointerId);});
renderer.domElement.addEventListener('pointermove',e=>{if(dragging&&e.pointerId===lookPointer&&!document.querySelector('dialog[open]')){clickedArt=null;lastManualLook=performance.now();yaw-=(e.clientX-lookX)*.004;pitch=THREE.MathUtils.clamp(pitch+(e.clientY-lookY)*.003,-.45,.5);lookX=e.clientX;lookY=e.clientY;}});
for(const event of ['pointerup','pointercancel','lostpointercapture'])renderer.domElement.addEventListener(event,e=>{if(e.pointerId===lookPointer){dragging=false;lookPointer=null;}});
const stick={x:0,y:0,pointer:null};
const joystick=$('#joystick'),knob=$('#joystick-knob');
function resetStick(){stick.x=0;stick.y=0;stick.pointer=null;knob.style.transform='translate(0px,0px)';joystick.classList.remove('active');}
function moveStick(e){const rect=joystick.getBoundingClientRect(),radius=rect.width*.34;let dx=e.clientX-(rect.left+rect.width/2),dy=e.clientY-(rect.top+rect.height/2);const length=Math.hypot(dx,dy);if(length>radius){dx*=radius/length;dy*=radius/length;}knob.style.transform=`translate(${dx}px,${dy}px)`;const power=Math.hypot(dx,dy)/radius;if(power<.12){stick.x=0;stick.y=0;}else{const gain=(power-.12)/(.88*power);stick.x=dx/radius*gain;stick.y=dy/radius*gain;}}
joystick.addEventListener('pointerdown',e=>{if(initialLoading||document.querySelector('dialog[open]')||stick.pointer!==null)return;e.preventDefault();stick.pointer=e.pointerId;joystick.setPointerCapture(e.pointerId);joystick.classList.add('active');releaseArtworkView();moveStick(e);});
joystick.addEventListener('pointermove',e=>{if(e.pointerId===stick.pointer){e.preventDefault();releaseArtworkView();moveStick(e);}});
for(const event of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(event,e=>{if(e.pointerId===stick.pointer)resetStick();});
addEventListener('blur',resetStick);document.addEventListener('visibilitychange',()=>{if(document.hidden)resetStick();});
joystick.addEventListener('contextmenu',e=>e.preventDefault());
function canStand(x,z){const radius=.33;const main=x>=-8.04&&x<=8.04&&z>=-6.04&&z<=6.15;const entry=x>=-2.67&&x<=2.67&&z>=5.9&&z<=10.15;if(!main&&!entry)return false;return !obstacles.some(o=>Math.abs(x-o.x)<o.w/2+radius&&Math.abs(z-o.z)<o.d/2+radius);}
controls.enabled=false;camera.fov=55;camera.near=.08;camera.updateProjectionMatrix();
const cameraRay=new THREE.Raycaster();
const wrapAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));
const focusCentre=new THREE.Vector3(),focusNormal=new THREE.Vector3(),approachPos=new THREE.Vector3(),approachNormal=new THREE.Vector3(),approachRay=new THREE.Raycaster();
let approachArt=null,clickedArt=null;
const walkingLook=new THREE.Vector3();
// Pick the nearest physical artwork first. Looking at a farther work must never steal focus.
function pickApproach(now,eye,forward,walls){
 let nearest=null,best=1.65;
 for(const mesh of targets){
  mesh.getWorldPosition(approachPos);approachNormal.set(0,0,1).transformDirection(mesh.matrixWorld);
  const ex=eye.x-approachPos.x,ez=eye.z-approachPos.z;
  const front=ex*approachNormal.x+ez*approachNormal.z;
  const lateral=Math.abs(ex*approachNormal.z-ez*approachNormal.x),distance=Math.hypot(ex,ez);
  if(front<.1||distance>=best||lateral>Math.min(.75,mesh.geometry.parameters.width/2))continue;
  approachRay.set(eye,approachPos.clone().sub(eye).normalize());approachRay.far=eye.distanceTo(approachPos)-.1;
  if(approachRay.intersectObjects(walls).length)continue;
  nearest=mesh;best=distance;
 }
 if(nearest){approachNormal.set(0,0,1).transformDirection(nearest.matrixWorld);if(-forward.dot(approachNormal)<.65)nearest=null;}
 return nearest;
}
function updateCamera(dt,snap=false){
 const now=performance.now();
 const walls=scene.children.filter(o=>o.isMesh&&o.geometry.type==='BoxGeometry'&&o.geometry.parameters.height>2);
 const eye=player.position.clone().add(new THREE.Vector3(0,1.5,0));
 const candidate=clickedArt||pickApproach(now,eye,new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)),walls);
 let want=0;
 const movingInput=keys.size>0||Math.hypot(stick.x,stick.y)>.01;
 if(!initialLoading&&admitted&&candidate&&!dragging&&!movingInput&&!playerMoving&&now>focusSuppressedUntil&&(clickedArt||now-lastManualLook>300)){
  // Finish easing out before changing works, avoiding a sideways jump between photographs.
  if(!approachArt||approachArt===candidate||focusBlend<.02){approachArt=candidate;want=1;}
 }
 focusBlend+=(want-focusBlend)*(1-Math.exp(-dt*(want>focusBlend?6:7)));if(focusBlend<.002&&!want)focusBlend=0;
 const ease=focusBlend;
 const walkTarget=playerMoving?new THREE.Vector3(Math.sin(player.rotation.y),0,Math.cos(player.rotation.y)).multiplyScalar(.45):new THREE.Vector3();
 walkingLook.lerp(walkTarget,1-Math.exp(-dt*4));
 const focus=eye,forward=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)),right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
 // Camera sits behind and slightly over the right shoulder so the character never blocks the artwork in the centre.
 const offset=new THREE.Vector3(Math.sin(yaw)*2.9,.85,Math.cos(yaw)*2.9).addScaledVector(right,.55);const distance=offset.length(),dir=offset.normalize();cameraRay.set(focus,dir);const hit=cameraRay.intersectObjects(walls)[0];const target=hit?Math.min(distance,Math.max(.15,hit.distance-.25)):distance;
 // Pull in instantly when a wall gets in the way, ease back out afterwards (no popping).
 camLength=snap||target<camLength?target:camLength+(target-camLength)*(1-Math.exp(-6*dt));const pos=focus.clone().addScaledVector(dir,camLength);const look=focus.clone().addScaledVector(right,.55*camLength/distance).addScaledVector(forward,5);look.y=1.5-pitch*5;look.add(walkingLook);
 if(approachArt&&ease>.001){
  approachArt.getWorldPosition(focusCentre);focusNormal.set(0,0,1).transformDirection(approachArt.matrixWorld);
  const size=approachArt.geometry.parameters,portrait=innerWidth<=700||camera.aspect<.85;
  const width=size.width+.18,height=size.height+.18,availableWidth=.88,availableHeight=portrait?.50:.84;
  const baseTan=Math.tan(THREE.MathUtils.degToRad(55)/2);
  const required=Math.max(width/(2*baseTan*camera.aspect*availableWidth),height/(2*baseTan*availableHeight))*1.05;
  cameraRay.set(focusCentre,focusNormal);const obstacle=cameraRay.intersectObjects(walls)[0];
  const safe=obstacle?Math.max(.3,obstacle.distance-.35):30,d=Math.min(Math.max(1.8,required),safe);
  // If the room limits camera distance, widen the lens rather than crop the artwork.
  const fitFov=Math.max(55,THREE.MathUtils.radToDeg(2*Math.atan(Math.max(width/(2*d*camera.aspect*availableWidth),height/(2*d*availableHeight))*1.05)));
  camera.fov=THREE.MathUtils.lerp(55,fitFov,ease);camera.updateProjectionMatrix();
  const offsetY=portrait?2*d*Math.tan(THREE.MathUtils.degToRad(fitFov)/2)*.22:0;
  const framed=focusCentre.clone().addScaledVector(focusNormal,d);framed.y-=offsetY;
  const framedLook=focusCentre.clone();framedLook.y-=offsetY;
  pos.lerp(framed,ease);look.lerp(framedLook,ease);
 }else if(camera.fov!==55){camera.fov=55;camera.updateProjectionMatrix();}
 camera.position.copy(pos);camera.lookAt(look);player.visible=camLength>.8&&ease<.6;
}
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let down;
renderer.domElement.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);
renderer.domElement.addEventListener('pointercancel',()=>down=null);
renderer.domElement.addEventListener('pointerup',e=>{
 const start=down;down=null;
 if(initialLoading||!admitted||!start||Math.hypot(e.clientX-start[0],e.clientY-start[1])>5)return;
 pointer.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);ray.setFromCamera(pointer,camera);
 const hit=ray.intersectObjects([...targets,...scene.children.filter(o=>o.isMesh&&o.geometry.type==='BoxGeometry'&&o.geometry.parameters.height>2)])[0];
 if(hit?.object.userData.work){clickedArt=hit.object;focusSuppressedUntil=0;resetStick();keys.clear();}
});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
let previous=performance.now();updateCamera(0,true);
function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-previous)/1000,.05);previous=now;
const horizontal=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)+stick.x;const turn=(keys.has('ArrowLeft')?1:0)-(keys.has('ArrowRight')?1:0);if(turn&&!document.querySelector('dialog[open]')){yaw+=turn*1.9*dt;lastManualLook=now;}
const forward=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-stick.y;
let moving=false;
if((horizontal||forward)&&!document.querySelector('dialog[open]')){const norm=Math.hypot(horizontal,forward);const dx=(Math.cos(yaw)*horizontal-Math.sin(yaw)*forward)/norm;const dz=(-Math.sin(yaw)*horizontal-Math.cos(yaw)*forward)/norm;const step=2.6*dt*Math.min(1,norm);const oldX=player.position.x,oldZ=player.position.z;
if(canStand(player.position.x+dx*step,player.position.z))player.position.x+=dx*step;
if(canStand(player.position.x,player.position.z+dz*step))player.position.z+=dz*step;
moving=Math.hypot(oldX-player.position.x,oldZ-player.position.z)>.0001;const heading=Math.atan2(dx,dz);player.rotation.y+=wrapAngle(heading-player.rotation.y)*(1-Math.exp(-dt*14));}
playerMoving=moving;if(moving||horizontal||forward)lastMovement=now;animatePerson(player,now,moving);animatePerson(clerk,now,false);updateRemoteVisitors(dt,now);updateCamera(dt);updateNearby(now);updateGreeting();updateEntryGuide(now);updateNameLabels();renderer.render(scene,camera);
}requestAnimationFrame(animate);

let nearbyKey=null,lastNearbyCheck=0;
const nearRay=new THREE.Raycaster(),nearPosition=new THREE.Vector3(),nearNormal=new THREE.Vector3(),viewProjection=new THREE.Vector3();
function updateNearby(now){if(now-lastNearbyCheck<120)return;lastNearbyCheck=now;let closest=null,closestMesh=null,best=3.3;
 if(!document.querySelector('dialog[open]')){
  const eye=player.position.clone().add(new THREE.Vector3(0,1.5,0));const blockers=scene.children.filter(o=>o.isMesh&&o.geometry.type==='BoxGeometry'&&o.geometry.parameters.height>2);
  for(const mesh of targets){mesh.getWorldPosition(nearPosition);const distance=Math.hypot(nearPosition.x-eye.x,nearPosition.z-eye.z);if(distance>best)continue;
   nearNormal.set(0,0,1).transformDirection(mesh.matrixWorld);if(eye.clone().sub(nearPosition).dot(nearNormal)<.1)continue;
   viewProjection.copy(nearPosition).project(camera);if(viewProjection.z< -1||viewProjection.z>1||Math.abs(viewProjection.x)>.9||Math.abs(viewProjection.y)>1)continue;
   const delta=nearPosition.clone().sub(eye);nearRay.set(eye,delta.clone().normalize());nearRay.far=delta.length()-.08;if(nearRay.intersectObjects(blockers).length)continue;
   closest=mesh.userData.work;closestMesh=mesh;best=distance;
  }
 }
 focusEligible=!!closestMesh&&best<1.65;
 if(closestMesh)focusArt=closestMesh;else if(focusBlend<.01)focusArt=null;
 if((clickedArt||approachArt)&&focusBlend>.1)closest=(clickedArt||approachArt).userData.work;
 const card=$('#nearby');card.classList.toggle('visible',!!closest);card.setAttribute('aria-hidden',String(!closest));
 if(closest){nearbyKey=closest.key;$('#near-title').textContent=closest.title||closest.name;$('#near-description').textContent=closest.description||'';}else nearbyKey=null;
}


// Staff greeting, anchored above the actual attendant.
function updateGreeting(){
 const bubble=$('#greeting'),distance=Math.hypot(player.position.x-clerk.position.x,player.position.z-clerk.position.z);
 const point=clerk.position.clone().add(new THREE.Vector3(0,2.05,0)).project(camera);
 const visible=distance<3.1&&!document.querySelector('dialog[open]')&&point.z>-1&&point.z<1&&Math.abs(point.x)<1&&Math.abs(point.y)<1;
 bubble.classList.toggle('visible',visible);bubble.setAttribute('aria-hidden',String(!visible));
 if(visible){bubble.style.left=`${THREE.MathUtils.clamp((point.x*.5+.5)*innerWidth,95,innerWidth-95)}px`;bubble.style.top=`${THREE.MathUtils.clamp((-point.y*.5+.5)*innerHeight,55,innerHeight-40)}px`;}
}
// Ephemeral, server-backed visitor positions. Each browser tab is one visitor.
const remoteVisitors=new Map();let visitorSession=null,presenceTimer=null,presenceStopped=false,hasJoined=false;
function removeVisitor(id){const remote=remoteVisitors.get(id);if(!remote)return;scene.remove(remote.avatar);remote.avatar.userData.nameLabel?.remove();const materials=new Set();remote.avatar.traverse(o=>{o.geometry?.dispose();if(o.material&&o.material!==white)materials.add(o.material);});materials.forEach(m=>m.dispose());remoteVisitors.delete(id);}
function receiveVisitors(list){const ids=new Set();for(const v of list){ids.add(v.id);let remote=remoteVisitors.get(v.id);if(!remote){const avatar=person(v.x,v.z,v.color,v.rotation);addNameLabel(avatar,v.name||'관람객');remote={avatar,x:v.x,z:v.z,rotation:v.rotation,moving:v.moving};remoteVisitors.set(v.id,remote);}Object.assign(remote,{x:v.x,z:v.z,rotation:v.rotation,moving:v.moving});}for(const id of remoteVisitors.keys())if(!ids.has(id))removeVisitor(id);$('#scene').dataset.visitors=String(remoteVisitors.size);}
function updateRemoteVisitors(dt,now){for(const remote of remoteVisitors.values()){const t=1-Math.exp(-12*dt);remote.avatar.position.x=THREE.MathUtils.lerp(remote.avatar.position.x,remote.x,t);remote.avatar.position.z=THREE.MathUtils.lerp(remote.avatar.position.z,remote.z,t);const delta=Math.atan2(Math.sin(remote.rotation-remote.avatar.rotation.y),Math.cos(remote.rotation-remote.avatar.rotation.y));remote.avatar.rotation.y+=delta*t;animatePerson(remote.avatar,now,remote.moving);}}
let lastPresenceSuccess=performance.now(),presenceBackoff=250;
async function syncPresence(){if(presenceStopped||!admitted)return;let delay=document.hidden?1000:200;try{
 const body=visitorSession?{action:'update',id:visitorSession.id,token:visitorSession.token,x:player.position.x,z:player.position.z,rotation:player.rotation.y,moving:playerMoving}:{action:'join',name:visitorName};
 const res=await cloudPresence.fetch('/api/visitors',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(4500)});
 if(res.status===401){visitorSession=null;delay=200;}else{if(!res.ok)throw Error();const data=await res.json();if(!visitorSession){visitorSession={id:data.id,token:data.token};if(!hasJoined&&data.spawn){player.position.x=data.spawn.x;player.position.z=data.spawn.z;}hasJoined=true;}receiveVisitors(data.visitors);lastPresenceSuccess=performance.now();presenceBackoff=250;}
 }catch{presenceBackoff=Math.min(presenceBackoff*2,5000);delay=presenceBackoff;if(performance.now()-lastPresenceSuccess>8000)receiveVisitors([]);}
 if(!presenceStopped)presenceTimer=setTimeout(syncPresence,delay);
}
addEventListener('pagehide',()=>{presenceStopped=true;clearTimeout(presenceTimer);cloudPresence.close();});
addEventListener('pageshow',e=>{if(e.persisted){visitorSession=null;presenceStopped=false;syncPresence();}});


function updateEntryGuide(now){
 const guide=$('#entry-guide');if(initialLoading||guideDone)return;
 const elapsed=now-entryStarted;
 if(player.position.z<1.6||elapsed>30000){guideDone=true;guide.classList.remove('visible');return;}
 guide.classList.toggle('visible',elapsed>2900&&!document.querySelector('dialog[open]'));
 // Arrow points toward the exhibition floor relative to the current view.
 const target=new THREE.Vector3(-1.5,0,-1),direction=Math.atan2(-(target.x-player.position.x),-(target.z-player.position.z));
 const relative=wrapAngle(direction-yaw);$('#guide-arrow').style.transform=`rotate(${-relative}rad)`;
}
refresh().then(()=>setInterval(refresh,3000));

// Only named visitors who explicitly enter join the shared exhibition.
const nameLayer=$('#name-labels'),nameRay=new THREE.Raycaster();
function addNameLabel(avatar,name){const el=document.createElement('span');el.className='visitor-name';el.textContent=name;el.hidden=true;nameLayer.append(el);avatar.userData.nameLabel=el;}
function updateNameLabels(){
 const blocked=!admitted||initialLoading||!!document.querySelector('dialog[open]');
 const walls=scene.children.filter(o=>o.isMesh&&o.geometry.type==='BoxGeometry'&&o.geometry.parameters.height>2);
 const avatars=[player,...[...remoteVisitors.values()].map(r=>r.avatar)];
 for(const avatar of avatars){const label=avatar.userData.nameLabel;if(!label)continue;label.hidden=true;if(blocked||!avatar.visible)continue;
  const world=avatar.position.clone().add(new THREE.Vector3(0,1.82,0)),screen=world.clone().project(camera);
  if(screen.z< -1||screen.z>1||Math.abs(screen.x)>.98||Math.abs(screen.y)>.98)continue;
  const direction=world.clone().sub(camera.position);nameRay.set(camera.position,direction.clone().normalize());nameRay.far=Math.max(0,direction.length()-.12);if(nameRay.intersectObjects(walls).length)continue;
  label.hidden=false;label.style.left=`${(screen.x*.5+.5)*innerWidth}px`;label.style.top=`${(-screen.y*.5+.5)*innerHeight}px`;
 }
}
let joining=false;
function updateEntryButton(){const name=$('#visitor-name').value.normalize('NFC').trim();$('#enter-gallery').disabled=joining||admitted||!name||Array.from(name).length>16;}
$('#visitor-name').addEventListener('input',updateEntryButton);
$('#visitor-name').addEventListener('change',updateEntryButton);
updateEntryButton();
$('#entry-form').addEventListener('submit',async e=>{
 e.preventDefault();if(joining||admitted)return;
 const name=$('#visitor-name').value.normalize('NFC').trim();
 if(!name||Array.from(name).length>16){$('#entry-error').textContent='이름을 1~16자로 입력해주세요.';$('#visitor-name').focus();return;}
 joining=true;$('#enter-gallery').disabled=true;$('#enter-gallery').textContent='입장 준비 중…';$('#entry-error').textContent='';
 try{
  const res=await cloudPresence.fetch('/api/visitors',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'join',name}),signal:AbortSignal.timeout(8000)});
  const data=await res.json();if(!res.ok)throw new Error(data.error||'입장하지 못했어요. 다시 시도해주세요.');
  visitorName=data.name||name;visitorSession={id:data.id,token:data.token};hasJoined=true;
  if(data.spawn){player.position.x=data.spawn.x;player.position.z=data.spawn.z;}addNameLabel(player,visitorName);receiveVisitors(data.visitors);
  admitted=true;$('#entry-gate').hidden=true;$('#visitor-name').blur();keys.clear();resetStick();updateCamera(0,true);finishEntry();syncPresence();
 }catch(error){$('#entry-error').textContent=error.name==='TimeoutError'?'연결이 지연되고 있어요. 잠시 후 다시 시도해주세요.':error.message;}
 finally{joining=false;updateEntryButton();$('#enter-gallery').textContent='입장하기';}
});
