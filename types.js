const CoMBOXSZ = 3;
const CoMBOXSZ2 = CoMBOXSZ*2;

const LANESZ = 16;
const LANEBUF = 2;

let carThroughput = 0;
let c1, c2;

class Traffic {
  constructor() {
    this.cars = [];
    this.lanes = [[], [], []];
    this.collisions = [];
    
    this.x = 10;
    this.y = 50;
    this.width = 400;
    this.height = this.lanes.length*(LANESZ+LANEBUF)-LANEBUF; // 42 per car width

    c1 = Car.sports();
    c2 = Car.sports();
    this.addCar(c1, 1);
    this.addCar(c2, 0);
    c1.instantTopSpeed();
    c2.target(c2.topSpeed);
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
    gfx.translate(-this.x,-this.y);
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
    if (this.targetSpeed > this.topSpeed) {
      this.targetSpeed = this.topSpeed;
    }
    let d = this.targetSpeed - this.speed;
    let a;
    if (d >= this.power) {
      a = this.power;
    } else if (d <= -this.braking) {
      a = -this.braking;
    } else {
      a = d;
    }
    if (a > 0) {
      this.forceColor = "#2a2";
    } else if (a < 0) {
      this.forceColor = "#a22";
    } else {
      this.forceColor = "#22a";
    }
    this.speed += a;
    this.wheelX += this.speed;
    this.xOffset = this.xOffset + 0.3*(-a*50-this.xOffset);
    this.x = this.wheelX + this.xOffset;
    if (this.x > this.traffic.width) {
      this.x = 0; // TODO: Add throughput measuring here.
      carThroughput++;
    }
  }
  render(gfx) {
    gfx.fillStyle = this.color;
    gfx.fillRect(this.x,this.y,this.width,this.height);
    gfx.strokeStyle = this.forceColor;
   
    // gfxDrawLineOffset(gfx, this.x, this.centerY, 
    //                   this.width, 0);
    // gfxDrawLineOffset(gfx, this.centerX, this.y,
    //                  0, this.height);
    gfxDrawLineP2P(gfx, this.wcx,this.centerY,
                  this.centerX,this.centerY);
    gfx.strokeRect(this.x,this.y,this.width,this.height);
    gfx.strokeRect(this.wcx-CoMBOXSZ,this.centerY-CoMBOXSZ,CoMBOXSZ2,CoMBOXSZ2);
  }
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