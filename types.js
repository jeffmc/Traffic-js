const CoMBOXSZ = 3;
const CoMBOXSZ2 = CoMBOXSZ*2;

const RENDER_ROLLOVER = true;
// Still need to add rollover collision checking.
const ROLLOVER_FACTOR = 0.85; // TODO: Don't have an overall factor for every car, instead use a measurement on a per car width basis to eliminate any drawing outside of viewport/highway.

const RENDER_GRAPH = false;
const GPTBOXSZ = 2;
const GPTBOXSZ2 = GPTBOXSZ*2;

const LANESZ = 16;
const LANEBUF = 2;

let carThroughput = 0;
let c1, c2, c3;

class Traffic {
  constructor() {
    this.cars = [];
    this.lanes = [[], [], []];
    this.collisions = [];
    this.grapher = new Grapher(null);
    
    this.x = 80;
    this.y = 50;
    this.width = 400;
    this.height = this.lanes.length*(LANESZ+LANEBUF)-LANEBUF; // 42 per car width

    this.grapher.y = this.y + this.height + 10;
    
    c1 = Car.sports();
    c2 = Car.sports();
    c3 = Car.sports();
    this.addCar(c1, 0);
    this.addCar(c2, 1);
    this.addCar(c3, 2);
    c1.instantTopSpeed();
    c3.target(c3.topSpeed);
    
    this.grapher.setCar(c2);
  }
  addCar(car, lane) {
    if (lane == undefined || lane >= this.lanes.length || lane < 0) console.log("INVALID LANE: " + lane);
    car.traffic = this;
    car.y = lane * (LANESZ+LANEBUF);
    this.cars.push(car);
    this.lanes[0].push(car);
  }
  tick() {
    if (c2.speed >= c2.topSpeed) {
      c2.target(0);
    } else if (c2.speed <= 0) {
      c2.target(c2.topSpeed);
    }
    for (const car of this.cars) {
      car.tick();
    }
    for (const col of this.checkCollisions()) {
      this.collisions.push(col);
    }
  }
  checkCollisions() {
    let cols = [];
    for (let i=0;i<this.cars.length;i++) {
      for (let j=i+1;j<this.cars.length;j++) {
        let a = this.cars[i], b = this.cars[j];
        if (a.transform.intersects(b.transform)) {
          cols.push(new Collision(a,b));
        }
      }
    }
    return cols;
  }
  render(gfx) {
    gfx.translate(this.x,this.y);
    gfx.fillStyle = "#222";
    gfx.fillRect(0,0,this.width,this.height);
    gfx.fillStyle = "#333";
    for (let y=0;y<this.height;y+=(LANESZ+LANEBUF)) {
      gfx.fillRect(0,y,this.width,LANESZ);
    }
    for (const car of this.cars) {
      car.render(gfx);
    }
    for (const col of this.collisions) {
      col.draw(gfx);
    }
    if (RENDER_ROLLOVER) {
      gfx.strokeStyle = "#FFF";
      gfxDrawLineOffset(gfx, 
        this.width * -(1-ROLLOVER_FACTOR), 0,
        0, this.height);
    }
    gfx.translate(-this.x,-this.y);
    this.grapher.draw(gfx);
  }
}

class Car {
  static sports() {
    return new Car(0,0,42,16,"#aa2", 0.05, 0.04, 3);
  }
  static semi() {
    return new Car(0,0,115,25,"#2a2", 0.01, 0.01, 1.7);
  }
  static suv() {
    return new Car(0,0,50,20,"#22a", 0.02, 0.03, 2);
  }
  constructor(x,y,w,h,c,a,b,t) {
    this.wheelX = x;
    this.xOffset = 5;
    this.transform = new Transform(x,y,w,h);
    this.color = c;
    this.forceColor = "#22a";
    this.power = a;
    this.braking = b;
    this.topSpeed = t;
    this.targetSpeed = 0;
    this.speed = 0;
    this.traffic = null;

    this.focused = false; // should only have one focused car at any given time.
  }
  instantTopSpeed() {
    this.speed = this.topSpeed;
    this.targetSpeed = this.topSpeed;
  }
  target(t) {
    this.targetSpeed = Math.min(this.topSpeed, Math.max(0,t));
  }

