class TileMap {
    constructor(w, h, type = 'world') {
        this.w = w; this.h = h;
        this.type = type;
        this.data = [];
        this.gen();
    }
    gen() {
        if (this.type === 'home') {
            for (let y = 0; y < this.h; y++) {
                let row = [];
                for (let x = 0; x < this.w; x++) {
                    let solid = (x === 0 || x === this.w - 1 || y === 0 || y === this.h - 1);
                    // Leave gap for door
                    if (y === this.h - 1 && x === Math.floor(this.w / 2)) solid = false;
                    row.push({ type: solid ? 'stone' : 'floor', solid, hp: solid ? 999 : 0, maxHp: 999, variant: 0 });
                }
                this.data.push(row);
            }
            return;
        }

        for (let y = 0; y < this.h; y++) {
            let row = [];
            for (let x = 0; x < this.w; x++) {
                let noise = Math.sin(x * 0.08) + Math.cos(y * 0.08) + Math.random() * 0.2;

                let type = 'grass';
                let solid = false;
                let hp = 0;
                let variant = Math.floor(Math.random() * 3);

                let d = Math.hypot(x - this.w / 2, y - this.h / 2);

                if (d > 10) {
                    if (noise > 1.4) { type = 'water'; solid = true; }
                    else {
                        let r = Math.random();
                        if (r > 0.92) { type = 'tree'; solid = true; hp = 40; }
                        else if (r > 0.88) { type = 'stone'; solid = true; hp = 60; }
                    }
                } else {
                    type = 'floor';
                }

                row.push({ type, solid, hp, maxHp: hp, variant });
            }
            this.data.push(row);
        }
    }
    isSolid(x, y) {
        let tx = Math.floor(x / TILE_SIZE), ty = Math.floor(y / TILE_SIZE);
        if (tx < 0 || tx >= this.w || ty < 0 || ty >= this.h) return true;
        return this.data[ty][tx].solid;
    }
    damage(x, y, dmg) {
        let tx = Math.floor(x / TILE_SIZE), ty = Math.floor(y / TILE_SIZE);
        if (tx < 0 || tx >= this.w || ty < 0 || ty >= this.h) return false;
        let t = this.data[ty][tx];
        // Indestructible walls check (hp < 900)
        if (t.solid && t.hp > 0 && t.hp < 900) {
            t.hp -= dmg;
            Game.addFloater(x, y, `-${Math.floor(dmg)}`, '#fff', 8);
            if (t.hp <= 0) {
                t.solid = false;
                Game.player.addStress('str', 0.5);
                if (t.type === 'tree') Game.player.addItem('wood', Math.floor(Math.random() * 2) + 1);
                if (t.type === 'stone') Game.player.addItem('stone', Math.floor(Math.random() * 2) + 1);
                t.type = 'grass';
                for (let i = 0; i < 8; i++) Game.particles.push(new Particle(x, y, '#888'));
            }
            return true;
        }
        return false;
    }
    draw(ctx, cam) {
        let sc = Math.floor(cam.x / TILE_SIZE), ec = sc + Math.ceil(Game.width / TILE_SIZE) + 1;
        let sr = Math.floor(cam.y / TILE_SIZE), er = sr + Math.ceil(Game.height / TILE_SIZE) + 1;

        for (let y = sr; y <= er; y++) {
            for (let x = sc; x <= ec; x++) {
                if (y < 0 || y >= this.h || x < 0 || x >= this.w) continue;
                let t = this.data[y][x];
                let px = x * TILE_SIZE, py = y * TILE_SIZE;

                if (t.type === 'floor') ctx.fillStyle = '#2d3436';
                else if (t.type === 'water') {
                    ctx.fillStyle = Math.sin(Game.gameTime * 2 + x) > 0.5 ? '#0984e3' : '#74b9ff';
                }
                else {
                    const gCols = ['#202025', '#25252a', '#1e1e22'];
                    ctx.fillStyle = gCols[t.variant] || '#222';
                }
                ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

                if (t.type === 'tree') SpriteRenderer.drawTree(ctx, px, py);
                if (t.type === 'stone') SpriteRenderer.drawStone(ctx, px, py);
            }
        }
    }
}

