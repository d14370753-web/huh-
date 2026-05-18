let gameState = "DEVICE_SELECT"; 
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;

// --- 滿版虛擬解析度設定 ---
const V_WIDTH = 540;  
const V_HEIGHT = 720; 
let currentScale = 1;
let offsetX = 0;
let offsetY = 0;

let grid, currentPiece, nextPiece, holdPiece;
let score = 0, level = 1, linesClearedTotal = 0;
let lastDropTime = 0, dropInterval = 800;
let pauseStartTime = 0;
let canHold = true, isRecording = false, shakeAmount = 0;
let selectedSkin = 1; 
let isMobile = false; 

let particles = [];
let stars = [];

// --- 虛擬按鍵變數 ---
let btnPC, btnMobile; 
let btnSkinLeft, btnSkinRight, btnStart; 
let btnLeft, btnDown, btnRight, btnRotate, btnDrop, btnHold, btnPause; 
let btnRestart, btnRecord; 

const skins = [
  { name: "經典原始", border: 1, shadow: 0 },
  { name: "霓虹發光", border: 2, shadow: 15 },
  { name: "復古綠格", border: 1, shadow: 0, forceColor: [20, 150, 20] },
  { name: "半透水晶", border: 4, shadow: 0, alpha: 180 }
];

const SHAPES = {
  'I': [[1, 1, 1, 1]],
  'J': [[1, 0, 0], [1, 1, 1]],
  'L': [[0, 0, 1], [1, 1, 1]],
  'O': [[1, 1], [1, 1]],
  'S': [[0, 1, 1], [1, 1, 0]],
  'T': [[0, 1, 0], [1, 1, 1]],
  'Z': [[1, 1, 0], [0, 1, 1]]
};

const COLORS = {
  'I': '#00f0f0', 'J': '#0000f0', 'L': '#f0a000',
  'O': '#f0f000', 'S': '#00f000', 'T': '#a000f0', 'Z': '#f00000'
};

function setup() {
  let cvs = createCanvas(windowWidth, windowHeight);
  setupRecorder(cvs.elt); 
  
  for (let i = 0; i < 50; i++) {
    stars.push({ x: random(V_WIDTH), y: random(V_HEIGHT), s: random(1, 3), speed: random(0.2, 1) });
  }
  
  initVirtualButtons();
  resetGame();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  background(10, 10, 20); 

  let scaleX = windowWidth / V_WIDTH;
  let scaleY = windowHeight / V_HEIGHT;
  currentScale = min(scaleX, scaleY); 
  offsetX = (windowWidth - V_WIDTH * currentScale) / 2;
  offsetY = (windowHeight - V_HEIGHT * currentScale) / 2;

  push();
  translate(offsetX, offsetY);
  scale(currentScale);

  drawDynamicBackground(); 

  if (shakeAmount > 0) {
    translate(random(-shakeAmount, shakeAmount), random(-shakeAmount, shakeAmount));
    shakeAmount *= 0.85; 
  }

  if (gameState === "DEVICE_SELECT") drawDeviceSelect();
  else if (gameState === "MENU") drawMenu();
  else if (gameState === "PLAYING") playGame();
  else if (gameState === "PAUSED") drawPauseScreen();
  else if (gameState === "GAMEOVER") drawGameOver();

  if (isMobile && gameState !== "DEVICE_SELECT") {
    btnRecord.show();
    if (gameState === "MENU") {
      btnSkinLeft.show(); btnSkinRight.show(); btnStart.show();
    } else if (gameState === "PLAYING" || gameState === "PAUSED") {
      drawMobileControllerPanel();
    } else if (gameState === "GAMEOVER") {
      btnRestart.show();
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].show();
    if (particles[i].isDead()) particles.splice(i, 1);
  }
  pop();
}

