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

        function initParticles() {
            particles = [];
            let particleCount = Math.floor(width * height / 12000); // Responsive amount
            for (let i = 0; i < particleCount; i++) {
                particles.push(new Particle());
            }
            
            shootingStars = [];
            for (let i = 0; i < 3; i++) { // Max 3 shooting stars at a time
                shootingStars.push(new ShootingStar());
            }
        }

        function animateParticles() {
            ctx.clearRect(0, 0, width, height);
            
            particles.forEach(p => {
                p.update();
                p.draw();
            });

            shootingStars.forEach(s => {
                s.update();
                s.draw();
            });

            requestAnimationFrame(animateParticles);
        }

        initParticles();
        animateParticles();
    }
});