class Entity {
    constructor(x, y, w, h, type) {
        this.x = x; this.y = y; this.w = w; this.h = h; this.type = type;
        this.active = true;
        this.vx = 0; this.vy = 0;
    }
    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vx *= 0.9;
        this.vy *= 0.9;
    }
    draw(ctx) {
        if (this.type === 'bed') {
            ctx.fillStyle = '#c0392b'; ctx.fillRect(this.x, this.y, this.w, this.h);
            ctx.fillStyle = '#eee'; ctx.fillRect(this.x + 5, this.y + 5, this.w - 10, 15);
        } else if (this.type === 'house') {
            // Draw building exterior - Simple House Sprite
            ctx.fillStyle = '#795548'; // Wood color
            ctx.fillRect(this.x, this.y, this.w, this.h);
            // Roof
            ctx.fillStyle = '#d35400';
            ctx.beginPath();
            ctx.moveTo(this.x - 5, this.y);
            ctx.lineTo(this.x + this.w / 2, this.y - 30);
            ctx.lineTo(this.x + this.w + 5, this.y);
            ctx.fill();
            // Door
            ctx.fillStyle = '#3e2723';
            ctx.fillRect(this.x + this.w / 2 - 10, this.y + this.h - 25, 20, 25);
        } else if (this.type === 'exit') {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(this.x, this.y, this.w, this.h);
            ctx.fillStyle = '#fff';
            ctx.font = '10px Arial';
            ctx.fillText("EXIT", this.x + 5, this.y + 20);
        }
    }
}

class ItemEntity extends Entity {
    constructor(x, y, id) {
        super(x, y, 16, 16, 'item');
        this.id = id;
        this.time = Math.random() * 10;
    }
    update(dt) { this.time += dt; if (Math.random() < 0.05) Game.particles.push(new Particle(this.x + 8, this.y + 8, ITEMS[this.id].color, 1, 0.5)); }
    draw(ctx) {
        let off = Math.sin(this.time * 3) * 3;
        ctx.fillStyle = ITEMS[this.id].color;
        ctx.shadowBlur = 10; ctx.shadowColor = ctx.fillStyle;
        ctx.beginPath(); ctx.arc(this.x + 8, this.y + 8 + off, 4, 0, Math.PI * 2); ctx.fill();
        SpriteRenderer.drawSparkle(ctx, this.x + 8, this.y + 8 + off, Math.abs(Math.sin(this.time * 5)));
        ctx.shadowBlur = 0;
    }
}

class Projectile extends Entity {
    constructor(x, y, dx, dy, dmg, color, friendly = true) {
        super(x, y, 10, 10, 'proj');
        this.vx = dx * 450; this.vy = dy * 450;
        this.dmg = dmg; this.color = color;
        this.friendly = friendly;
        this.life = 1.2;
    }
    update(dt) {
        this.x += this.vx * dt; this.y += this.vy * dt;
        this.life -= dt;

        Game.trails.push(new Trail(this.x, this.y, this.color, 4));

        if (this.life <= 0 || Game.map.isSolid(this.x, this.y)) { this.active = false; return; }

        if (this.friendly) {
            let hit = Game.entities.find(e => e.type === 'enemy' && Math.hypot(e.x - this.x, e.y - this.y) < 25);
            if (hit) {
                hit.takeDamage(this.dmg, this.vx * 0.5, this.vy * 0.5);
                this.active = false;
                for (let i = 0; i < 5; i++) Game.particles.push(new Particle(this.x, this.y, this.color));
            }
        } else {
            let p = Game.player;
            if (Math.hypot(p.x - this.x, p.y - this.y) < 20) {
                p.takeDamage(this.dmg);
                this.active = false;
            }
        }
    }
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, 5, 0, Math.PI * 2); ctx.fill();
    }
}