function mousePressed() {
  let vMouseX = (mouseX - offsetX) / currentScale;
  let vMouseY = (mouseY - offsetY) / currentScale;

  if (gameState === "DEVICE_SELECT") {
    if (btnPC.isClicked(vMouseX, vMouseY)) btnPC.action();
    if (btnMobile.isClicked(vMouseX, vMouseY)) btnMobile.action();
  } else if (isMobile) {
    if (btnRecord.isClicked(vMouseX, vMouseY)) btnRecord.action();
    
    if (gameState === "MENU") {
      if (btnSkinLeft.isClicked(vMouseX, vMouseY)) btnSkinLeft.action();
      if (btnSkinRight.isClicked(vMouseX, vMouseY)) btnSkinRight.action();
      if (btnStart.isClicked(vMouseX, vMouseY)) btnStart.action();
    } else if (gameState === "PLAYING" || gameState === "PAUSED") {
      if (btnLeft.isClicked(vMouseX, vMouseY)) btnLeft.action();
      if (btnDown.isClicked(vMouseX, vMouseY)) btnDown.action();
      if (btnRight.isClicked(vMouseX, vMouseY)) btnRight.action();
      if (btnRotate.isClicked(vMouseX, vMouseY)) btnRotate.action();
      if (btnDrop.isClicked(vMouseX, vMouseY)) btnDrop.action();
      if (btnHold.isClicked(vMouseX, vMouseY)) btnHold.action();
      if (btnPause.isClicked(vMouseX, vMouseY)) btnPause.action();
    } else if (gameState === "GAMEOVER") {
      if (btnRestart.isClicked(vMouseX, vMouseY)) btnRestart.action();
    }
  }
}

function keyPressed() {
  if (key === 'f' || key === 'F') {
    let fs = fullscreen();
    fullscreen(!fs); 
    return;
  }

  if (gameState === "DEVICE_SELECT") return;
  
  if (key === 'r' || key === 'R') toggleRecording();
  if (key === 'p' || key === 'P') togglePause();

  if (gameState === "MENU" && !isMobile) {
    if (keyCode === RIGHT_ARROW) selectedSkin = (selectedSkin + 1) % skins.length;
    if (keyCode === LEFT_ARROW) selectedSkin = (selectedSkin - 1 + skins.length) % skins.length;
    if (keyCode === ENTER) { resetGame(); gameState = "PLAYING"; }
  } else if (gameState === "PLAYING") {
    if (keyCode === LEFT_ARROW) currentPiece.move(-1, 0);
    if (keyCode === RIGHT_ARROW) currentPiece.move(1, 0);
    if (keyCode === DOWN_ARROW) { if(!currentPiece.move(0, 1)) lockPiece(); }
    if (keyCode === UP_ARROW) currentPiece.rotate();
    if (key === ' ' ) { while(currentPiece.move(0, 1)); lockPiece(); shakeAmount = 10; }
    if (keyCode === SHIFT || key === 'c' || key === 'C') handleHold();
  } else if (gameState === "GAMEOVER" && keyCode === ENTER && !isMobile) gameState = "MENU";
}

class VirtualButton {
  constructor(x, y, w, h, label, action) {
    this.x = x; this.y = y; this.w = w; this.h = h; this.label = label; this.action = action;
  }
  show() {
    push(); stroke(255, 120); strokeWeight(1.5); fill(255, 35); rectMode(CENTER);
    rect(this.x, this.y, this.w, this.h, 10); fill(255); noStroke(); textSize(16); textAlign(CENTER, CENTER);
    text(this.label, this.x, this.y); pop();
  }
  isClicked(mx, my) { return (mx > this.x - this.w/2 && mx < this.x + this.w/2 && my > this.y - this.h/2 && my < this.y + this.h/2); }
}

