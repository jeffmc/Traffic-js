const LANE_HEIGHT = 36;
const HIGHWAY_WIDTH = 500;
const LANES = 4;
const DIV_HEIGHT = 2;
const DIV_STRIPE_SIZE = 30;

class Traffic {
  constructor() {
    this.cars = [];
    this.width = HIGHWAY_WIDTH;
    this.height = LANE_HEIGHT *LANES + DIV_HEIGHT * (LANES+1);
    this.addCar(Car.sports(), 0);
    this.addCar(Car.semi(), 1);
    this.addCar(Car.suv(), 2);
  }
  addCar(car,lane) {
    this.cars.push(car);
    car.traffic = this;
    car.y = this.getCarY(car, lane)
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
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
    this.color = c;
    this.acceleration = a;
    this.topSpeed = t;
    this.speed = 0;
    this.traffic = null;
  } 
  tick() {
    if (this.speed < this.topSpeed) {
      this.speed += this.acceleration;
    } else {
      this.speed = this.topSpeed;
    }
    this.x += this.speed;
    if (this.x > this.traffic.width) this.x = -this.width; 
  }
  render(gfx) {
    gfx.fillStyle = this.color;
    gfx.fillRect(this.x,this.y,this.width,this.height);
  }
}