class Enemy extends Entity {
    constructor(x, y, kind) {
        super(x, y, 24, 24, 'enemy');
        this.kind = kind;
        this.animTime = Math.random() * 10;
        this.flashTime = 0;
        if (kind === 'Rat') { this.hp = 30; this.maxHp = 30; this.dmg = 8; this.spd = 70; }
        if (kind === 'Viper') { this.hp = 45; this.maxHp = 45; this.dmg = 12; this.spd = 50; this.range = 250; }
        if (kind === 'Boar') { this.hp = 90; this.maxHp = 90; this.dmg = 18; this.spd = 45; this.w = 32; this.h = 32; }
        if (kind === 'Boss') { this.hp = 1500; this.maxHp = 1500; this.dmg = 45; this.spd = 95; this.w = 40; this.h = 40; }
        this.cd = 0;
    }
    update(dt) {
        super.update(dt);
        this.animTime += dt;
        if (this.flashTime > 0) this.flashTime -= dt;
        if (!Game.player) return;

        let dx = Game.player.x - this.x;
        let dy = Game.player.y - this.y;
        let dist = Math.hypot(dx, dy);

        if (dist < 350 || this.hp < this.maxHp) {
            if (this.kind === 'Viper') {
                if (dist > 180) {
                    this.x += (dx / dist) * this.spd * dt;
                    this.y += (dy / dist) * this.spd * dt;
                }
                if (dist < 300 && this.cd <= 0) {
                    Game.projectiles.push(new Projectile(this.x, this.y, dx / dist, dy / dist, this.dmg, '#2ecc71', false));
                    this.cd = 2.0;
                }
            } else {
                if (dist > 25) {
                    if (Math.abs(this.vx) < 10) {
                        this.x += (dx / dist) * this.spd * dt;
                        this.y += (dy / dist) * this.spd * dt;
                    }
                } else {
                    if (this.cd <= 0) {
                        Game.player.takeDamage(this.dmg);
                        this.cd = 1.0;
                    }
                }
            }
        }
        if (this.cd > 0) this.cd -= dt;
    }
    takeDamage(d, kx = 0, ky = 0, isCrit = false) {
        this.hp -= d;
        this.vx = kx; this.vy = ky;
        this.flashTime = 0.15;

        let color = isCrit ? '#f1c40f' : '#fff';
        let size = isCrit ? 16 : 12;
        let txt = isCrit ? `${Math.floor(d)}!` : Math.floor(d);
        Game.addFloater(this.x, this.y - 10, txt, color, size);

        for (let i = 0; i < 3; i++) Game.particles.push(new Particle(this.x, this.y, this.kind === 'Boss' ? '#0984e3' : '#d63031'));

        if (this.hp <= 0) {
            this.active = false;
            Game.player.addStress('str', 2);
            if (this.kind === 'Rat' && Math.random() > 0.5) Game.player.addItem('spirit_jade', 1);
            if (this.kind === 'Viper') Game.player.addItem('berry', 1);
            if (this.kind === 'Boar') Game.player.addItem('meat', 1);
            if (this.kind === 'Boss') {
                Game.player.addItem('core', 1);
                Game.showModal("VICTORY", "The Spirit King falls. You have obtained a Beast Core.<br>The world is safe... for now.", null);
            }
        }
    }
    draw(ctx) { SpriteRenderer.drawEnemy(ctx, this.x, this.y, this.kind, this.animTime, this.hp / this.maxHp, this.flashTime); }
}

class Player extends Entity {
    constructor(x, y) {
        super(x, y, 20, 20, 'player');
        this.stats = { str: 5, def: 5, spd: 5, wis: 1 };
        this.equipment = { wep: null, arm: null };
        this.stress = { str: 0, def: 0, spd: 0, wis: 0 };
        this.vitals = { hp: 100, maxHp: 100, stam: 100, maxStam: 100, qi: 0, maxQi: 50, hung: 0 };
        this.realm = 0;
        this.inventory = [];
        this.skills = [0, 0, 0];
        this.facing = 1;
        this.walkCycle = 0;
        this.atkCd = 0;
        this.meditating = false;
        this.starveTimer = 0;
    }

    serialize() { return { x: this.x, y: this.y, stats: this.stats, equipment: this.equipment, vitals: this.vitals, realm: this.realm, inventory: this.inventory }; }
    deserialize(d) {
        Object.assign(this, d);
        if (!this.equipment) this.equipment = { wep: null, arm: null };
        this.updateUI();
    }