function initVirtualButtons() {
  btnPC = new VirtualButton(V_WIDTH / 2 - 90, V_HEIGHT / 2, 140, 60, "電腦版\n(鍵盤操作)", () => { isMobile = false; gameState = "MENU"; });
  btnMobile = new VirtualButton(V_WIDTH / 2 + 90, V_HEIGHT / 2, 140, 60, "手機版\n(虛擬按鍵)", () => { isMobile = true; gameState = "MENU"; });
  btnSkinLeft = new VirtualButton(V_WIDTH / 2 - 120, 220, 40, 40, "◀", () => { selectedSkin = (selectedSkin - 1 + skins.length) % skins.length; });
  btnSkinRight = new VirtualButton(V_WIDTH / 2 + 120, 220, 40, 40, "▶", () => { selectedSkin = (selectedSkin + 1) % skins.length; });
  btnStart = new VirtualButton(V_WIDTH / 2, 450, 160, 50, "開始遊戲", () => { resetGame(); gameState = "PLAYING"; });
  btnLeft = new VirtualButton(45, 660, 55, 55, "◀", () => { if (gameState === "PLAYING") currentPiece.move(-1, 0); });
  btnDown = new VirtualButton(110, 660, 55, 55, "▼", () => { if (gameState === "PLAYING") { if (!currentPiece.move(0, 1)) lockPiece(); } });
  btnRight = new VirtualButton(175, 660, 55, 55, "▶", () => { if (gameState === "PLAYING") currentPiece.move(1, 0); });
  btnRotate = new VirtualButton(265, 660, 65, 55, "旋轉", () => { if (gameState === "PLAYING") currentPiece.rotate(); });
  btnDrop = new VirtualButton(340, 660, 65, 55, "硬降", () => { if (gameState === "PLAYING") { while (currentPiece.move(0, 1)); lockPiece(); shakeAmount = 10; } });
  btnHold = new VirtualButton(415, 660, 65, 55, "保留", () => { if (gameState === "PLAYING") handleHold(); });
  btnPause = new VirtualButton(490, 660, 55, 55, "暫停", () => { togglePause(); });
  btnRestart = new VirtualButton(V_WIDTH / 2, V_HEIGHT / 2 + 80, 160, 50, "返回主選單", () => { gameState = "MENU"; });
  btnRecord = new VirtualButton(V_WIDTH - 50, 30, 60, 35, "錄影", () => { toggleRecording(); });
}

function drawMobileControllerPanel() {
  push(); fill(25, 25, 35); stroke(50); rectMode(CORNER); rect(0, 600, V_WIDTH, 120); pop();
  btnLeft.show(); btnDown.show(); btnRight.show(); btnRotate.show(); btnDrop.show(); btnHold.show(); btnPause.show();
}

function drawDeviceSelect() {
  textAlign(CENTER, CENTER); fill(255); textSize(32); text("請選擇操作裝置", V_WIDTH / 2, V_HEIGHT / 2 - 100);
  btnPC.show(); btnMobile.show();
}

function drawDynamicBackground() {
  noStroke(); fill(255, 255, 255, 150);
  for (let s of stars) { ellipse(s.x, s.y, s.s); s.y += s.speed; if (s.y > V_HEIGHT) s.y = 0; }
  stroke(50, 50, 80, 50 + sin(frameCount * 0.05) * 30);
  for (let x = 0; x <= V_WIDTH; x += 40) line(x, 0, x, V_HEIGHT);
  for (let y = 0; y <= V_HEIGHT; y += 40) line(0, y, V_WIDTH, y);
}

function drawMenu() {
  textAlign(CENTER, CENTER); fill(255); textSize(45); text("極限俄羅斯方塊 Pro", V_WIDTH / 2, 120);
  textSize(20); fill(150); text("外觀選擇: < " + skins[selectedSkin].name + " >", V_WIDTH / 2, 220);
  if (!isMobile) {
    fill(0, 255, 255); textSize(16); text("[SHIFT/C] 保留 | [空白] 硬降 | [P] 暫停 | [R] 錄影\n【 電腦提示：按 F 鍵可切換全螢幕 】", V_WIDTH/2, 310);
    fill(255, 255, 0); textSize(24); if (frameCount % 60 < 30) text("按下 ENTER 開始遊戲", V_WIDTH / 2, 450);
  } else {
    fill(0, 255, 255); textSize(16); text("請點擊兩側箭頭換裝\n並使用下方虛擬按鍵遊玩", V_WIDTH/2, 320);
  }
  push(); translate(V_WIDTH / 2 - 15, 360); drawBlock(0, 0, COLORS['T']); pop();
}

function drawGrid() {
  push(); translate(120, 0); 
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      stroke(255, 10); noFill(); rect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
      if (grid[y][x]) drawBlock(x * BLOCK_SIZE, y * BLOCK_SIZE, grid[y][x]);
    }
  }
  pop();
}

