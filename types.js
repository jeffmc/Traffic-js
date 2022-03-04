const LANE_HEIGHT = 36;
const HIGHWAY_WIDTH = 500;
const RUNIN_LENGTH = 150; // should also be max vehicle width, 
const LANES = 4;
const DIV_HEIGHT = 2;
const DIV_STRIPE_SIZE = 30;

const TRAFFIC_PADDING = 30;

const TWEEN_LANE_FACTOR = 0.05;

const DEBUG_PDG = 2;


let carThroughput = 0, arraySwaps = 0;

class Traffic {
  constructor() {
    this.cars = [];
    this.queryChains = [];

    this.x = RUNIN_LENGTH; // highway start, RUN in renderer left of this.
    this.y = 50;

    this.laneBoundingBoxes = [];

    // Add a better car insertion space finding algo.
    this.laneInsertX = [];
    this.trafficPadding = TRAFFIC_PADDING;

    let bdgX = 0;
    let bdgY = DIV_HEIGHT;
    let bdgW = RUNIN_LENGTH * 2 + HIGHWAY_WIDTH;
    let bdgH = LANE_HEIGHT;
    for (let i=0;i<LANES;i++) {
      this.queryChains[i] = [];
      this.laneInsertX[i] = 0;
      this.laneBoundingBoxes.push(new Vector(bdgX,bdgY,bdgW,bdgH));
      bdgY += LANE_HEIGHT + DIV_HEIGHT;
    }
    let sport = Car.sports();
    this.addCar(sport, 0);
    this.addCar(Car.suv(), 1);
    this.addCar(Car.semi(), 2);
    this.addCar(Car.semi(), 2);
    this.addCar(Car.semi(), 2);
    this.addCar(Car.semi(), 3);
    this.addCar(Car.suv(), 3);
    sport.attemptMergeDown();
  }

  get x() { return this.posX; }
  set x(v) { this.posX = v; }
  get y() { return this.posY; }
  set y(v) { this.posY = v; }

  get width() { return HIGHWAY_WIDTH; }
  get height() { return LANE_HEIGHT *LANES + DIV_HEIGHT * (LANES+1); }

  insertQuery(query) {
    let lane = query.chainIdx;
    let chain = this.queryChains[lane];
    chain.push(query);
    query.idx = chain.length-1;
    this.sortChainByV(chain);
  }
  removeQuery(query) {
    let chain = queryChain[query.chainIdx];
    let idx = chain.indexOf(query);
    if (idx < 0) alert("QUERY NOT FOUND IN CHAIN!");
  }
  sortChainByV(chain) { // Sort chain by queries' value.
    // Insertion sort ( might be able to find a better algo for my data. )
    let i = 1;
    while (i < chain.length) {
        let j = i;
        while (j > 0 && chain[j-1].v > chain[j].v) {
            this.chainSwap(chain,j,j-1);
            j--;
        }
        i++;
    }
    return;
  }
  chainSwap(c,a,b) { // arrSwap with chainIdx updating.
    arrSwap(c,a,b);
    c[a].idx = a;
    c[b].idx = b;
  }
  addCar(car,lane) {
    this.cars.push(car);
    car.traffic = this;
    car.laneIdx = lane;
    car.y = this.getCarY(car, lane);
    LaneQuery.real(car);
    car.x = this.laneInsertX[lane];
    this.laneInsertX[lane] += car.width + this.trafficPadding;
  }
  tick() {
    for (const car of this.cars) {
      car.tick();
    }
    for (const chain of this.queryChains) {
      this.sortChainByV(chain);
    }
  }
  render(gfx) {
    gfx.translate(this.x,this.y);
    gfx.translate(-RUNIN_LENGTH,0);
    this.drawRoads(gfx);
    for (const car of this.cars) {
      car.render(gfx);
    }
    for (const chain of this.queryChains) {
      for (const query of chain) query.render(gfx);
    }
    for (const lane of this.laneBoundingBoxes) {
      gfx.strokeStyle = "#a2a";
      gfx.strokeRect(lane.x,lane.y,lane.w,lane.h);
    }
    gfx.translate(RUNIN_LENGTH,0);
    gfx.translate(-this.x,-this.y);
  }
  drawRoads(gfx) {
    gfx.fillStyle = "#222"; // road color.
    gfx.fillRect(RUNIN_LENGTH,0,this.width,this.height);
    let ys = [];
    for (let l=0;l<=LANES;l++) {
      let y = l*LANE_HEIGHT + l*DIV_HEIGHT + DIV_HEIGHT / 2;
      ys.push(y);
    }
    gfx.fillStyle = "#aaa"; // div color
    gfx.strokeStyle = "#aaa";
    gfx.setLineDash([40, 10]);
    for (let y of ys) {
      gfx.beginPath();
      gfx.moveTo(this.x, y);
      gfx.lineTo(this.x + this.width, y);
      gfx.stroke();
    }
    gfx.setLineDash([]);
    // gfx.fillRect(x + RUNIN_LENGTH,y,DIV_STRIPE_SIZE, DIV_HEIGHT);
  }
  getLaneAtY(y) {
    let totalLane = LANE_HEIGHT + DIV_HEIGHT;
    return Math.floor(y/totalLane);
  }
  getCarY(car, lane) {
    return lane*LANE_HEIGHT+(lane+1)*DIV_HEIGHT
   + LANE_HEIGHT
   / 2 - car.height / 2;
  }
}

