const Game = {
    canvas: document.getElementById('gameCanvas'),
    ctx: null,
    miniCanvas: document.getElementById('minimap-canvas'),
    miniCtx: null,
    width: 0, height: 0,
    lastTime: 0,

    // Game State
    gameTime: 8,
    day: 1,
    paused: false,
    bossSpawned: false,
    atHome: false,
    sleeping: false,
    sleepTimer: 0,

    // Maps & Persistence
    maps: { world: null, home: null },
    worldEntities: [],
    homeEntities: [],

    // Systems
    camera: { x: 0, y: 0, targetX: 0, targetY: 0, shake: 0 },
    input: { keys: {}, mouse: { x: 0, y: 0, down: false, click: false } },
    map: null,
    player: null,
    entities: [],
    particles: [],
    floaters: [],
    projectiles: [],
    trails: [],

    init() {
        this.ctx = this.canvas.getContext('2d');
        this.miniCtx = this.miniCanvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Controls
        window.addEventListener('keydown', e => {
            this.input.keys[e.key.toLowerCase()] = true;
            if (this.sleeping) {
                if (e.key === 'w' || e.key === 'a' || e.key === 's' || e.key === 'd') this.stopSleep();
                return;
            }
            if (e.key === 'i') this.toggleInventory();
            if (e.key === 'r') this.player.rest(); // Now calls triggers sleep
            if (e.key === '1') this.player.useSkill(0);
            if (e.key === '2') this.player.useSkill(1);
            if (e.key === '3') this.player.useSkill(2);
            if (e.key === 'f') this.player.meditating = true;
            if (e.key === ' ') this.player.interact();
        });
        window.addEventListener('keyup', e => {
            this.input.keys[e.key.toLowerCase()] = false;
            if (e.key === 'f') this.player.meditating = false;
        });

        this.canvas.addEventListener('mousemove', e => {
            const r = this.canvas.getBoundingClientRect();
            this.input.mouse.x = e.clientX - r.left;
            this.input.mouse.y = e.clientY - r.top;
        });
        this.canvas.addEventListener('mousedown', () => { this.input.mouse.down = true; this.input.mouse.click = true; });
        this.canvas.addEventListener('mouseup', () => this.input.mouse.down = false);

        // Load or Start
        const save = localStorage.getItem(SAVE_KEY);
        if (save) {
            try {
                const data = JSON.parse(save);
                this.showModal("Welcome Back", "The path of cultivation is endless.", () => {
                    this.loadGame(data);
                    this.loop(0);
                });
            } catch (e) {
                console.error(e);
                this.startNew("Corrupted Save Detected. Starting fresh.");
            }
        } else {
            this.startNew("Welcome, Disciple.<br><br>Gather Qi. Craft Gear. Defeat Beasts.<br>Beware the Spirit King.");
        }
    },

    startNew(msg) {
        this.showModal("Aetheria v5.5", msg, () => {
            this.loadWorld();
            this.loop(0);
        });
    },

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.ctx.imageSmoothingEnabled = false;
    },

    saveGame() {
        if (!this.player) return;
        // Only allow save if in home? or anywhere?
        // Let's stick effectively to "Rest saves game", which is now only at home.
        // But we preserve the regular save mechanism for now.
        const data = {
            version: '5.5',
            player: this.player.serialize(),
            day: this.day,
            time: this.gameTime,
            boss: this.bossSpawned,
            atHome: this.atHome
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
        this.addLog("Game Saved.", "info");
    },

    loadGame(data) {
        // For simplicity, we just reload the world and place player.
        // Complex persistence of entities is skipped in this basic version.
        this.loadWorld(false);
        this.day = data.day;
        this.gameTime = data.time;
        this.bossSpawned = data.boss;
        this.player = new Player(0, 0);
        this.player.deserialize(data.player);

        // Handle location
        if (data.atHome) {
            // Force enter home
            this.enterHome(true);
        } else {
            // Ensure on world map
            this.exitHome(true);
            this.player.x = data.player.x;
            this.player.y = data.player.y;
        }
    },

    loadWorld(resetPlayer = true) {
        // Generate World Map
        this.maps.world = new TileMap(MAP_SIZE, MAP_SIZE, 'world');
        this.worldEntities = [];

        // Generate Home Map
        this.maps.home = new TileMap(20, 20, 'home');
        this.homeEntities = [];

        // Setup World Entities
        const houseX = (MAP_SIZE / 2) * TILE_SIZE;
        const houseY = (MAP_SIZE / 2) * TILE_SIZE;
        this.worldEntities.push(new Entity(houseX - 40, houseY - 40, 80, 80, 'house')); // Large house

        for (let i = 0; i < 300; i++) {
            let x = Math.floor(Math.random() * MAP_SIZE) * TILE_SIZE;
            let y = Math.floor(Math.random() * MAP_SIZE) * TILE_SIZE;
            if (this.maps.world.isSolid(x, y) || Math.hypot(x - houseX, y - houseY) < 400) continue;

            const r = Math.random();
            if (r > 0.96) this.worldEntities.push(new Enemy(x, y, 'Boar'));
            else if (r > 0.93) this.worldEntities.push(new Enemy(x, y, 'Viper'));
            else if (r > 0.88) this.worldEntities.push(new Enemy(x, y, 'Rat'));
            else if (r > 0.82) this.worldEntities.push(new ItemEntity(x, y, 'spirit_jade'));
            else if (r > 0.65) this.worldEntities.push(new ItemEntity(x, y, 'berry'));
        }

        // Setup Home Entities
        // Bed
        this.homeEntities.push(new Entity(5 * TILE_SIZE, 5 * TILE_SIZE, 40, 60, 'bed'));
        // Exit Door
        this.homeEntities.push(new Entity(10 * TILE_SIZE - 20, 19 * TILE_SIZE - 10, 40, 30, 'exit'));

        // Start in World
        this.map = this.maps.world;
        this.entities = this.worldEntities;
        this.atHome = false;

        if (resetPlayer) {
            this.player = new Player(houseX, houseY + 100);
        }
    },

    enterHome(force = false) {
        if (this.atHome && !force) return;

        // Save World State
        this.worldEntities = this.entities;
        this.lastWorldPos = { x: this.player.x, y: this.player.y };

        // Switch to Home
        this.atHome = true;
        this.map = this.maps.home;
        this.entities = this.homeEntities;

        // Place Player at entrance (inside)
        this.player.x = 10 * TILE_SIZE; // Middle
        this.player.y = 18 * TILE_SIZE; // Near bottom door
        this.player.facing = -1; // ?

        this.addLog("Entered Home", "info");
    },

    exitHome(force = false) {
        if (!this.atHome && !force) return;

        // Save Home State
        this.homeEntities = this.entities;

        // Switch to World
        this.atHome = false;
        this.map = this.maps.world;
        this.entities = this.worldEntities;

        // Restore Player Position
        if (this.lastWorldPos) {
            this.player.x = this.lastWorldPos.x;
            this.player.y = this.lastWorldPos.y + 50; // Offset a bit
        } else {
            this.player.x = (MAP_SIZE / 2) * TILE_SIZE;
            this.player.y = (MAP_SIZE / 2) * TILE_SIZE + 100;
        }
        this.addLog("Left Home", "info");
    },

    startSleep() {
        this.sleeping = true;
        this.sleepTimer = 0;
        document.getElementById('modal').style.display = 'none'; // Ensure no modals
        this.addLog("You drift into cultivation...", "info");
    },

    stopSleep() {
        if (!this.sleeping) return;
        this.sleeping = false;
        this.finishRest();
    },

    finishRest() {
        // Apply level up logic here from old "rest()"
        let msg = "You wake up refreshed.<br>";
        let gains = [];
        for (let s in this.player.stress) {
            if (this.player.stress[s] > 10) {
                let g = Math.floor(this.player.stress[s] / 10);
                this.player.stats[s] += g; this.player.stress[s] = 0;
                if (g > 0) gains.push(`${s.toUpperCase()} +${g}`);
            }
        }
        if (gains.length) msg += "<span style='color:#2ecc71'>" + gains.join(', ') + "</span><br>";

        let next = REALMS[this.player.realm + 1];
        let score = this.player.stats.str + this.player.stats.def + this.player.stats.spd + this.player.stats.wis;
        if (next && score >= next.req) {
            this.player.realm++;
            msg += `<br><strong style='color:#f1c40f'>BREAKTHROUGH: ${next.name}</strong>`;
            this.player.vitals.maxHp += 50; this.player.vitals.maxQi += 20;
            if (this.player.realm === 4) this.spawnBoss();
        }

        // Apply
        this.player.vitals.hp = this.player.vitals.maxHp;
        this.player.vitals.stam = this.player.vitals.maxStam;
        this.player.vitals.qi = this.player.vitals.maxQi;

        // Unlock skills
        for (let i = 0; i < 3; i++) {
            if (this.player.realm >= i + 1) document.getElementById(`skill-${i + 1}`).classList.add('unlocked');
        }

        this.saveGame();
        this.showModal("Cultivation Complete", msg);
    },

    toggleInventory() {
        const modal = document.getElementById('inventory-modal');
        if (modal.style.display === 'block') {
            modal.style.display = 'none';
            document.getElementById('tooltip').style.display = 'none';
            this.paused = false;
        } else {
            this.renderInventory();
            this.renderCrafting();
            modal.style.display = 'block';
            this.paused = true;
        }
    },

    renderInventory() {
        const grid = document.getElementById('inv-grid');
        grid.innerHTML = '';
        for (let i = 0; i < 16; i++) {
            let slot = document.createElement('div');
            slot.className = 'inv-slot';
            let item = this.player.inventory[i];
            if (item) {
                let def = ITEMS[item.id];
                slot.style.borderBottom = `2px solid ${def.color}`;
                slot.innerHTML = `<span style="color:${def.color}; font-size:8px;">${def.name}</span><span class="inv-count">${item.count}</span>`;
                slot.onclick = () => { this.player.useItem(i); this.renderInventory(); };

                // Tooltip events
                slot.onmousemove = (e) => this.showTooltip(e, def);
                slot.onmouseleave = () => document.getElementById('tooltip').style.display = 'none';
            }
            grid.appendChild(slot);
        }
    },

    showTooltip(e, itemDef) {
        const tt = document.getElementById('tooltip');
        tt.style.display = 'block';
        tt.style.left = (e.clientX + 15) + 'px';
        tt.style.top = (e.clientY + 15) + 'px';
        tt.querySelector('.tt-title').innerText = itemDef.name;
        tt.querySelector('.tt-type').innerText = itemDef.type.toUpperCase();
        tt.querySelector('.tt-desc').innerText = itemDef.desc;
    },

    renderCrafting() {
        const list = document.getElementById('crafting-list');
        list.innerHTML = '';
        RECIPES.forEach(r => {
            const btn = document.createElement('button');
            btn.className = 'craft-btn';
            let costStr = Object.entries(r.cost).map(([k, v]) => `${v} ${ITEMS[k].name}`).join(', ');
            btn.innerHTML = `<span>${r.name}</span><span>${costStr}</span>`;
            btn.onclick = () => Game.craft(r);
            list.appendChild(btn);
        });
    },

    craft(recipe) {
        for (let mat in recipe.cost) {
            if (this.player.getItemCount(mat) < recipe.cost[mat]) {
                this.addLog("Missing Materials!", "warn"); return;
            }
        }
        for (let mat in recipe.cost) this.player.removeItem(mat, recipe.cost[mat]);

        const itemDef = ITEMS[recipe.id];
        if (itemDef.type === 'equip') {
            this.player.equip(recipe.id);
        } else {
            this.player.addItem(recipe.id, 1);
        }
        this.addLog(`Crafted ${itemDef.name}`, "gain");
        this.renderInventory();
    },

    spawnBoss() {
        if (this.bossSpawned) return;
        this.bossSpawned = true;
        const angle = Math.random() * Math.PI * 2;
        const x = this.player.x + Math.cos(angle) * 500;
        const y = this.player.y + Math.sin(angle) * 500;
        this.entities.push(new Enemy(x, y, 'Boss'));
        this.addLog("A TERRIFYING PRESENCE DESCENDS!", "warn");
        this.camera.shake = 30;
    },

    addLog(msg, type = 'info') {
        const div = document.createElement('div');
        div.className = `log-entry ${type} new`;
        div.innerText = `> ${msg}`;
        document.getElementById('log-panel').prepend(div);
        setTimeout(() => div.classList.remove('new'), 200);
        if (document.getElementById('log-panel').children.length > 8) document.getElementById('log-panel').lastChild.remove();
    },

    addFloater(x, y, text, color, size = 12) {
        this.floaters.push({ x, y, text, color, size, life: 1.0, vy: -30 });
    },

    showModal(title, text, cb) {
        const m = document.getElementById('modal');
        document.getElementById('modal-title').innerText = title;
        document.getElementById('modal-content').innerHTML = text;
        m.style.display = 'block';
        const btn = document.getElementById('modal-btn');
        btn.onclick = () => { m.style.display = 'none'; if (cb) cb(); };
    },

    update(dt) {
        if (this.paused) return;

        if (this.sleeping) {
            // Deep cultivation state
            this.gameTime += dt * 0.5; // Fast forward time
            this.player.vitals.hp = Math.min(this.player.vitals.maxHp, this.player.vitals.hp + 20 * dt);
            this.player.vitals.stam = Math.min(this.player.vitals.maxStam, this.player.vitals.stam + 20 * dt);

            // Visual feedback
            if (Math.random() < 0.1) this.addFloater(this.player.x, this.player.y, "Zzz...", "#fff", 10);

            // Stop if fully healed
            if (this.player.vitals.hp >= this.player.vitals.maxHp && this.player.vitals.stam >= this.player.vitals.maxStam) {
                this.stopSleep();
            }

            // Cycle day
            if (this.gameTime >= 24) { this.gameTime = 0; this.day++; }
            return;
        }

        // Time Cycle
        this.gameTime += dt * 0.1;
        if (this.gameTime >= 24) { this.gameTime = 0; this.day++; this.saveGame(); }
        let h = Math.floor(this.gameTime);
        let m = Math.floor((this.gameTime - h) * 60);
        document.getElementById('clock-display').innerText = `DAY ${this.day} - ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

        // Spawns
        if (!this.atHome && (this.gameTime > 20 || this.gameTime < 4)) {
            if (Math.random() < 0.005 && this.entities.length < 80) {
                const angle = Math.random() * Math.PI * 2;
                const sx = this.player.x + Math.cos(angle) * 700;
                const sy = this.player.y + Math.sin(angle) * 700;
                const type = Math.random() > 0.6 ? 'Viper' : 'Rat';
                this.entities.push(new Enemy(sx, sy, type));
            }
        }

        this.player.update(dt);
        this.entities.forEach(e => e.update(dt));
        this.entities = this.entities.filter(e => e.active);

        this.projectiles.forEach(p => p.update(dt));
        this.projectiles = this.projectiles.filter(p => p.active);

        this.trails.forEach(t => t.update(dt));
        this.trails = this.trails.filter(t => t.life > 0);

        this.particles.forEach(p => p.update(dt));
        this.particles = this.particles.filter(p => p.life > 0);

        this.floaters.forEach(f => { f.y += f.vy * dt; f.vy += 50 * dt; f.life -= dt; });
        this.floaters = this.floaters.filter(f => f.life > 0);

        // Camera
        this.camera.targetX = this.player.x - this.width / 2;
        this.camera.targetY = this.player.y - this.height / 2;
        this.camera.x += (this.camera.targetX - this.camera.x) * 5 * dt;
        this.camera.y += (this.camera.targetY - this.camera.y) * 5 * dt;

        if (this.camera.shake > 0) {
            this.camera.x += (Math.random() - 0.5) * this.camera.shake;
            this.camera.y += (Math.random() - 0.5) * this.camera.shake;
            this.camera.shake *= 0.9;
            if (this.camera.shake < 0.5) this.camera.shake = 0;
        }

        this.input.mouse.click = false;
    },

    draw() {
        this.ctx.fillStyle = '#0f0f12';
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.ctx.save();
        this.ctx.translate(-Math.floor(this.camera.x), -Math.floor(this.camera.y));

        this.map.draw(this.ctx, this.camera);

        const all = [...this.entities, this.player, ...this.projectiles];
        all.sort((a, b) => (a.y + a.h) - (b.y + b.h));

        this.trails.forEach(t => t.draw(this.ctx));

        all.forEach(e => e.draw(this.ctx));
        this.particles.forEach(p => p.draw(this.ctx));

        this.floaters.forEach(f => {
            this.ctx.globalAlpha = Math.max(0, f.life);
            this.ctx.fillStyle = f.color;
            this.ctx.font = `bold ${f.size}px "Press Start 2P"`;
            this.ctx.fillText(f.text, f.x, f.y);
            this.ctx.globalAlpha = 1;
        });

        // Mouse
        let mx = this.input.mouse.x + this.camera.x;
        let my = this.input.mouse.y + this.camera.y;
        this.ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath(); this.ctx.arc(mx, my, 8, 0, Math.PI * 2); this.ctx.stroke();

        this.ctx.restore();

        this.drawLighting();

        // Sleep Overlay
        if (this.sleeping) {
            this.ctx.fillStyle = 'rgba(0,0,0,0.6)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '30px "Press Start 2P"';
            this.ctx.fillText("MEDITATING...", this.width / 2 - 150, this.height / 2);
            this.ctx.font = '12px "Press Start 2P"';
            this.ctx.fillText("Press WASD to wake up", this.width / 2 - 100, this.height / 2 + 40);
        }

        this.drawMinimap();
    },

    drawMinimap() {
        const ctx = this.miniCtx;
        const w = this.miniCanvas.width, h = this.miniCanvas.height;
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);

        if (this.atHome) {
            ctx.fillStyle = '#fff';
            ctx.font = '10px Arial';
            ctx.fillText("HOME", 40, 50);
            return;
        }

        const range = 1000;
        const px = this.player.x, py = this.player.y;

        ctx.save();
        ctx.translate(w / 2, h / 2);

        this.entities.forEach(e => {
            const dx = (e.x - px) / range * (w / 2);
            const dy = (e.y - py) / range * (h / 2);
            if (Math.abs(dx) < w / 2 && Math.abs(dy) < h / 2) {
                if (e.type === 'enemy') { ctx.fillStyle = '#ff4757'; ctx.fillRect(dx - 2, dy - 2, 4, 4); }
                else if (e.type === 'item') { ctx.fillStyle = '#2ecc71'; ctx.fillRect(dx - 1, dy - 1, 2, 2); }
                else if (e.type === 'house') { ctx.fillStyle = '#00d2d3'; ctx.fillRect(dx - 3, dy - 3, 6, 6); }
            }
        });

        // House Direction Indicator
        const house = this.worldEntities.find(e => e.type === 'house');
        if (house) {
            const dx = (house.x - px);
            const dy = (house.y - py);
            const dist = Math.hypot(dx, dy);

            // If House is out of minimap range
            if (dist > range) {
                const angle = Math.atan2(dy, dx);
                // Draw at edge circle r = w/2 - 10
                const r = w / 2 - 10;
                const ax = Math.cos(angle) * r;
                const ay = Math.sin(angle) * r;

                ctx.fillStyle = '#00d2d3';
                ctx.beginPath();
                // Triangle pointing outward
                ctx.moveTo(ax, ay);
                ctx.lineTo(ax - Math.cos(angle - 0.5) * 6, ay - Math.sin(angle - 0.5) * 6);
                ctx.lineTo(ax - Math.cos(angle + 0.5) * 6, ay - Math.sin(angle + 0.5) * 6);
                ctx.fill();
            }
        }

        // Player Dot
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();

        // North indicator
        ctx.strokeStyle = '#555'; ctx.beginPath(); ctx.moveTo(0, -h / 2); ctx.lineTo(0, h / 2); ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2, 0); ctx.stroke();

        ctx.restore();
    },

    drawLighting() {
        let hour = this.gameTime;
        // Don't draw darkness in home?
        if (this.atHome) return;

        let alpha = 0;

        if (hour >= 20 || hour < 4) alpha = 0.85;
        else if (hour >= 18) {
            let ratio = (hour - 18) / 2;
            alpha = ratio * 0.85;
        } else if (hour < 6) {
            let ratio = 1 - ((hour - 4) / 2);
            alpha = ratio * 0.85;
        }

        if (alpha > 0) {
            this.ctx.fillStyle = `rgba(5, 10, 25, ${alpha})`;
            this.ctx.fillRect(0, 0, this.width, this.height);

            this.ctx.globalCompositeOperation = 'destination-out';

            // Player Light
            let screenX = this.player.x - this.camera.x;
            let screenY = this.player.y - this.camera.y;
            let grad = this.ctx.createRadialGradient(screenX, screenY, 20, screenX, screenY, 180);
            grad.addColorStop(0, 'rgba(0,0,0,1)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            this.ctx.fillStyle = grad;
            this.ctx.beginPath(); this.ctx.arc(screenX, screenY, 180, 0, Math.PI * 2); this.ctx.fill();

            // Projectiles Light
            this.projectiles.forEach(p => {
                let px = p.x - this.camera.x, py = p.y - this.camera.y;
                let g = this.ctx.createRadialGradient(px, py, 5, px, py, 50);
                g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
                this.ctx.fillStyle = g;
                this.ctx.beginPath(); this.ctx.arc(px, py, 50, 0, Math.PI * 2); this.ctx.fill();
            });

            this.ctx.globalCompositeOperation = 'source-over';
        }
    },

    loop(t) {
        let dt = (t - this.lastTime) / 1000;
        if (dt > 0.1) dt = 0.1;
        this.lastTime = t;
        this.update(dt);
        this.draw();
        requestAnimationFrame(x => this.loop(x));
    }
};

window.onload = () => Game.init();