function drawSidebar() {
  push(); translate(60, 50); fill(255); textSize(20); textAlign(CENTER); text("保留", 0, 0); if (holdPiece) holdPiece.showPreview(-30, 30); pop();
  push(); translate(COLS * BLOCK_SIZE + 140, 50); fill(255); textAlign(CENTER); text("下一個", 40, 0); nextPiece.showPreview(10, 30);
  translate(0, 150); textSize(16); fill(150); text("得分", 40, 0); fill(255, 255, 0); textSize(28); text(score, 40, 35);
  translate(0, 80); fill(150); text("等級", 40, 0); fill(255); text(level, 40, 30);
  if (isRecording) { fill(255, 0, 0); if (frameCount % 60 < 30) ellipse(40, 150, 12, 12); textSize(14); fill(255); text("錄製中", 40, 175); }
  pop();
}

function drawPauseScreen() {
  push(); drawGrid(); currentPiece.show(); drawSidebar(); fill(0, 180); rect(0, 0, V_WIDTH, V_HEIGHT - (isMobile?120:0));
  fill(255, 255, 0); textSize(50); textAlign(CENTER, CENTER); text("暫停中", V_WIDTH/2, V_HEIGHT/2 - 60); pop();
}

function drawGameOver() {
  fill(0, 220); rect(0, 0, V_WIDTH, V_HEIGHT); textAlign(CENTER, CENTER); fill(255, 50, 50); textSize(60); text("遊戲結束", V_WIDTH/2, V_HEIGHT/2 - 50);
  fill(255); textSize(24); text("最終得分: " + score, V_WIDTH/2, V_HEIGHT/2 + 10);
}

function resetGame() {
  grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  currentPiece = new Piece(); nextPiece = new Piece(); holdPiece = null;
  score = 0; level = 1; linesClearedTotal = 0; dropInterval = 800;
  lastDropTime = millis();
}

function playGame() {
  drawGrid();
  let now = millis();
  if (now - lastDropTime > dropInterval) {
    if (!currentPiece.move(0, 1)) lockPiece(); lastDropTime = now;
  }
  currentPiece.showGhost(); currentPiece.show(); drawSidebar();
}

class Piece {
  constructor(type) {
    this.type = type || random(Object.keys(SHAPES)); this.shape = SHAPES[this.type]; this.color = COLORS[this.type];
    this.x = floor(COLS / 2) - floor(this.shape[0].length / 2); this.y = 0;
  }
  show() { push(); translate(120, 0); for (let r = 0; r < this.shape.length; r++) { for (let c = 0; c < this.shape[r].length; c++) { if (this.shape[r][c]) drawBlock((this.x + c) * BLOCK_SIZE, (this.y + r) * BLOCK_SIZE, this.color); } } pop(); }
  showGhost() {
    let gy = this.y; while (!this.collision(this.x, gy + 1, this.shape)) gy++;
    push(); translate(120, 0); for (let r = 0; r < this.shape.length; r++) { for (let c = 0; c < this.shape[r].length; c++) { if (this.shape[r][c]) drawBlock((this.x + c) * BLOCK_SIZE, (gy + r) * BLOCK_SIZE, this.color, true); } } pop();
  }
  showPreview(px, py) { for (let r = 0; r < this.shape.length; r++) { for (let c = 0; c < this.shape[r].length; c++) { if (this.shape[r][c]) drawBlock(px + c * 20, py + r * 20, this.color); } } }
  move(dx, dy) { if (!this.collision(this.x + dx, this.y + dy, this.shape)) { this.x += dx; this.y += dy; return true; } return false; }
  rotate() { let newShape = this.shape[0].map((_, colIndex) => this.shape.map(row => row[colIndex]).reverse()); if (!this.collision(this.x, this.y, newShape)) this.shape = newShape; }
  collision(nx, ny, shape) {
    for (let r = 0; r < shape.length; r++) { for (let c = 0; c < shape[r].length; c++) { if (shape[r][c]) { let gx = nx + c, gy = ny + r; if (gx < 0 || gx >= COLS || gy >= ROWS || (gy >= 0 && grid[gy][gx])) return true; } } }
    return false;
  }
}

