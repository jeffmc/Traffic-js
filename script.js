// Stats setup - http://mrdoob.github.io/stats.js/
var stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom);

// Canvas Setup
let canvas = document.querySelector("canvas");
let ctx = canvas.getContext("2d");
ctx.lineWidth = 1;
ctx.translate(0.5, 0.5);

let traffic = new Traffic();

let runningCheckbox = document.querySelector("#running");

// Loop
function draw() {
  stats.begin();

  // LOGIC
  if (runningCheckbox.checked) {
    traffic.tick();
  }

  // RENDERING

  // Background fill
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height); // TODO: Find canvas values systematically.

  traffic.render(ctx);

  stats.end();
  requestAnimationFrame(draw);
}

// Start loop
requestAnimationFrame(draw);