    addItem(id, n) {
        let s = this.inventory.find(i => i.id === id);
        if (s) s.count += n; else this.inventory.push({ id, count: n });
        Game.addLog(`+${n} ${ITEMS[id].name}`, 'gain');
    }
    removeItem(id, n) {
        let s = this.inventory.find(i => i.id === id);
        if (s) { s.count -= n; if (s.count <= 0) this.inventory = this.inventory.filter(i => i.id !== id); }
    }
    getItemCount(id) { let s = this.inventory.find(i => i.id === id); return s ? s.count : 0; }

    equip(id) {
        const item = ITEMS[id];
        if (!item.type === 'equip') return;
        this.equipment[item.slot] = id;
        Game.addLog(`Equipped ${item.name}`, 'rare');
        this.updateUI();
    }

    useItem(idx) {
        let item = this.inventory[idx];
        if (!item) return;
        let def = ITEMS[item.id];

        if (def.type === 'food') {
            this.vitals.hung = Math.max(0, this.vitals.hung - def.val);
            this.vitals.stam = Math.min(this.vitals.maxStam, this.vitals.stam + 30);
            Game.addLog("Ate food.", "gain");
            this.removeItem(item.id, 1);
        } else if (def.type === 'heal') {
            this.vitals.hp = Math.min(this.vitals.maxHp, this.vitals.hp + def.val);
            Game.addLog("Wounds mended.", "gain");
            this.removeItem(item.id, 1);
        } else if (def.type === 'cult') {
            this.vitals.qi = Math.min(this.vitals.maxQi, this.vitals.qi + def.val);
            this.addStress('wis', 10);
            Game.addLog("Qi surges through meridians!", "rare");
            this.removeItem(item.id, 1);
        }
        this.updateUI();
    }

    getStats() {
        let s = { ...this.stats };
        if (this.equipment.wep) { let eq = ITEMS[this.equipment.wep].stats; for (let k in eq) s[k] += eq[k]; }
        if (this.equipment.arm) { let eq = ITEMS[this.equipment.arm].stats; for (let k in eq) s[k] += eq[k]; }
        return s;
    }

    update(dt) {
        super.update(dt);
        const currStats = this.getStats();

        // Passive mechanics
        if (this.vitals.hung < 100) {
            this.vitals.hung += dt * 0.5; // Hunger increases over time
            if (this.vitals.hung < 80) this.vitals.stam = Math.min(this.vitals.maxStam, this.vitals.stam + dt * 4);
        } else {
            // Starvation
            this.starveTimer += dt;
            if (this.starveTimer > 2) {
                this.takeDamage(5);
                Game.addLog("Starving...", "warn");
                this.starveTimer = 0;
            }
        }

        // Active Meditation
        if (this.meditating) {
            if (this.vitals.stam > 10 && this.vitals.qi < this.vitals.maxQi) {
                this.vitals.stam -= dt * 8;
                this.vitals.qi += dt * 6;
                if (Math.random() < 0.2) Game.particles.push(new Particle(this.x + (Math.random() - 0.5) * 20, this.y + (Math.random() - 0.5) * 20, '#a29bfe', 2, 0.8));
                this.addStress('wis', 0.08);
            } else {
                this.meditating = false; // Stop if no stam or full qi
            }
        }

        if (this.meditating) return;

        // Movement
        let dx = 0, dy = 0;
        let spd = 100 + (currStats.spd * 5);
        if (Game.input.keys['w']) dy = -1;
        if (Game.input.keys['s']) dy = 1;
        if (Game.input.keys['a']) { dx = -1; this.facing = -1; }
        if (Game.input.keys['d']) { dx = 1; this.facing = 1; }

        if ((dx || dy) && Math.abs(this.vx) < 50) {
            this.walkCycle += dt * 10;
            let l = Math.hypot(dx, dy);
            let nx = this.x + (dx / l) * spd * dt;
            let ny = this.y + (dy / l) * spd * dt;
            if (!Game.map.isSolid(nx, this.y)) this.x = nx;
            if (!Game.map.isSolid(this.x, ny)) this.y = ny;
            if (Math.random() < 0.01) this.addStress('spd', 0.1);
        } else {
            this.walkCycle = 0;
        }

        // Skills
        this.skills.forEach((s, i) => {
            if (s > 0) {
                this.skills[i] -= dt;
                document.getElementById(`skill-${i + 1}`).style.setProperty('--cd-pct', (this.skills[i] / SKILLS[i].cd * 100) + '%');
                if (this.skills[i] <= 0) document.getElementById(`skill-${i + 1}`).classList.remove('cooldown');
            }
        });

        if (this.atkCd > 0) this.atkCd -= dt;
        if (Game.input.mouse.click && this.atkCd <= 0) this.basicAttack(currStats);

        this.updateUI();
    }