class Particle {
  constructor(x, y, col) { this.x = x; this.y = y; this.col = color(col); this.vel = p5.Vector.random2D().mult(random(2, 6)); this.acc = createVector(0, 0.1); this.lifespan = 255; }
  update() { this.vel.add(this.acc); this.x += this.vel.x; this.y += this.vel.y; this.lifespan -= 5; }
  show() { noStroke(); this.col.setAlpha(this.lifespan); fill(this.col); ellipse(this.x, this.y, random(2, 5)); }
  isDead() { return this.lifespan < 0; }
}

function drawBlock(x, y, col, isGhost = false) {
  let skin = skins[selectedSkin]; let finalCol = skin.forceColor ? color(skin.forceColor) : color(col);
  push();
  if (isGhost) { noFill(); stroke(finalCol); strokeWeight(2); } 
  else {
    if (skin.alpha) finalCol.setAlpha(skin.alpha); fill(finalCol); stroke(255, 80);
    if (skin.shadow > 0) { drawingContext.shadowBlur = skin.shadow; drawingContext.shadowColor = finalCol; }
  }
  rect(x, y, BLOCK_SIZE, BLOCK_SIZE, skin.name === "半透水晶" ? 8 : 2); pop();
}

function spawnExplosion(gridX, gridY, col) {
  let screenX = 120 + gridX * BLOCK_SIZE + BLOCK_SIZE / 2; let screenY = gridY * BLOCK_SIZE + BLOCK_SIZE / 2;
  for (let i = 0; i < 8; i++) particles.push(new Particle(screenX, screenY, col));
}

function lockPiece() {
  for (let r = 0; r < currentPiece.shape.length; r++) { 
    for (let c = 0; c < currentPiece.shape[r].length; c++) { 
      if (currentPiece.shape[r][c]) { 
        let gy = currentPiece.y + r; 
        if (gy <= 0) { gameState = "GAMEOVER"; return; } 
        grid[gy][currentPiece.x + c] = currentPiece.color; 
      } 
    } 
  }
  clearLines(); 
  currentPiece = nextPiece; 
  nextPiece = new Piece(); 
  canHold = true;
}

function clearLines() {
  let clearedRows = [];
  for (let y = ROWS - 1; y >= 0; y--) { if (grid[y].every(cell => cell !== null)) { clearedRows.push({y: y, cells: [...grid[y]]}); grid.splice(y, 1); grid.unshift(new Array(COLS).fill(null)); y++; } }
  if (clearedRows.length > 0) {
    score += [0, 100, 300, 500, 800][clearedRows.length] * level; linesClearedTotal += clearedRows.length; shakeAmount = clearedRows.length * 10; 
    for (let row of clearedRows) { for (let x = 0; x < COLS; x++) spawnExplosion(x, row.y, row.cells[x]); }
    level = floor(linesClearedTotal / 10) + 1; dropInterval = max(100, 800 - (level - 1) * 80);
  }
}

function handleHold() {
  if (!canHold) return;
  if (!holdPiece) { holdPiece = new Piece(currentPiece.type); currentPiece = nextPiece; nextPiece = new Piece(); } 
  else { let tempType = currentPiece.type; currentPiece = new Piece(holdPiece.type); holdPiece = new Piece(tempType); }
  canHold = false;
}

function togglePause() { if (gameState === "PLAYING") { gameState = "PAUSED"; pauseStartTime = millis(); } else if (gameState === "PAUSED") { gameState = "PLAYING"; lastDropTime += (millis() - pauseStartTime); } }

function setupRecorder(canvas) {
  try {
    const stream = canvas.captureStream(30); 
    recorder = new MediaRecorder(stream, { mimeType: 'video/webm', videoBitsPerSecond: 5000000 });
    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = () => { 
      let blob = new Blob(chunks, { type: 'video/webm' }); 
      let a = document.createElement('a'); a.href = URL.createObjectURL(blob); 
      a.download = 'TetrisPro_遊戲紀錄.webm'; a.click(); 
    };
  } catch (e) {
    console.warn("當前瀏覽器不支援 WebM 錄影格式，錄影功能已自動停用。", e);
    recorder = null;
  }
}

function toggleRecording() { 
  if (!recorder) {
    alert("抱歉！您的瀏覽器（或設備）不支援此錄影功能。");
    return;
  }
  isRecording = !isRecording; 
  if (isRecording) { chunks = []; recorder.start(); } else recorder.stop(); 
}