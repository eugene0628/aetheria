// --- Graphics Engine ---
const SpriteRenderer = {
    drawPlayer(ctx, x, y, facing, walkCycle, color, meditating) {
        ctx.save();
        ctx.translate(x, y);

        // Meditating Aura
        if (meditating) {
            let s = 20 + Math.sin(Date.now() / 200) * 2;
            ctx.fillStyle = 'rgba(162, 155, 254, 0.3)';
            ctx.beginPath(); ctx.arc(0, 5, s, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'rgba(162, 155, 254, 0.6)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(0, 5, s - 5, 0, Math.PI * 2); ctx.stroke();
        }

        if (facing < 0) ctx.scale(-1, 1);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.ellipse(0, 10, 8, 3, 0, 0, Math.PI * 2); ctx.fill();

        // Legs (Animated)
        const legOff = meditating ? 0 : Math.sin(walkCycle * 10) * 3;
        ctx.fillStyle = '#222';
        if (meditating) {
            ctx.fillRect(-6, 6, 12, 4); // Crossed legs
        } else {
            ctx.fillRect(-6 + legOff, 6, 4, 6);
            ctx.fillRect(2 - legOff, 6, 4, 6);
        }

        // Body (Robe)
        ctx.fillStyle = color;
        ctx.fillRect(-6, -6, 12, 14);
        // Robe Trim
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(-2, -6, 4, 14);

        // Head
        ctx.fillStyle = '#ffeaa7';
        ctx.fillRect(-5, -14, 10, 9);
        // Hair
        ctx.fillStyle = '#2d3436';
        ctx.fillRect(-6, -16, 12, 4);
        ctx.fillRect(4, -14, 2, 6); // ponytail side

        // Weapon Display
        if (Game.player.equipment.wep && !meditating) {
            ctx.fillStyle = '#a29bfe';
            ctx.save();
            ctx.translate(6, 2);
            ctx.rotate(0.5 + Math.sin(walkCycle * 10) * 0.5);
            ctx.fillRect(0, -12, 3, 16); // Blade
            ctx.fillStyle = '#f1c40f';
            ctx.fillRect(-2, 0, 7, 2); // Hilt
            ctx.restore();
        }

        // Arms
        if (!meditating) {
            ctx.fillStyle = color;
            ctx.fillRect(-8, -4, 3, 8);
            ctx.fillStyle = '#ffeaa7';
            ctx.fillRect(2, 0, 8, 3);
        } else {
            // Hands in lap
            ctx.fillStyle = color;
            ctx.fillRect(-8, 0, 3, 6);
            ctx.fillRect(5, 0, 3, 6);
        }

        ctx.restore();
    },

    drawEnemy(ctx, x, y, kind, animTime, hpPct, flash) {
        ctx.save();
        ctx.translate(x, y);
        if (flash > 0) { ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = '#fff'; }

        const bob = Math.sin(animTime * 5) * 2;

        // HP Bar (only if damaged)
        if (hpPct < 1) {
            ctx.fillStyle = '#333'; ctx.fillRect(-10, -25, 20, 3);
            ctx.fillStyle = '#e74c3c'; ctx.fillRect(-10, -25, 20 * hpPct, 3);
        }

        if (flash > 0) ctx.fillStyle = '#fff';
        else if (kind === 'Rat') ctx.fillStyle = '#636e72';
        else if (kind === 'Boar') ctx.fillStyle = '#d63031';
        else if (kind === 'Viper') ctx.fillStyle = '#2ecc71';
        else if (kind === 'Boss') ctx.fillStyle = '#0984e3';

        if (kind === 'Rat') {
            ctx.beginPath(); ctx.ellipse(0, 0 + bob, 10, 7, 0, 0, Math.PI * 2); ctx.fill();
            if (!flash) { ctx.fillStyle = '#ff7675'; ctx.fillRect(6, -2 + bob, 2, 2); ctx.fillRect(-8, -4 + bob, 4, 4); } // eye & ear
        } else if (kind === 'Boar') {
            ctx.beginPath(); ctx.ellipse(0, 0, 14, 10, 0, 0, Math.PI * 2); ctx.fill();
            if (!flash) {
                ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(10, 5); ctx.lineTo(18, 2); ctx.lineTo(10, -2); ctx.fill(); // tusk
            }
        } else if (kind === 'Viper') {
            ctx.beginPath();
            ctx.moveTo(-10, 5); ctx.quadraticCurveTo(0, -5, 10, 5); ctx.lineTo(10, -5); ctx.lineTo(-10, -5);
            ctx.fill();
            ctx.beginPath(); ctx.arc(8, -8 + bob, 6, 0, Math.PI * 2); ctx.fill(); // Head
        } else if (kind === 'Boss') {
            ctx.shadowBlur = 15; ctx.shadowColor = '#0984e3';
            ctx.fillRect(-15, -30 + bob, 30, 40);
            if (!flash) {
                ctx.fillStyle = '#74b9ff';
                ctx.fillRect(-10, -25 + bob, 5, 5); ctx.fillRect(5, -25 + bob, 5, 5);
                ctx.fillStyle = '#f1c40f'; // Crown
                ctx.beginPath(); ctx.moveTo(-15, -30 + bob); ctx.lineTo(-5, -45 + bob); ctx.lineTo(5, -30 + bob); ctx.lineTo(15, -45 + bob); ctx.lineTo(15, -30 + bob); ctx.fill();
            }
            ctx.shadowBlur = 0;
        }
        ctx.restore();
    },

    drawTree(ctx, x, y) {
        ctx.fillStyle = '#4e342e';
        ctx.fillRect(x + 13, y + 18, 6, 14);
        // Leaves
        ctx.fillStyle = '#00b894';
        ctx.beginPath(); ctx.arc(x + 16, y + 10, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#55efc4';
        ctx.beginPath(); ctx.arc(x + 12, y + 6, 8, 0, Math.PI * 2); ctx.fill();
    },

    drawStone(ctx, x, y) {
        ctx.fillStyle = '#636e72';
        ctx.beginPath(); ctx.moveTo(x + 4, y + 28); ctx.lineTo(x + 10, y + 10); ctx.lineTo(x + 22, y + 12); ctx.lineTo(x + 28, y + 28); ctx.fill();
        ctx.fillStyle = '#b2bec3';
        ctx.beginPath(); ctx.moveTo(x + 10, y + 10); ctx.lineTo(x + 14, y + 14); ctx.lineTo(x + 22, y + 12); ctx.fill();
    },

    drawSparkle(ctx, x, y, life) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(life, life);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(0, -5); ctx.lineTo(1, -1); ctx.lineTo(5, 0); ctx.lineTo(1, 1);
        ctx.lineTo(0, 5); ctx.lineTo(-1, 1); ctx.lineTo(-5, 0); ctx.lineTo(-1, -1);
        ctx.fill();
        ctx.restore();
    }
};