    basicAttack(stats) {
        if (this.vitals.stam < 5) return;
        this.vitals.stam -= 5;
        this.atkCd = 0.4;

        let mx = Game.input.mouse.x + Game.camera.x;
        let my = Game.input.mouse.y + Game.camera.y;

        // Visual Swipe
        let angle = Math.atan2(my - this.y, mx - this.x);
        for (let i = 0; i < 5; i++) {
            Game.particles.push(new Particle(this.x + Math.cos(angle) * 20, this.y + Math.sin(angle) * 20, '#fff', 2, 0.2));
        }

        let critChance = (stats.wis * 2 + stats.spd) / 100;

        let hit = Game.entities.find(e => e.type === 'enemy' && Math.hypot(e.x - mx, e.y - my) < 40);
        if (hit && Math.hypot(this.x - hit.x, this.y - hit.y) < 80) {
            let isCrit = Math.random() < critChance;
            let dmg = stats.str + (Math.random() * 5);
            if (isCrit) dmg *= 2.0;

            hit.takeDamage(dmg, Math.cos(angle) * 300, Math.sin(angle) * 300, isCrit);
            this.addStress('str', 0.5);
            Game.camera.shake = isCrit ? 8 : 3;
        } else if (Math.hypot(this.x - mx, this.y - my) < 80) {
            Game.map.damage(mx, my, stats.str);
            this.addStress('str', 0.1);
        }
    }

    interact() {
        // Interact with entities
        let closest = null;
        let dist = 1000;
        Game.entities.forEach(e => {
            // Use Center for distance check
            let ex = e.x + (e.w || 0) / 2;
            let ey = e.y + (e.h || 0) / 2;
            let d = Math.hypot(ex - this.x, ey - this.y);

            // Interaction range
            let range = 60;
            if (e.type === 'house') range = 100; // Larger range for house

            if (d < range && d < dist) { closest = e; dist = d; }
        });

        if (closest) {
            if (closest.type === 'item') {
                closest.active = false;
                this.addItem(closest.id, 1);
            } else if (closest.type === 'house') {
                Game.enterHome();
            } else if (closest.type === 'exit') {
                Game.exitHome();
            } else if (closest.type === 'bed') {
                this.rest();
            }
        }
    }

    useSkill(i) {
        if (this.realm < i + 1) { Game.addLog("Realm too low!", "warn"); return; }
        if (this.skills[i] > 0) return;
        let s = SKILLS[i];
        if (this.vitals.qi < s.cost) { Game.addLog("Need more Qi!", "warn"); return; }

        this.vitals.qi -= s.cost;
        this.skills[i] = s.cd;
        document.getElementById(`skill-${i + 1}`).classList.add('cooldown');
        this.addStress('wis', 2);

        const stats = this.getStats();

        if (s.type === 'proj') {
            let mx = Game.input.mouse.x + Game.camera.x, my = Game.input.mouse.y + Game.camera.y;
            let dx = mx - this.x, dy = my - this.y;
            let l = Math.hypot(dx, dy);
            Game.projectiles.push(new Projectile(this.x, this.y, dx / l, dy / l, stats.wis * 12, '#00cec9', true));
        } else if (s.type === 'dash') {
            let dx = this.facing * 180;
            // Add trail effect
            for (let k = 0; k < 5; k++) Game.trails.push(new Trail(this.x + (dx / 5) * k, this.y, '#dfe6e9', 10, 0.5));
            this.vx = dx * 6;
            Game.addLog("Cloud Step!", "info");
        } else if (s.type === 'aoe') {
            Game.camera.shake = 20;
            Game.entities.forEach(e => {
                if (e.type === 'enemy' && Math.hypot(e.x - this.x, e.y - this.y) < 150) {
                    let angle = Math.atan2(e.y - this.y, e.x - this.x);
                    e.takeDamage(stats.wis * 25, Math.cos(angle) * 600, Math.sin(angle) * 600, true);
                }
            });
            for (let k = 0; k < 25; k++) Game.particles.push(new Particle(this.x, this.y, '#f1c40f', 5, 0.8));
        }
    }

