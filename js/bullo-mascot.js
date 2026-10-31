(() => {
"use strict";
if (!window.Phaser || document.querySelector("#bullo-mascot canvas")) return;
const parent=document.getElementById("bullo-mascot");
if(!parent)return;
const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
class BulloScene extends Phaser.Scene{
 constructor(){super("Bullo");this.mode="peek";this.busy=false;this.lastApproach=0;this.lastAction=0;this.pointer={x:-9999,y:-9999,active:false};}
 preload(){["body","arm-left","arm-right","foot-left","foot-right","face","pupil-left","pupil-right"].forEach(k=>this.load.svg(k,"assets/bullo/"+k+".svg",{width:300,height:300}));}
 create(){
  this.bullo=this.add.container(150,230).setScale(.5);
  const part=(key,px=150,py=150)=>{let o=this.add.image(px-150,py-150,key).setOrigin(px/300,py/300);this.bullo.add(o);return o;};
  this.footL=part("foot-left",80,220);this.footR=part("foot-right",200,218);
  this.armL=part("arm-left",80,190);this.armR=part("arm-right",216,190);
  part("body");part("face");this.eyeL=part("pupil-left");this.eyeR=part("pupil-right");
  this.lastApproach=this.time.now;this.lastAction=this.time.now;
  this.move=e=>{this.pointer.x=e.clientX;this.pointer.y=e.clientY;this.pointer.active=true;};
  this.leave=()=>this.pointer.active=false;
  window.addEventListener("pointermove",this.move,{passive:true});
  window.addEventListener("blur",this.leave);window.addEventListener("pointerleave",this.leave);
  this.input.on("pointerdown",()=>{if(this.mode==="full"&&!this.busy)this.tapReact();});
  this.events.once("shutdown",()=>{window.removeEventListener("pointermove",this.move);window.removeEventListener("blur",this.leave);window.removeEventListener("pointerleave",this.leave);});
  this.tweens.add({targets:this.bullo,y:225,duration:reduced?100:800,ease:"Sine.easeOut"});
  this.time.addEvent({delay:250,loop:true,callback:()=>this.checkNear()});
  this.time.addEvent({delay:900,loop:true,callback:()=>this.autonomy()});
 }
 near(){const r=parent.getBoundingClientRect();return Math.hypot(this.pointer.x-(r.left+r.width/2),this.pointer.y-(r.top+r.height/2))<(innerWidth<600?145:175);}
 checkNear(){
  if(!this.pointer.active||this.busy)return;
  if(this.near()&&this.mode!=="hidden"){this.lastApproach=this.time.now;this.mode="hidden";this.busy=true;this.tweens.killTweensOf(this.bullo);this.tweens.add({targets:this.bullo,y:455,duration:reduced?100:400,ease:"Back.easeIn",onComplete:()=>this.busy=false});}
  else if(!this.near()&&this.mode==="hidden"&&this.time.now-this.lastApproach>1800){this.mode="peek";this.busy=true;this.tweens.add({targets:this.bullo,y:225,duration:reduced?100:600,ease:"Sine.easeOut",onComplete:()=>this.busy=false});}
 }
 autonomy(){
  if(this.busy||this.mode==="hidden"||this.time.now-this.lastApproach<60000)return;
  if(this.mode==="peek"){this.mode="full";this.busy=true;this.tweens.add({targets:this.bullo,y:150,duration:reduced?100:650,ease:"Back.easeOut",onComplete:()=>this.busy=false});return;}
  if(this.mode!=="full"||this.time.now-this.lastAction<7000)return;
  this.lastAction=this.time.now;
  Phaser.Utils.Array.GetRandom([()=>this.wave(),()=>this.look(),()=>this.jump(),()=>this.think(),()=>this.tired(),()=>this.blink()])();
 }
 wave(){this.busy=true;this.tweens.add({targets:this.armR,angle:-48,yoyo:true,repeat:3,duration:reduced?80:220,onComplete:()=>{this.armR.angle=0;this.busy=false;}});}
 look(){this.busy=true;this.tweens.add({targets:[this.eyeL,this.eyeR],x:"+=9",yoyo:true,repeat:1,duration:reduced?80:280,onComplete:()=>this.busy=false});}
 jump(){this.busy=true;this.tweens.add({targets:this.bullo,y:105,yoyo:true,duration:reduced?100:320,onComplete:()=>this.busy=false});}
 think(){this.busy=true;this.tweens.add({targets:this.armL,angle:35,yoyo:true,duration:reduced?100:450,onComplete:()=>{this.armL.angle=0;this.busy=false;}});}
 tired(){this.busy=true;this.tweens.add({targets:this.bullo,angle:5,yoyo:true,repeat:1,duration:reduced?100:400,onComplete:()=>{this.bullo.angle=0;this.busy=false;}});}
 blink(){this.tweens.add({targets:[this.eyeL,this.eyeR],scaleY:.1,yoyo:true,duration:100});}
 tapReact(){this.wave();this.tweens.add({targets:this.bullo,scale:.55,yoyo:true,duration:170,onComplete:()=>this.bullo.setScale(.5)});}
 update(){
  if(this.mode==="hidden"||!this.pointer.active)return;
  const r=parent.getBoundingClientRect(),dx=Phaser.Math.Clamp((this.pointer.x-(r.left+r.width/2))/r.width,-1,1),dy=Phaser.Math.Clamp((this.pointer.y-(r.top+r.height/2))/r.height,-1,1);
  this.eyeL.x=-37+dx*3;this.eyeR.x=33+dx*3;this.eyeL.y=this.eyeR.y=-18+dy*2;
 }
}
new Phaser.Game({type:Phaser.CANVAS,parent:"bullo-mascot",width:300,height:300,transparent:true,render:{antialias:true},scale:{mode:Phaser.Scale.NONE},scene:[BulloScene]});
})();