  get x() { return this.transform.x; }
  set x(v) { 
    this.transform.x = v;
    this.wheelX = v - this.xOffset; 
  }
  get wx() { return this.wheelX };
  set wx(v) { this.wheelX = v; }
  get wcx() { return this.wheelX + this.transform.width / 2}; 
  get y() { return this.transform.y; }
  set y(v) { this.transform.y = v; }

  get centerX() { return this.transform.centerX; }
  get centerY() { return this.transform.centerY; }

  get width() { return this.transform.width; }
  set width(v) { this.transform.width = v; }
  get height() { return this.transform.height; }
  set height(v) { this.transform.height = v; }

  tick() {
    // Limiter
    this.target(this.targetSpeed); // Ensure target is within viable bounds (0 <  x < topSpeed )
    
    let exact = false; // If speed is set to topSpeed
    let d = this.targetSpeed - this.speed;
    let a;
    if (d > this.power) {
      a = this.power;
    } else if (d < -this.braking) {
      a = -this.braking;
    } else {
      a = d;
      exact = true;
      this.speed = this.targetSpeed;
    }
    if (a > 0) {
      this.forceColor = "#2a2";
    } else if (a < 0) {
      this.forceColor = "#a22";
    } else {
      this.forceColor = "#22a";
    }
    if (!exact) this.speed += a;
    this.wheelX += this.speed;

    // Rollover
    if (this.wheelX > this.traffic.width) {
      this.wheelX = 0; // TODO: Add throughput measuring here.
      carThroughput++;
    }
    
    // Car sway offset maths
    this.xOffset = this.xOffset + 0.3*(-a*50-this.xOffset);
    this.x = this.wheelX + this.xOffset;
    
  }
  render(gfx) {
    this.drawCar(gfx,this.wheelX,this.y);
    let tw = this.traffic.width;
    let limit = tw * ROLLOVER_FACTOR;
    if (RENDER_ROLLOVER && this.wheelX > limit)
      this.drawCar(gfx, this.wheelX - tw, this.y);
  }
  drawCar(gfx,wx,y) {
    let x = wx + this.xOffset;
    gfx.fillStyle = this.color;
    gfx.fillRect(x,y,this.width,this.height);
    gfx.strokeStyle = this.forceColor;
   
    let cy = y + this.height/2;
    let hw = this.width/2;
    gfxDrawLineP2P(gfx, wx + hw, cy, x + hw, cy);
    gfx.strokeRect(x,y,
                 this.width,this.height);
    gfx.strokeRect(wx+hw-CoMBOXSZ, 
                   cy-CoMBOXSZ, 
                   CoMBOXSZ2, CoMBOXSZ2);
  }
}

