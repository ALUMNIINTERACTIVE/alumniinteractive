document.addEventListener('DOMContentLoaded', () => {
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Intersection Observer for scroll animations
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.animate-on-scroll').forEach((element) => {
        observer.observe(element);
    });

    // --- Particle Animation Background ---
    const canvas = document.getElementById('particles-bg');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let width, height;
        let particles = [];
        let shootingStars = [];

        function resizeCanvas() {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        }

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        class Particle {
            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.size = Math.random() * 1.5 + 0.5;
                this.speedX = (Math.random() - 0.5) * 0.3;
                this.speedY = (Math.random() - 0.5) * 0.3;
                this.opacity = Math.random() * 0.5 + 0.1;
                this.fadeSpeed = (Math.random() - 0.5) * 0.01;
            }
            update() {
                this.x += this.speedX;
                this.y += this.speedY;
                
                // Opacity pulsing
                this.opacity += this.fadeSpeed;
                if (this.opacity >= 0.8 || this.opacity <= 0.1) this.fadeSpeed *= -1;

                // Screen wrap
                if (this.x < 0) this.x = width;
                if (this.x > width) this.x = 0;
                if (this.y < 0) this.y = height;
                if (this.y > height) this.y = 0;
            }
            draw() {
                ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        class ShootingStar {
            constructor() {
                this.reset();
            }
            reset() {
                this.x = Math.random() * width * 1.5;
                this.y = 0;
                this.length = Math.random() * 80 + 30;
                this.speedX = -(Math.random() * 5 + 5);
                this.speedY = Math.random() * 5 + 5;
                this.opacity = 0;
                this.active = false;
                this.delay = Math.random() * 300 + 100; // frames until spawn
            }
            update() {
                if (!this.active) {
                    this.delay--;
                    if (this.delay <= 0) this.active = true;
                    return;
                }
                
                this.x += this.speedX;
                this.y += this.speedY;
                this.opacity += 0.05;
                
                if (this.opacity > 1) this.opacity = 1;

                if (this.x < -100 || this.y > height + 100) {
                    this.reset();
                }
            }
            draw() {
                if (!this.active) return;
                ctx.strokeStyle = `rgba(255, 255, 255, ${this.opacity})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.x - this.speedX * 3, this.y - this.speedY * 3);
                ctx.stroke();
            }
        }

        // --- Detailed Lunar Base Construction ---
        
        const shipBlueprint = [
            "       XXXX       ",
            "    XXXXXXXXXX    ",
            "  XXXXXXXXXXXXXX  ",
            " XXXXXXXXXXXXXXXX ",
            "XXXXXXXXXXXXXXXXXX",
            " XXXXXXXXXXXXXXXX ",
            "    XXXXXXXXXX    "
        ];
        
        let shipParts = [];
        let actors = [];
        let simState = 'BUILDING'; // BUILDING, BOARDING, TAKEOFF, RESET
        let shipYOffset = 0;
        let blockSize = 5; // Scaled up 30% (from 4)
        let surfaceY;
        let cx, cy;
        
        function resetSim() {
            simState = 'BUILDING';
            shipYOffset = 0;
            shipParts = [];
            surfaceY = height - 150; // Give plenty of room for craters
            cx = width / 2;
            cy = surfaceY;
            
            // Generate blueprint coordinates IN the center crater
            const startX = cx - (shipBlueprint[0].length * blockSize) / 2;
            const startY = surfaceY + 30 - (shipBlueprint.length * blockSize); 
            
            for (let row = 0; row < shipBlueprint.length; row++) {
                for (let col = 0; col < shipBlueprint[row].length; col++) {
                    if (shipBlueprint[row][col] === 'X') {
                        shipParts.push({
                            x: startX + col * blockSize,
                            y: startY + row * blockSize,
                            placed: false,
                            targeted: false,
                            alpha: 0
                        });
                    }
                }
            }
            
            actors = [];
            
            // 1 Digger
            actors.push(new DiggerCadet(cx - 250, surfaceY + 15));
            
            // 2 Rovers (start slightly offscreen)
            actors.push(new RoverCadet(-50, surfaceY, cx - 120, 1)); // Left to center
            actors.push(new RoverCadet(width + 50, surfaceY, cx + 120, -1)); // Right to center
            
            // 4 Ladder Cadets (Right angles only)
            for(let i=0; i<4; i++) actors.push(new BuilderCadet(true));
            
            // 5 Jetpack Cadets (Direct flight)
            for(let i=0; i<5; i++) actors.push(new BuilderCadet(false));
        }

        class MoonSurface {
            draw(ctx, w, h) {
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                
                // Left surface
                ctx.moveTo(0, surfaceY);
                ctx.lineTo(cx - 300, surfaceY);
                // Left small crater
                ctx.lineTo(cx - 280, surfaceY + 15);
                ctx.lineTo(cx - 220, surfaceY + 15);
                ctx.lineTo(cx - 200, surfaceY);
                // Middle surface
                ctx.lineTo(cx - 120, surfaceY);
                // Large center crater
                ctx.lineTo(cx - 90, surfaceY + 40);
                ctx.lineTo(cx + 90, surfaceY + 40);
                ctx.lineTo(cx + 120, surfaceY);
                // Right middle surface
                ctx.lineTo(cx + 200, surfaceY);
                // Right small crater
                ctx.lineTo(cx + 220, surfaceY + 15);
                ctx.lineTo(cx + 280, surfaceY + 15);
                ctx.lineTo(cx + 300, surfaceY);
                // Right surface
                ctx.lineTo(w, surfaceY);
                
                ctx.stroke();

                // Draw Scaffolds in center crater
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                // Left scaffold tower
                ctx.moveTo(cx - 80, surfaceY + 30); ctx.lineTo(cx - 80, surfaceY - 70);
                ctx.moveTo(cx - 60, surfaceY + 30); ctx.lineTo(cx - 60, surfaceY - 70);
                ctx.moveTo(cx - 80, surfaceY - 10); ctx.lineTo(cx - 60, surfaceY - 30);
                ctx.moveTo(cx - 80, surfaceY - 50); ctx.lineTo(cx - 60, surfaceY - 70);
                ctx.moveTo(cx - 80, surfaceY - 30); ctx.lineTo(cx - 60, surfaceY - 10);
                ctx.moveTo(cx - 80, surfaceY + 10); ctx.lineTo(cx - 60, surfaceY + 30);
                // Right scaffold tower
                ctx.moveTo(cx + 80, surfaceY + 30); ctx.lineTo(cx + 80, surfaceY - 70);
                ctx.moveTo(cx + 60, surfaceY + 30); ctx.lineTo(cx + 60, surfaceY - 70);
                ctx.moveTo(cx + 80, surfaceY - 10); ctx.lineTo(cx + 60, surfaceY - 30);
                ctx.moveTo(cx + 80, surfaceY - 50); ctx.lineTo(cx + 60, surfaceY - 70);
                ctx.moveTo(cx + 80, surfaceY - 30); ctx.lineTo(cx + 60, surfaceY - 10);
                ctx.moveTo(cx + 80, surfaceY + 10); ctx.lineTo(cx + 60, surfaceY + 30);
                ctx.stroke();

                // Draw Generator with cyan glow
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(cx - 100, surfaceY + 20, 15, 10);
                ctx.fillRect(cx + 85, surfaceY + 20, 15, 10);
                ctx.fillStyle = 'rgba(0, 255, 255, 0.6)'; // Glowing core
                ctx.fillRect(cx - 95, surfaceY + 22, 5, 5); 
                ctx.fillRect(cx + 90, surfaceY + 22, 5, 5); 

                // Draw some pixelated texture dots
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(cx - 250, surfaceY + 25, 2, 2);
                ctx.fillRect(cx + 250, surfaceY + 25, 2, 2);
                ctx.fillRect(cx - 50, surfaceY + 50, 2, 2);
                ctx.fillRect(cx + 50, surfaceY + 50, 2, 2);
                ctx.fillRect(cx - 150, surfaceY + 10, 2, 2);
                ctx.fillRect(cx + 150, surfaceY + 10, 2, 2);
                ctx.fillRect(cx - 350, surfaceY + 20, 2, 2);
                ctx.fillRect(cx + 350, surfaceY + 20, 2, 2);
            }
        }
        
        const moon = new MoonSurface();

        class Actor {
            constructor() {
                this.state = 'WORKING';
                this.spriteSize = 2; // Scaled up 30% (from 1.5)
            }
            drawSprite(ctx, spriteMatrix, px, py, isCyan=false) {
                ctx.fillStyle = isCyan ? 'rgba(0, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.8)';
                for (let r = 0; r < spriteMatrix.length; r++) {
                    for (let c = 0; c < spriteMatrix[r].length; c++) {
                        if (spriteMatrix[r][c] === 1) {
                            ctx.fillRect(px + c * this.spriteSize, py + r * this.spriteSize, this.spriteSize, this.spriteSize);
                        }
                    }
                }
            }
            boardUpdate() {
                let dx = cx - this.x;
                let dy = (surfaceY + 20) - this.y; // Center of craft
                let dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < 10) {
                    this.state = 'GONE';
                } else {
                    this.x += (dx/dist) * 3;
                    this.y += (dy/dist) * 3;
                }
            }
        }

        class DiggerCadet extends Actor {
            constructor(x, y) {
                super();
                this.x = x;
                this.y = y - 7;
                this.frame = 0;
                this.timer = 0;
                this.sprite1 = [
                    [0,1,0,0,1],
                    [1,1,1,0,1],
                    [1,0,1,1,1],
                    [1,1,1,0,0],
                    [1,0,1,0,0]
                ];
                this.sprite2 = [
                    [0,1,0,0,0],
                    [1,1,1,0,0],
                    [1,0,1,1,1],
                    [1,1,1,0,1],
                    [1,0,1,0,1]
                ];
            }
            update() {
                if (this.state === 'GONE') return;
                if (simState === 'BOARDING') {
                    this.boardUpdate();
                    return;
                }
                this.timer++;
                if (this.timer > 20) {
                    this.frame = 1 - this.frame;
                    this.timer = 0;
                }
            }
            draw(ctx) {
                if (this.state === 'GONE') return;
                this.drawSprite(ctx, this.frame === 0 ? this.sprite1 : this.sprite2, this.x, this.y);
            }
        }

        class RoverCadet extends Actor {
            constructor(startX, startY, endX, dir) {
                super();
                this.startX = startX;
                this.y = startY - 6;
                this.endX = endX;
                this.x = startX;
                this.dir = dir; // 1 or -1
                this.speed = 1.2;
                this.waitTimer = 0;
                this.sprite = [
                    [0,1,1,0,0],
                    [1,1,1,1,1],
                    [1,1,1,1,1],
                    [0,1,0,1,0]
                ];
            }
            update() {
                if (this.state === 'GONE') return;
                if (simState === 'BOARDING') {
                    this.boardUpdate();
                    return;
                }

                if (this.waitTimer > 0) {
                    this.waitTimer--;
                    return;
                }

                this.x += this.speed * this.dir;
                
                // If reached destination (center crater edge or spawn)
                if ((this.dir === 1 && this.x > this.endX) || (this.dir === -1 && this.x < this.endX)) {
                    this.dir *= -1; // turnaround
                    this.waitTimer = 60; // wait 1 second
                    let temp = this.startX;
                    this.startX = this.endX;
                    this.endX = temp;
                }
            }
            draw(ctx) {
                if (this.state === 'GONE') return;
                this.drawSprite(ctx, this.sprite, this.x, this.y);
                // Draw cargo if moving towards center
                let movingToCenter = (this.x < cx && this.dir === 1) || (this.x > cx && this.dir === -1);
                if (movingToCenter) {
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(this.x + 2, this.y - 3, 4, 4);
                }
            }
        }

        class BuilderCadet extends Actor {
            constructor(isLadder) {
                super();
                this.isLadder = isLadder; // True = right angles only, False = jetpack diagonal
                this.x = cx + (Math.random() > 0.5 ? 250 : -250); // Start at small craters
                this.y = surfaceY + 15;
                this.speed = Math.random() * 1 + 1.5;
                this.state = 'IDLE'; // Fixed: Must start in IDLE to acquire a target first
                this.target = null;
                this.carryingPart = false;
                this.sprite = [
                    [0, 1, 0],
                    [1, 1, 1],
                    [1, 0, 1],
                    [1, 1, 1]
                ];
            }
            update(parts) {
                if (this.state === 'GONE') return;
                if (simState === 'BOARDING') {
                    this.boardUpdate();
                    return;
                }

                if (this.state === 'IDLE') {
                    let unplaced = parts.filter(p => !p.placed && !p.targeted);
                    if (unplaced.length > 0) {
                        let p = unplaced[Math.floor(Math.random() * unplaced.length)];
                        p.targeted = true;
                        this.targetPart = p;
                        this.state = 'FETCHING';
                        
                        if (this.isLadder) {
                            // Fly to small craters to fetch
                            this.target = { x: cx + (Math.random() > 0.5 ? 250 : -250), y: surfaceY + 15 };
                        } else {
                            // Fly from random off-screen places (N, S, E, W, NW, SE, etc)
                            let edge = Math.floor(Math.random() * 4);
                            if (edge === 0) this.target = { x: Math.random() * width, y: -100 }; // N
                            else if (edge === 1) this.target = { x: Math.random() * width, y: height + 100 }; // S
                            else if (edge === 2) this.target = { x: -100, y: Math.random() * height }; // W
                            else this.target = { x: width + 100, y: Math.random() * height }; // E
                        }
                    }
                }

                if (this.state === 'FETCHING' || this.state === 'BUILDING') {
                    let dx = this.target.x - this.x;
                    let dy = this.target.y - this.y;
                    let dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist < 5) {
                        if (this.state === 'FETCHING') {
                            this.carryingPart = true;
                            this.state = 'BUILDING';
                            this.target = { x: this.targetPart.x, y: this.targetPart.y };
                        } else {
                            this.targetPart.placed = true;
                            this.targetPart.alpha = 0.9;
                            this.carryingPart = false;
                            this.state = 'IDLE';
                        }
                    } else {
                        if (this.isLadder) {
                            // Move manhattan style (Y first, then X)
                            if (Math.abs(dy) > 2) {
                                this.y += Math.sign(dy) * this.speed;
                            } else {
                                this.x += Math.sign(dx) * this.speed;
                            }
                        } else {
                            this.x += (dx / dist) * this.speed;
                            this.y += (dy / dist) * this.speed;
                        }
                    }
                }
            }
            draw(ctx) {
                if (this.state === 'GONE') return;
                this.drawSprite(ctx, this.sprite, this.x, this.y);
                
                if (!this.isLadder && (this.state === 'FETCHING' || this.state === 'BUILDING')) {
                    // Jetpack exhaust
                    ctx.fillStyle = `rgba(0, 255, 255, ${Math.random() * 0.5 + 0.3})`;
                    ctx.fillRect(this.x, this.y + 4 * this.spriteSize, 2, Math.random() * 4 + 2);
                    ctx.fillRect(this.x + 2 * this.spriteSize, this.y + 4 * this.spriteSize, 2, Math.random() * 4 + 2);
                }
                
                if (this.carryingPart) {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(this.x, this.y - 4, blockSize, blockSize);
                }
            }
        }

        function initParticles() {
            particles = [];
            let particleCount = Math.floor(width * height / 12000); 
            for (let i = 0; i < particleCount; i++) {
                particles.push(new Particle());
            }
            
            shootingStars = [];
            for (let i = 0; i < 3; i++) { 
                shootingStars.push(new ShootingStar());
            }

            resetSim();
        }

        function animateParticles() {
            ctx.clearRect(0, 0, width, height);
            
            // Draw regular background particles
            particles.forEach(p => { p.update(); p.draw(); });
            shootingStars.forEach(s => { s.update(); s.draw(); });

            // Draw moon
            moon.draw(ctx, width, height);

            // Simulation Logic
            if (simState === 'BUILDING') {
                let allPlaced = shipParts.every(p => p.placed);
                if (allPlaced) {
                    simState = 'BOARDING';
                    setTimeout(() => { simState = 'TAKEOFF'; }, 3000);
                }
            } else if (simState === 'TAKEOFF') {
                shipYOffset -= 4; // Accelerate upwards
                
                // Draw massive cyan thruster
                ctx.fillStyle = `rgba(0, 255, 255, ${Math.random() * 0.4 + 0.1})`;
                ctx.beginPath();
                ctx.moveTo(cx - 20, surfaceY + 20 + shipYOffset);
                ctx.lineTo(cx + 20, surfaceY + 20 + shipYOffset);
                ctx.lineTo(cx, surfaceY + 200 + shipYOffset + Math.random() * 100);
                ctx.fill();

                if (shipYOffset < -height) {
                    simState = 'RESET';
                    setTimeout(() => { resetSim(); }, 2000);
                }
            }

            // Draw Ship Parts
            shipParts.forEach(p => {
                if (p.placed) {
                    ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
                    ctx.fillRect(p.x, p.y + shipYOffset, blockSize, blockSize);
                }
            });

            // Update and Draw Actors
            actors.forEach(actor => {
                if (actor.update.length > 0) {
                    actor.update(shipParts);
                } else {
                    actor.update();
                }
                actor.draw(ctx);
            });

            requestAnimationFrame(animateParticles);
        }

        initParticles();
        animateParticles();
    }
});
