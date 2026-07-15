(function() {
const canvas = document.getElementById('simCanvas');
//const ctx = canvas.getContext('2d');

const baseurl = "http://localhost"


let loginlink = "http://localhost:1337/auth"


let contributionlink = loginlink+'/contribute'
let environmentlink = loginlink+'/env'
let modelinglink = loginlink+'/modeling'


document.querySelectorAll('a.contribution-link').forEach(link => {
    link.href = contributionlink;
});

document.querySelectorAll('a.env-link').forEach(link => {
    link.href = environmentlink;
});

document.querySelectorAll('a.modeling-link').forEach(link => {
    link.href = modelinglink;
});

// Responsive canvas
function resizeCanvas() {
const container = canvas.parentElement;
const w = container.clientWidth;
canvas.width = w;
canvas.height = Math.min(400, Math.floor(w * 0.42));
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Simulation state
let agents = [];
let paused = false;
let step = 0;
let collisionCount = 0;
const MAX_SPEED = 1.4;

// Agent class
class Agent {
constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * MAX_SPEED;
    this.vy = (Math.random() - 0.5) * MAX_SPEED;
    this.size = 7 + Math.random() * 4;
    this.phase = Math.random() * Math.PI * 2;
    this.hue = 160 + Math.random() * 40;
    this.trail = [];
}

update(w, h) {
    if (paused) return;

    // Store trail
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 22) this.trail.shift();

    this.phase += 0.04;
    this.x += this.vx;
    this.y += this.vy;

    // Boundary bounce
    if (this.x < this.size) { this.x = this.size; this.vx *= -1; }
    if (this.x > w - this.size) { this.x = w - this.size; this.vx *= -1; }
    if (this.y < this.size) { this.y = this.size; this.vy *= -1; }
    if (this.y > h - this.size) { this.y = h - this.size; this.vy *= -1; }

    // Subtle steering
    this.vx += Math.sin(this.phase) * 0.04;
    this.vy += Math.cos(this.phase * 0.7) * 0.03;
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > MAX_SPEED) {
    this.vx = (this.vx / speed) * MAX_SPEED;
    this.vy = (this.vy / speed) * MAX_SPEED;
    }
}

drawTrail(ctx) {
    for (let i = 0; i < this.trail.length; i++) {
    const t = this.trail[i];
    const alpha = (i / this.trail.length) * 0.4;
    ctx.beginPath();
    ctx.arc(t.x, t.y, this.size * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${this.hue}, 65%, 45%, ${alpha})`;
    ctx.fill();
    }
}

draw(ctx) {
    this.drawTrail(ctx);
    // Body
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${this.hue}, 65%, 50%)`;
    ctx.fill();
    // Glow ring
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size + 3, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${this.hue}, 65%, 50%, 0.3)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Direction dot
    const nx = this.x + (this.vx / Math.sqrt(this.vx*this.vx + this.vy*this.vy)) * this.size * 1.1;
    const ny = this.y + (this.vy / Math.sqrt(this.vx*this.vx + this.vy*this.vy)) * this.size * 1.1;
    ctx.beginPath();
    ctx.arc(nx, ny, 2, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${this.hue}, 80%, 70%, 0.9)`;
    ctx.fill();
}
}

// Initialize agents
function initAgents(n) {
agents = [];
const w = canvas.width, h = canvas.height;
for (let i = 0; i < n; i++) {
    const x = 60 + Math.random() * (w - 120);
    const y = 60 + Math.random() * (h - 120);
    agents.push(new Agent(x, y));
}
step = 0;
collisionCount = 0;
updateStats();
}

// Collision detection
function checkCollisions() {
for (let i = 0; i < agents.length; i++) {
    for (let j = i + 1; j < agents.length; j++) {
    const dx = agents[j].x - agents[i].x;
    const dy = agents[j].y - agents[i].y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = agents[i].size + agents[j].size;
    if (dist < minDist && dist > 0) {
        collisionCount++;
        const overlap = (minDist - dist) / 2;
        const nx = dx / dist, ny = dy / dist;
        agents[i].x -= nx * overlap; agents[i].y -= ny * overlap;
        agents[j].x += nx * overlap; agents[j].y += ny * overlap;
        // Elastic response
        const dvx = agents[i].vx - agents[j].vx;
        const dvy = agents[i].vy - agents[j].vy;
        const dot = dvx * nx + dvy * ny;
        agents[i].vx -= dot * nx * 0.6;
        agents[i].vy -= dot * ny * 0.6;
        agents[j].vx += dot * nx * 0.6;
        agents[j].vy += dot * ny * 0.6;
    }
    }
}
}

// Draw environment
function drawEnvironment() {
const w = canvas.width, h = canvas.height;

// Background
ctx.fillStyle = '#f5f7f9';
ctx.fillRect(0, 0, w, h);

// Grid
ctx.strokeStyle = 'rgba(200,210,225,0.35)';
ctx.lineWidth = 0.5;
for (let x = 0; x < w; x += 48) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
}
for (let y = 0; y < h; y += 48) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
}

// Border
ctx.strokeStyle = 'rgba(100,116,139,0.25)';
ctx.lineWidth = 1;
ctx.strokeRect(0, 0, w, h);
}

// Main draw
function draw() {
const w = canvas.width, h = canvas.height;
drawEnvironment();

if (!paused) {
    agents.forEach(a => a.update(w, h));
    checkCollisions();
    step++;
}

agents.forEach(a => a.draw(ctx));
updateStats();
requestAnimationFrame(draw);
}

// Update stats
function updateStats() {
document.getElementById('statAgents').textContent = agents.length;
document.getElementById('statStep').textContent = step;
document.getElementById('statCollisions').textContent = collisionCount;
}

// Event listeners
document.getElementById('btn-reset').addEventListener('click', () => {
initAgents(parseInt(document.getElementById('agentSlider').value));
});

const pauseBtn = document.getElementById('btn-pause');
pauseBtn.addEventListener('click', () => {
paused = !paused;
pauseBtn.innerHTML = paused
    ? `<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 2l8 4-8 4V2z"/></svg>Resume`
    : `<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="2" width="3" height="8" rx="1"/><rect x="7" y="2" width="3" height="8" rx="1"/></svg>Pause`;
});

document.getElementById('btn-add-agent').addEventListener('click', () => {
const w = canvas.width, h = canvas.height;
const x = 60 + Math.random() * (w - 120);
const y = 60 + Math.random() * (h - 120);
agents.push(new Agent(x, y));
document.getElementById('agentSlider').value = agents.length;
document.getElementById('agentCount').textContent = agents.length;
});

document.getElementById('agentSlider').addEventListener('input', function() {
const n = parseInt(this.value);
document.getElementById('agentCount').textContent = n;
if (n > agents.length) {
    const w = canvas.width, h = canvas.height;
    for (let i = agents.length; i < n; i++) {
    const x = 60 + Math.random() * (w - 120);
    const y = 60 + Math.random() * (h - 120);
    agents.push(new Agent(x, y));
    }
} else {
    agents.length = n;
}
});

// Click on canvas to place agent
canvas.addEventListener('click', function(e) {
const rect = canvas.getBoundingClientRect();
const scaleX = canvas.width / rect.width;
const scaleY = canvas.height / rect.height;
const x = (e.clientX - rect.left) * scaleX;
const y = (e.clientY - rect.top) * scaleY;
agents.push(new Agent(x, y));
document.getElementById('agentSlider').value = agents.length;
document.getElementById('agentCount').textContent = agents.length;
});

// Start
initAgents(5);
draw();
})();