class Car {
  static sports() {
    return new Car(0,0,42,16,"#a22", 0.05, 3);
  }
  static semi() {
    return new Car(0,0,115,25,"#2a2", 0.01, 1.7);
  }
  static suv() {
    return new Car(0,0,50,20,"#22a", 0.02, 2);
  }
  constructor(x,y,w,h,c,a,t) {
    this.transform = new Vector(x,y,w,h);
    this.color = c;
    this.acceleration = a;
    this.topSpeed = t;
    this.speed = 0;
    this.traffic = null;
    this.realQuery = null;
    this.testQuery = null;

    this.focused = false; // should only have one focused car at any given time.
  }

  get x() { return this.transform.x; }
  set x(v) { this.transform.x = v; }
  get y() { return this.transform.y; }
  set y(v) { this.transform.y = v; }

  get centerX() { return this.transform.centerX; }
  get centerY() { return this.transform.centerY; }

  get width() { return this.transform.width; }
  set width(v) { this.transform.width = v; }
  get height() { return this.transform.height; }
  set height(v) { this.transform.height = v; }

  get lane() { return this.traffic.getLaneAtY(this.centerY); }

  cleanTestQuery() {
    if (this.testQuery == null) return;
    this.traffic.removeQuery(this.testQuery); 
    this.testQuery = null;
  }
  cleanRealQuery() {
    if (this.realQuery == null) return;
    this.traffic.removeQuery(this.realQuery);
    this.realQuery = null;
  }
  attemptMergeDown() {
    LaneQuery.test(this,1);
  }

  tick() {
    if (this.speed < this.topSpeed) {
      this.speed += this.acceleration;
    } else {
      this.speed = this.topSpeed;
    }
    this.x += this.speed;
    if (this.x > this.traffic.width + RUNIN_LENGTH) {
      this.x = 0; // TODO: Add throughput measuring here.
      carThroughput++;
    }

    // if (this.targetY) {
    //   this.movingLanes = true;
    //   let delta = ( this.targetY - this.y ) * TWEEN_LANE_FACTOR;
    //   if (Math.abs(delta) < TWEEN_LANE_FACTOR) {
    //     this.y = this.targetY;
    //     this.targetY = null;
    //   } else {
    //     this.y += delta;
    //   }
    // } else {
    //   this.movingLanes = false;
    // }
  }
  render(gfx) {
    gfx.fillStyle = this.color;
    gfx.fillRect(this.x,this.y,this.width,this.height);
  }
}

class LaneQuery {
  // clean, create new, and insert query for car.
  static real(car) {
    let q = new LaneQuery(new Vector(), car.lane, car, true);
    car.cleanRealQuery();
    car.realQuery = q;
    car.traffic.insertQuery(q);
    return q;
  }

  static test(car, loffset) {
    let q = new LaneQuery(new Vector(0,(LANE_HEIGHT + DIV_HEIGHT) * loffset), car.lane + loffset, car, false);
    car.cleanTestQuery();
    car.testQuery;
    car.traffic.insertQuery(q);
    return q;
  }

  constructor(offset, chainIdx, car, real) {
    this.offset = offset; // Vector (only x,y, inherits size from owner)
    this.chainIdx = chainIdx;
    this.idx = -1;
    this.owner = car;
    this.real = real;

    // this.tempNext = null;
  }
  render(gfx) {
    gfx.strokeStyle = this.real ? "#aaa" : "#aa2";
    gfx.strokeRect(this.x, this.y, this.width, this.height);
    if (!this.real) gfxDrawLineP2P(gfx, this.centerX, this.centerY, this.owner.centerX, this.owner.centerY);
    let dn = this.distNext();
    if (dn != null) {
      gfx.strokeStyle = "#2aa";
      gfxDrawLineOffset(gfx, this.rx, this.centerY, dn, 0);
    }
  }
  distNext() { // TODO: Fix this with respect to new RUNIN rules.
  // Add memorized getter per tick as to only calculate once per tick.
    let next = this.next;
    if (next == this) return null;
    if (next.x < this.rx) {
      return HIGHWAY_WIDTH + RUNIN_LENGTH - this.rx + next.x;
    } else {
      return next.x - this.rx;
    }
  }

  get next() {
    let nidx = this.idx + 1;
    let chain = this.chain;
    return chain[(nidx < chain.length ? nidx : 0)]; // return next or first if last.
  }

  get chain() {
    return this.traffic.queryChains[this.chainIdx];
  }

  get traffic() {
    return this.owner.traffic;
  }

  get x() { return this.owner.x + this.offset.x; }
  get y() { return this.owner.y + this.offset.y; }
  get width() { return this.owner.width; }
  get height() { return this.owner.height; }

  get rx() { return this.x + this.width; }
  get by() { return this.y + this.height; }
  
  get centerX() { return this.owner.centerX + this.offset.x; }
  get centerY() { return this.owner.centerY + this.offset.y; }

  get v() { return this.x; } // Used in chain sorting.

}

class Vector {
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

  // intersects(o) { // o: Other vector
  //   // TODO: Add boolean return.
  // }
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