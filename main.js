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

        // --- Cinematic Spaceship Animation ---
        
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
        let cadets = [];
        let simState = 'BUILDING'; // BUILDING, BOARDING, TAKEOFF, RESET
        let shipYOffset = 0;
        let blockSize = 8;
        
        function resetSim() {
            simState = 'BUILDING';
            shipYOffset = 0;
            shipParts = [];
            
            // Generate blueprint coordinates
            const startX = width / 2 - (shipBlueprint[0].length * blockSize) / 2;
            const startY = height / 3 - 50;
            
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
            
            cadets = [];
            for(let i = 0; i < 15; i++) {
                cadets.push(new JetpackCadet());
            }
        }

        class Moon {
            draw(ctx, w, h) {
                // Draw a pixelated-style massive arc for the moon surface
                ctx.fillStyle = '#0a0a0c'; // slightly bluish dark grey
                ctx.beginPath();
                ctx.arc(w / 2, h + w * 0.8, w * 0.9, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
                ctx.lineWidth = 4;
                ctx.stroke();
            }
        }
        
        const moon = new Moon();

        class JetpackCadet {
            constructor() {
                this.x = width / 2 + (Math.random() - 0.5) * width;
                this.y = height + 50; 
                this.spriteSize = 3;
                this.speed = Math.random() * 2 + 2; // Fast direct flight
                this.state = 'IDLE'; // IDLE, FETCHING, BUILDING, BOARDING, GONE
                this.target = null;
                this.carryingPart = false;
                
                // 5x5 alien sprite with jetpack legs
                this.sprite = [
                    [0, 1, 0, 1, 0],
                    [1, 1, 1, 1, 1],
                    [1, 0, 1, 0, 1],
                    [1, 1, 1, 1, 1],
                    [1, 0, 0, 0, 1] 
                ];
            }
            
            update(parts) {
                if (this.state === 'GONE') return;

                if (simState === 'BOARDING' && this.state !== 'BOARDING') {
                    this.state = 'BOARDING';
                    this.target = { x: width / 2, y: height / 3 }; 
                }

                if (this.state === 'IDLE') {
                    let unplaced = parts.filter(p => !p.placed && !p.targeted);
                    if (unplaced.length > 0) {
                        let p = unplaced[Math.floor(Math.random() * unplaced.length)];
                        p.targeted = true;
                        this.targetPart = p;
                        this.state = 'FETCHING';
                        // Fly to random point on moon
                        this.target = { x: width / 2 + (Math.random() - 0.5) * width * 0.8, y: height - Math.random() * 50 };
                    }
                }

                if (this.state === 'FETCHING') {
                    let dx = this.target.x - this.x;
                    let dy = this.target.y - this.y;
                    let dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 5) {
                        this.carryingPart = true;
                        this.state = 'BUILDING';
                        this.target = { x: this.targetPart.x, y: this.targetPart.y };
                    } else {
                        this.x += (dx / dist) * this.speed;
                        this.y += (dy / dist) * this.speed;
                    }
                }

                if (this.state === 'BUILDING') {
                    let dx = this.target.x - this.x;
                    let dy = this.target.y - this.y;
                    let dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 5) {
                        this.targetPart.placed = true;
                        this.targetPart.alpha = 0.9;
                        this.carryingPart = false;
                        this.state = 'IDLE';
                    } else {
                        this.x += (dx / dist) * this.speed;
                        this.y += (dy / dist) * this.speed;
                    }
                }

                if (this.state === 'BOARDING') {
                    let dx = this.target.x - this.x;
                    let dy = this.target.y - this.y;
                    let dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 10) {
                        this.state = 'GONE'; 
                    } else {
                        this.x += (dx / dist) * this.speed * 2; 
                        this.y += (dy / dist) * this.speed * 2;
                    }
                }
            }
            
            draw(ctx) {
                if (this.state === 'GONE') return;
                
                ctx.fillStyle = `rgba(255, 255, 255, 0.8)`;
                for (let row = 0; row < 5; row++) {
                    for (let col = 0; col < 5; col++) {
                        if (this.sprite[row][col] === 1) {
                            ctx.fillRect(this.x + col * this.spriteSize, this.y + row * this.spriteSize, this.spriteSize, this.spriteSize);
                        }
                    }
                }
                
                // Jetpack cyan thrust
                if (this.state === 'FETCHING' || this.state === 'BUILDING' || this.state === 'BOARDING') {
                    ctx.fillStyle = `rgba(0, 255, 255, ${Math.random() * 0.5 + 0.3})`; 
                    ctx.fillRect(this.x, this.y + 5 * this.spriteSize, this.spriteSize, this.spriteSize * (Math.random() * 3 + 1));
                    ctx.fillRect(this.x + 4 * this.spriteSize, this.y + 5 * this.spriteSize, this.spriteSize, this.spriteSize * (Math.random() * 3 + 1));
                }
                
                // Part carried
                if (this.carryingPart) {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(this.x + 2 * this.spriteSize, this.y - 2 * this.spriteSize, blockSize, blockSize);
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
                ctx.moveTo(width / 2 - 40, height / 3 + 10 + shipYOffset);
                ctx.lineTo(width / 2 + 40, height / 3 + 10 + shipYOffset);
                ctx.lineTo(width / 2, height / 3 + 150 + shipYOffset + Math.random() * 100);
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

            // Update and Draw Cadets
            cadets.forEach(cadet => {
                cadet.update(shipParts);
                cadet.draw(ctx);
            });

            requestAnimationFrame(animateParticles);
        }

        initParticles();
        animateParticles();
    }
});