    takeDamage(dmg) {
        const stats = this.getStats();
        let red = Math.max(1, dmg - (stats.def * 0.5));
        this.vitals.hp -= red;
        Game.addFloater(this.x, this.y - 20, `-${Math.floor(red)}`, '#ff6b6b');
        Game.camera.shake = 5;
        this.addStress('def', red * 0.2);

        if (this.vitals.hp <= 0) {
            Game.showModal("DEATH", "Your cultivation base has shattered.", () => Game.loadWorld());
        }
    }

    rest() {
        if (!Game.atHome) {
            Game.addLog("Can only rest at home!", "warn");
            return;
        }
        if (Game.sleeping) return;

        Game.startSleep();
    }

    addStress(s, v) { this.stress[s] += (v * 12) / this.stats[s]; }

    updateUI() {
        document.getElementById('fill-hp').style.width = (this.vitals.hp / this.vitals.maxHp * 100) + '%';
        document.getElementById('val-hp').innerText = `${Math.floor(this.vitals.hp)}/${this.vitals.maxHp}`;
        document.getElementById('fill-stamina').style.width = (this.vitals.stam / this.vitals.maxStam * 100) + '%';
        document.getElementById('fill-qi').style.width = (this.vitals.qi / this.vitals.maxQi * 100) + '%';
        document.getElementById('val-qi').innerText = `${Math.floor(this.vitals.qi)}/${this.vitals.maxQi}`;
        document.getElementById('fill-hunger').style.width = (this.vitals.hung) + '%';
        document.getElementById('val-hunger').innerText = `${Math.floor(this.vitals.hung)}%`;

        // Hunger color warning
        const hBar = document.querySelector('.hunger .bar-fill');
        if (this.vitals.hung > 80) hBar.style.backgroundColor = '#ff4757';
        else hBar.style.backgroundColor = '#d35400';

        document.getElementById('realm-display').innerText = REALMS[this.realm].name;

        const s = this.getStats();
        ['str', 'def', 'spd', 'wis'].forEach(k => {
            document.getElementById(`stat-${k}`).innerText = s[k].toFixed(1);
        });

        document.getElementById('gear-wep').innerText = this.equipment.wep ? ITEMS[this.equipment.wep].name : 'None';
        document.getElementById('gear-arm').innerText = this.equipment.arm ? ITEMS[this.equipment.arm].name : 'None';
    }

    draw(ctx) { SpriteRenderer.drawPlayer(ctx, this.x, this.y, this.facing, this.walkCycle, '#dfe6e9', this.meditating); }
}

class Particle {
    constructor(x, y, c, s = 3, l = 1.0) {
        this.x = x; this.y = y; this.c = c; this.s = s; this.life = l; this.maxLife = l;
        this.vx = (Math.random() - 0.5) * 150; this.vy = (Math.random() - 0.5) * 150;
    }
    update(dt) { this.x += this.vx * dt; this.y += this.vy * dt; this.life -= dt; }
    draw(ctx) {
        ctx.globalAlpha = this.life / this.maxLife;
        ctx.fillStyle = this.c; ctx.fillRect(this.x, this.y, this.s, this.s);
        ctx.globalAlpha = 1;
    }
}

class Trail {
    constructor(x, y, c, r = 5, l = 0.3) {
        this.x = x; this.y = y; this.c = c; this.r = r; this.life = l;
    }
    update(dt) { this.life -= dt; }
    draw(ctx) {
        ctx.globalAlpha = this.life * 0.5;
        ctx.fillStyle = this.c;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
    }
}