class Grapher {
  constructor(car) {
    this.setCar(car);
    this.x = 50;
    this.y = 400;
    this.width = 250;
    this.height = 250;
    this.f = 2;
    this.bg = "#222";
    this.line = "#0cc";
    this.border = "#077";
  }
  setCar(car) {
    if (!car) {
      this.car = null;
    } else {
      this.car = car;
    }
  }
  draw(gfx) {
    if (!RENDER_GRAPH) return;
    gfx.translate(this.x,this.y);
    gfx.fillStyle = this.bg;
    gfx.strokeStyle = this.border;
    gfx.fillRect(0,0,this.width,this.height);
    gfx.strokeRect(0,0,this.width,this.height);
    let c = this.car;
    gfx.translate(0,this.height);
    if (c != undefined && c != null) {
      let stopping = c.speed / c.braking;
      this.f = this.width / stopping;
      let lx = 0, ly = 0, tx, ty;

      // Vertex / scaling
      let vx = stopping;
      let vy = brakingFunc(c,vx);
      if (vy*this.f > this.height) 
        this.f = this.height / vy;
      if (this.f > 10) this.f = 10; // Finalize scalar
      vx *= this.f;
      vy *= -this.f;
      gfx.strokeStyle = this.line;
      
      // Labels
      gfx.strokeStyle = this.border;
      gfx.strokeText("Ticks", 8,10);
      gfx.strokeText("Pixels", -32,-10);
      let v = Math.round(this.width / this.f);
      gfx.strokeText(v, this.width-(v >= 100?16:11),8);
      v = Math.round(this.height / this.f);
      gfx.strokeText(v, v >= 100 ? -20 : -15,-this.height+8);
      

      gfx.strokeStyle = this.line;
      gfxDrawLineP2P(gfx,vx,0,vx,vy); // Draw vertex
      // Points per tick
      for (let x=0;x<stopping;x++) {
        tx = x * this.f;
        ty = brakingFunc(c,x);
        ty *= -this.f;
        gfx.strokeRect(tx-GPTBOXSZ,ty-GPTBOXSZ, GPTBOXSZ2, GPTBOXSZ2);
        if (this.f > 2) gfxDrawLineP2P(gfx,lx,ly,tx,ty);
        lx = tx;
        ly = ty;
      }
      if (this.f > 2) gfxDrawLineP2P(gfx,lx,ly,vx,vy);
    }
    gfx.translate(-this.x,-this.y-this.height);
  }
}

function brakingFunc(c,x) {
  return (-c.braking/2)*x*x +
          (c.speed+c.braking/2)*x;
}

class Collision {
  constructor(a,b) {
    this.a = a;
    this.b = b;
    this.x = (a.transform.cx + b.transform.cx)/2;
    this.y = (a.transform.cy + b.transform.cy)/2;
  }
  draw(gfx) {
    gfx.strokeStyle = "#f00";
    gfx.strokeRect(this.x-2,this.y-2,4,4);
  }
}

class Transform {
  constructor(x = 0, y = 0, w = 0, h = 0) {
    this.val = [x,y,w,h]
  }
  pos(x,y) {
    this.x = x;
    this.y = y;
  }
  size(w,h) {
    this.w = w;
    this.h = h;
  }
  set(x,y,w,h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }
  get x() { return this.val[0]; }
  set x(v) { this.val[0] = v; }
  get y() { return this.val[1]; }
  set y(v) { this.val[1] = v; }
  get w() { return this.val[2]; }
  set w(v) { this.val[2] = v; }
  get h() { return this.val[3]; }
  set h(v) { this.val[3] = v; }

  get width() { return this.w; }
  set width(v) { this.w = v; }
  get height() { return this.h; }
  set height(v) { this.h = v; }

  get rx() { return this.x + this.width; } // right x
  get by() { return this.y + this.height; } // bottom y

  get centerX() { return this.x + this.w / 2};
  get centerY() { return this.y + this.h / 2};

  get cx() { return this.centerX; }
  get cy() { return this.centerY; }
  
  intersects(b) { // o: Other vector
    let a = this;
    return (a.x < b.x + b.w &&
	    a.x + a.w > b.x &&
	    a.y < b.y + b.h &&
	    a.y + a.h > b.y);
  }
}

function gfxDrawLineP2P(gfx,x1,y1,x2,y2) {
  gfx.beginPath();
  gfx.moveTo(x1,y1);
  gfx.lineTo(x2,y2);
  gfx.stroke();
}
function gfxDrawLineOffset(gfx,x1,y1,x2,y2) {
  gfx.beginPath();
  gfx.moveTo(x1,y1);
  gfx.lineTo(x1+x2,y1+y2);
  gfx.stroke();
}

function arrSwap(a,x,y) { // array, a idx, b idx.
  let t = a[x]; // temp
  a[x] = a[y];
  a[y] = t;
  arraySwaps++;
}