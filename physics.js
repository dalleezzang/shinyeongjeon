// Feet are 5 mm above the supporting mesh; floor top is 0.115 m.
export const FLOOR_Y=.12, FOOT_OFFSET=.005, CEILING_Y=3.05;
export function insideGallery(x,z){return (x>=-8.04&&x<=8.04&&z>=-6.04&&z<=6.15)||(x>=-2.67&&x<=2.67&&z>=5.9&&z<=10.15);}
export function canMove(x,z,y,obstacles){
 if(!insideGallery(x,z))return false;
 return !obstacles.some(o=>Math.abs(x-o.x)<o.w/2+.28&&Math.abs(z-o.z)<o.d/2+.28&&(!o.climbable||y<o.top+FOOT_OFFSET-.015));
}
export function supportHeight(x,z,y,obstacles){
 let support=FLOOR_Y;
 for(const o of obstacles){if(!o.climbable)continue;const top=o.top+FOOT_OFFSET;
  if(top<=y+.02&&Math.abs(x-o.x)<o.w/2+.16&&Math.abs(z-o.z)<o.d/2+.16)support=Math.max(support,top);
 }
 return support;
}
export function verticalStep({x,z,y,velocity,jumps},dt,obstacles){
 const support=supportHeight(x,z,y,obstacles);
 if(velocity===0&&Math.abs(y-support)<.021)return {y:support,velocity:0,jumps:0,grounded:true};
 if(velocity===0&&y>support+.02)jumps=Math.max(1,jumps);
 velocity-=12*dt;let next=y+velocity*dt;
 if(next>CEILING_Y){next=CEILING_Y;velocity=Math.min(0,velocity);}
 if(velocity<=0&&next<=support)return {y:support,velocity:0,jumps:0,grounded:true};
 return {y:next,velocity,jumps,grounded:false};
}
