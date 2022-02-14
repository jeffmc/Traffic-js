// Stats setup - http://mrdoob.github.io/stats.js/
var stats = new Stats();
stats.showPanel(1); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom);

// Canvas Setup
let canvas = document.querySelector("canvas");
let ctx = canvas.getContext("2d");
ctx.lineWidth = 1;
ctx.translate(0.5, 0.5);

let traffic = new Traffic();

// Loop
function draw() {
  stats.begin();

  // LOGIC

  traffic.tick();

  // RENDERING

  // Background fill
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, 700, 700); // TODO: Find canvas values systematically.

  traffic.render(ctx);

  stats.end();
  requestAnimationFrame(draw);
}

// Start loop
requestAnimationFrame(draw);
