const LANE_HEIGHT = 36;
const HIGHWAY_WIDTH = 500;
const LANES = 4;
const DIV_HEIGHT = 2;
const DIV_STRIPE_SIZE = 30;

const TWEEN_LANE_FACTOR = 0.05;

class Traffic {
  constructor() {
    this.cars = [];
    this.queryStarts = [null, null, null, null];
    this.width = HIGHWAY_WIDTH;
    this.height = LANE_HEIGHT *LANES + DIV_HEIGHT * (LANES+1);
    this.addCar(Car.sports(), 0);
    this.addCar(Car.semi(), 1);
    this.addCar(Car.suv(), 2);
  }
  insertQuery(query) {
    // TODO: add
  }
  addCar(car,lane) {
    this.cars.push(car);
    car.traffic = this;
    car.y(this.getCarY(car, lane));
    car.realQuery.laneIdx = lane;
    this.insertQuery(car.realQuery);
  }
  tick() {
    for (const car of this.cars) {
      car.tick();
    }
  }
  render(gfx) {
    this.drawRoads(gfx);
    for (const car of this.cars) {
      car.render(gfx);
    } 
  }
  drawRoads(gfx) {
    gfx.fillStyle = "#222"; // road color.
    gfx.fillRect(0,0,this.width,this.height);
    let ys = [];
    for (let l=0;l<=LANES;l++) {
      ys.push(l*LANE_HEIGHT
     + l*DIV_HEIGHT
    );
    }
    gfx.beginPath();
    gfx.rect(0,0,HIGHWAY_WIDTH, LANE_HEIGHT
  *LANES+(LANES+1)*DIV_HEIGHT
);
    gfx.clip();
    gfx.fillStyle = "#aaa"; // div color
    for (let x=0; x < HIGHWAY_WIDTH; x+= DIV_STRIPE_SIZE * 2) {
      for (const y of ys) {
        gfx.fillRect(x,y,DIV_STRIPE_SIZE, DIV_HEIGHT
      );
      }
    }
  }
  getLaneAtY(y) {
    let totalLane = LANE_HEIGHT + DIV_HEIGHT;
    return Math.floor(y/totalLane);
  }
  getCarY(car, lane) {
    return lane*LANE_HEIGHT+(lane+1)*DIV_HEIGHT
   + LANE_HEIGHT
   / 2 - car.height() / 2;
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
    this.transform = [x,y,w,h];
    this.color = c;
    this.acceleration = a;
    this.topSpeed = t;
    this.speed = 0;
    this.traffic = null;
    this.targetY = null;
    this.movingLanes = false;
    this.realQuery = new LaneQuery(this.transform,-1,this,true);
  }
  x(v) {
    if (v) this.transform[0] = v;
    return this.transform[0];
  }
  y(v) {
    if (v) this.transform[1] = v;
    return this.transform[1];
  }
  centerY() {
    return this.transform[1] + this.transform[3] / 2;
  }
  width(v) {
    if (v) this.transform[2] = v;
    return this.transform[2];
  }
  height(v) {
    if (v) this.transform[3] = v;
    return this.transform[3];
  }
  changeLane(lane) {
    this.targetY = this.traffic.getCarY(this,lane);
  }
  tick() {
    if (this.speed < this.topSpeed) {
      this.speed += this.acceleration;
    } else {
      this.speed = this.topSpeed;
    }
    let tx = this.transform;
    tx[0] += this.speed;
    if (tx[0] > this.traffic.width) tx[0] = -tx[2]; // TODO: Add throughput measuring here.
    if (this.targetY) {
      this.movingLanes = true;
      let delta = ( this.targetY - tx[1] ) * TWEEN_LANE_FACTOR;
      if (Math.abs(delta) < TWEEN_LANE_FACTOR) {
        tx[1] = this.targetY;
        this.targetY = null;
      } else {
        tx[1] += delta;
      }
    } else {
      this.movingLanes = false;
    }
  }
  render(gfx) {
    gfx.fillStyle = this.color;
    let tx = this.transform;
    gfx.fillRect(tx[0],tx[1],tx[2],tx[3]);
  }
}

class LaneQuery {
  constructor(transform, laneIdx, car, real) {
    this.transform = transform;
    this.laneIdx = laneIdx;
    this.owner = car; 
    this.real = real;
    this.next = null;
    this.last = null;
  }
  traffic() {
    return this.owner.traffic;
  }
  render(gfx) {
    gfx.strokeStyle = "#aaa";
    let tx = this.transform;
    gfx.strokeRect(tx[0],tx[1],tx[2],tx[3]);
  }
}