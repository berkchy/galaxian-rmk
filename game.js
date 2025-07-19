const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
// updateGameObjectsOnResize fonksiyonu ve event listener'ları zaten tanımlıysa tekrar tanımlama!

// Yıldızlar için değişkenler
let stars = [];
for (let i = 0; i < 100; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 1,
        speed: Math.random() * 2 + 1
    });
}

function set(variable, value) {
    document.cookie = variable + "=" + value + "; expires=Fri, 31 Dec 9999 23:59:59 GMT";
}

function get(variable) {
    var cookies = document.cookie.split(';');
    for (var i = 0; i < cookies.length; i++) {
        var cookie = cookies[i].trim();
        if (cookie.indexOf(variable + "=") === 0) {
            return cookie.substring(variable.length + 1);
        }
    }
    return "";
}

let lastShotTime = 0;
let musicTimer = 0;
let musicPlaying = false;
const shotCooldown = 170; // 0.25 saniye ateş etme hızı
const enemies_spawn_x = 10;

// Dalga sistemi ve geçiş animasyonu için değişkenler
let wave = 1;
let enemiesInWave = 30;
let enemiesRemaining = enemiesInWave;
let enemySpawnRate = 350;
let enemySpeedMultiplier = 1;
let waveCompleted = false;
let waveTransition = false;
let waveTransitionStep = 0;
let playerTransitionX = 0;
let waveDisplayTime = 0;
let waveDisplayText = "";
let victorySoundPlayed = false;

// Ana menü için düşman animasyonu değişkenleri
let menuEnemies = [];
let menuTime = 0;
let menuAnimationId;
let menuPlayer = {
    x: 50,
    y: canvas.height / 2 - 25, // Ekranın ortasında başla
    width: 50,
    height: 50,
    speed: 5, // Hızı artırdım
    bullets: []
};
let menuLastShotTime = 0;
let menuShotCooldown = 190; // 0.15 saniye ateş etme hızı (daha hızlı)

// Görseller
let playerImage = new Image();
playerImage.src = 'images/player.png';

const enemys = [
    "images/enemy_1.png",
    "images/enemy_2.png",
    "images/enemy_3.png",
    "images/enemy_4.png",
    "images/enemy_5.png"
];

let bulletImage = new Image();
bulletImage.src = 'images/bullet.png';

let fireButtonImage = new Image();
fireButtonImage.src = 'images/fire.png';

let upButtonImage = new Image();
upButtonImage.src = 'images/up.png';

let downButtonImage = new Image();
downButtonImage.src = 'images/down.png';

let heartImage = new Image();
heartImage.src = 'images/heart.png';

let hearts = [];

let explosionImage = new Image();
explosionImage.src = 'images/explosion.png';

let explosions = [];

let damageImage = new Image();
damageImage.src = 'images/damage.png';

// Güçlendirici görselleri
let speedBoostImage = new Image();
speedBoostImage.src = 'images/speed_boost.png';

let shieldImage = new Image();
shieldImage.src = 'images/shield.png';

let tripleShotImage = new Image();
tripleShotImage.src = 'images/triple_shot.png';

// Sesler
const sounds = [
    "sounds/shoot.wav",
    "sounds/dead.wav",
    "sounds/hurt.wav",
    "sounds/gameover.mp3",
    "sounds/coin.wav",
    "sounds/gamestart.mp3",
    "sounds/gamemusic.mp3",
    "sounds/heart.mp3",
    "sounds/victory.mp3"
];

// Oyun nesneleri
let player = {
    x: 50,
    y: canvas.height / 2 - 25,
    width: 50,
    height: 50,
    speed: 5,
    bullets: [],
    hearts: 3.0,
    speedBoost: false,
    speedBoostTime: 0,
    shield: false,
    shieldTime: 0,
    tripleShot: false,
    tripleShotTime: 0
};

let enemies = [];
let enemyBullets = []; // Düşman mermileri
let powerUps = []; // Güçlendiriciler
let score = 0;
let high_score = 0;
let gameOver = false;
let time = 0;
let isDamaged = false;

// Boss görselleri ve boss müziği
let bossImages = [
    'images/boss_1.png',
    'images/boss_2.png',
    'images/boss_3.png',
    'images/boss_4.png'
]; // PNG'leri eklemeyi unutmayın
let bossMusic = new Audio('sounds/bossmusic.mp3'); // Boss müziği ekleyin
let boss = null;
let bossBullets = [];
let bossActive = false;
let bossAttackTimer = 0;
let bossAttackStep = 0;
let bossWave = false;
let bossKilled = false;

// Yıldız çizme fonksiyonu
let starsSpeedMultiplier = 1;
function drawStars() {
    ctx.fillStyle = 'white';
    stars.forEach(star => {
        star.x -= star.speed * starsSpeedMultiplier;
        if (star.x < 0) {
            star.x = canvas.width;
            star.y = Math.random() * canvas.height;
        }
        ctx.fillRect(star.x, star.y, star.size, star.size);
    });
}

function drawBackground() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawStars();
}

function createHeart() {
    const createChance = Math.floor((Math.random() * 4) + 1);
    if (createChance === 2) {
        let size = 30;
        let y = Math.random() * (canvas.height - size);
        
        hearts.push({
            x: canvas.width,
            y: y,
            width: size,
            height: size,
            speed: 2,
            image: heartImage
        });
    }
}

function drawHearts() {
    hearts.forEach((heart, index) => {
        heart.x -= heart.speed;
        ctx.drawImage(heart.image, heart.x, heart.y, heart.width, heart.height);
        
        if (heart.x + heart.width < 0) {
            hearts.splice(index, 1);
        }
        
        if (heart.x < player.x + player.width && heart.x + heart.width > player.x &&
            heart.y < player.y + player.height && heart.y + heart.height > player.y) {
            player.hearts += 1.0;
            hearts.splice(index, 1);
            playSound(7);
        }
    });
}

function createExplosion(x, y, w, h, duration = 10) {
    explosions.push({
        x: x,
        y: y,
        width: w,
        height: h,
        duration: duration
    });
}

function desktopUser() {
    const userAgent = navigator.userAgent;
    return !/Mobi|Android/i.test(userAgent);
}

function displayWaveInfo() {
    if(!gameOver && !waveTransition) {
        ctx.fillStyle = 'white';
        ctx.font = "10px 'Press Start 2P'";
        ctx.fillText("Wave: " + wave, canvas.width - 150, 90);
        ctx.fillText("Enemies: " + enemiesRemaining, canvas.width - 150, 115);
    }
}

function drawWaveTransition() {
    if (waveTransitionStep > 1 && waveDisplayText) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, canvas.height/2 - 50, canvas.width, 100);
        
        ctx.fillStyle = 'white';
        ctx.font = "30px 'Press Start 2P'";
        ctx.textAlign = "center";
        ctx.fillText(waveDisplayText, canvas.width/2, canvas.height/2 + 10);
        ctx.textAlign = "left";
    }
}

function waveTransitionAnimation() {
    if (waveTransitionStep === 0) {
        stopMusic();
        if (!victorySoundPlayed) {
            playSound(8);
            victorySoundPlayed = true;
        }
        waveTransitionStep = 1;
    } 
    else if (waveTransitionStep === 1) {
        let t = Math.min((player.x - 50) / (canvas.width + 100 - 50), 1);
        let ease = 1 + 7.5 * t * t; // quadratic ease-in
        starsSpeedMultiplier = ease;
        player.x += 8 * ease;
        if (player.x > canvas.width + 100) {
            waveTransitionStep = 2;
            showWaveMessage('WAVE ' + (wave-1) + ' COMPLETED!', 3200);
        }
    } 
    else if (waveTransitionStep === 2) {
        if (!waveTransitionAnimation._shown) {
            showWaveMessage('WAVE ' + wave, 3200);
            waveTransitionAnimation._shown = true;
        }
        setTimeout(() => {
            waveTransitionStep = 3;
            player.x = -100;
            player.y = canvas.height / 2 - 25;
            waveTransitionAnimation._shown = false;
        }, 1800);
    } 
    else if (waveTransitionStep === 3) {
        waveTransitionStep = 4;
    } 
    else if (waveTransitionStep === 4) {
        let t = Math.min((player.x + 100) / (50 + 100), 1);
        let ease = 1 + 4.5 * (1-t) * (1-t);
        starsSpeedMultiplier = ease;
        player.x += 8 * ease;
        if (player.x >= 50) {
            player.x = 50;
            waveTransition = false;
            waveTransitionStep = 0;
            waveCompleted = false;
            victorySoundPlayed = false;
            musicID = setTimeout(() => { gameMusic(); }, 500);
        }
    }
}

function completeWave() {
    bossWave = false;
    bossActive = false;
    boss = null;
    wave++;
    enemiesInWave = Math.floor(30 * (1 + wave * 0.3));
    enemiesRemaining = enemiesInWave;
    enemySpawnRate = Math.max(250, 500 - wave * 15);
    enemySpeedMultiplier = 1 + wave * 0.1;
    player.bullets = [];
    waveTransition = true;
    waveTransitionStep = 0;
    showWaveMessage('WAVE ' + (wave-1) + ' COMPLETED!', 3200);
    if (typeof enemySpawnInterval !== 'undefined') clearInterval(enemySpawnInterval);
    enemySpawnInterval = setInterval(createEnemy, enemySpawnRate);
}

// drawPlayer fonksiyonunun tek ve doğru hali:
function drawPlayer() {
    if (!playerDead || !gameOver) {
        ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);
    }
}

function movePlayer() {
    if (playerDead || gameOver) return;
    let currentSpeed = player.speed;
    if (player.speedBoost) {
        currentSpeed *= 2; // Hız artırımı aktifse 2 kat hız
    }
    
    if (!waveTransition && (keys['ArrowUp'] || keys['KeyW']) && player.y > 0) {
        player.y -= currentSpeed;
    }
    if (!waveTransition && (keys['ArrowDown'] || keys['KeyS']) && player.y < canvas.height - player.height) {
        player.y += currentSpeed;
    }
}

function shoot() {
    const now = Date.now();
    if(gameOver || playerDead || waveTransition || (now - lastShotTime) <= shotCooldown) return;
    lastShotTime = now;
    
    const bulletW = 10, bulletH = 5;
    if (player.tripleShot) {
        const spread = 0.13;
        player.bullets.push({
            x: player.x + player.width,
            y: player.y + player.height / 2 - bulletH / 2 - 10, // yukarı çapraz
            width: bulletW,
            height: bulletH,
            speed: 25,
            angle: -spread
        });
        player.bullets.push({
            x: player.x + player.width,
            y: player.y + player.height / 2 - bulletH / 2, // düz
            width: bulletW,
            height: bulletH,
            speed: 25,
            angle: 0
        });
        player.bullets.push({
            x: player.x + player.width,
            y: player.y + player.height / 2 - bulletH / 2 + 10, // aşağı çapraz
            width: bulletW,
            height: bulletH,
            speed: 25,
            angle: spread
        });
    } else {
        player.bullets.push({
            x: player.x + player.width,
            y: player.y + player.height / 2 - bulletH / 2,
            width: bulletW,
            height: bulletH,
            speed: 25,
            angle: 0
        });
    }
    playSound(0);
}

function drawBullets() {
    player.bullets.forEach((bullet, index) => {
        // Açılı hareket için
        if (bullet.angle) {
            bullet.x += bullet.speed * Math.cos(bullet.angle);
            bullet.y += bullet.speed * Math.sin(bullet.angle);
        } else {
            bullet.x += bullet.speed;
        }
        // Menüdekiyle aynı mermi boyutu ve renk
        bullet.width = 10;
        bullet.height = 5;
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        ctx.strokeStyle = '#FFFF00';
        ctx.lineWidth = 1;
        ctx.strokeRect(bullet.x, bullet.y, bullet.width, bullet.height);
        // Ekrandan çıkan mermileri sil
        if (bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
            player.bullets.splice(index, 1);
        }
    });
}

// Tek ve doğru createEnemy fonksiyonu:
function createEnemy() {
    // Boss dalgası kontrolü
    if (!waveTransition && !bossActive && !bossWave && (wave % 5 === 0) && wave > 0) {
        enemies = [];
        enemiesRemaining = 0;
        if (typeof enemySpawnInterval !== 'undefined') clearInterval(enemySpawnInterval);
        let bossImg = new Image();
        let bossIndex = Math.floor(Math.random() * bossImages.length);
        bossImg.src = bossImages[bossIndex];
        boss = {
            x: canvas.width + 40,
            y: canvas.height / 2 - 150,
            width: 300,
            height: 300,
            speed: 4,
            dir: 1,
            hp: 30 + wave * 10,
            maxHp: 30 + wave * 10,
            image: bossImg,
            entered: false
        };
        bossActive = true;
        bossWave = true;
        bossKilled = false;
        bossBullets = [];
        bossAttackTimer = 0;
        bossAttackStep = 0;
        if (typeof music_audio !== 'undefined') {
            music_audio.pause();
            music_audio.currentTime = 0;
        }
        if (typeof musicID !== 'undefined') clearTimeout(musicID);
        bossMusic.currentTime = 0;
        bossMusic.loop = true;
        bossMusic.play();
        showWaveMessage('BOSS WAVE', 2500);
        return;
    }
    // Normal düşmanlar
    if (!waveTransition && enemiesRemaining > 0 && !bossActive && !(wave % 5 === 0 && wave > 0)) {
        const createChance = Math.floor((Math.random() * 6) + 1);
        if (createChance >= 5) {
            let size = Math.random() * 20 + 45;
            let y = Math.random() * (canvas.height - size);
            let enemyImg = new Image();
            let randomEnemyIndex = Math.floor(Math.random() * enemys.length);
            enemyImg.src = enemys[randomEnemyIndex];
            enemies.push({
                x: canvas.width - enemies_spawn_x,
                y: y,
                width: size,
                height: size,
                speed: 2 * enemySpeedMultiplier,
                initialY: y,
                amplitude: 50,
                frequency: 0.05,
                image: enemyImg,
                chaser: Math.random() < 0.2 // %20 şansla takipçi
            });
            enemiesRemaining--;
        }
    }
    // Dalga bitti, boss yoksa ve boss dalgası değilse dalga tamamla
    if (enemiesRemaining <= 0 && enemies.length === 0 && !waveTransition && !bossActive && !(wave % 5 === 0 && wave > 0)) {
        completeWave();
    }
}

function drawEnemies() {
    if(gameOver || waveTransition) return;
    time += 0.05;
    // Boss varsa boss'u çiz
    if (bossActive && boss) {
        // Boss sağdan ekrana girsin
        if (!boss.entered) {
            boss.x -= boss.speed;
            if (boss.x <= canvas.width - boss.width - 40) {
                boss.x = canvas.width - boss.width - 40;
                boss.entered = true;
            }
        } else {
            // Boss ekranda, yukarı-aşağı hareket
            boss.y += boss.speed * boss.dir * 0.5;
            if (boss.y < 0 || boss.y > canvas.height - boss.height) boss.dir *= -1;
        }
        ctx.drawImage(boss.image, boss.x, boss.y, boss.width, boss.height);
        // Boss can barı
        ctx.save();
        ctx.fillStyle = '#222';
        ctx.fillRect(boss.x, boss.y - 18, boss.width, 12);
        ctx.fillStyle = '#FF1744';
        ctx.fillRect(boss.x, boss.y - 18, boss.width * (boss.hp / boss.maxHp), 12);
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(boss.x, boss.y - 18, boss.width, 12);
        ctx.restore();
        // Boss öldü mü?
        if (boss.hp <= 0 && !bossKilled) {
            bossActive = false;
            bossWave = false;
            bossKilled = true;
            boss = null;
            bossMusic.pause();
            bossMusic.currentTime = 0;
            bossMusic.loop = false;
            setTimeout(() => { gameMusic(); }, 500);
            completeWave();
        }
        // Boss ateş etme: sadece boss.entered true ise
        if (boss.entered) {
            bossAttackTimer += 1/60;
            if (bossAttackTimer > 5) {
                if (bossAttackStep < 3) {
                    fireBossBullets();
                    bossAttackStep++;
                    bossAttackTimer = bossAttackStep < 3 ? bossAttackTimer - 1 : bossAttackTimer;
                } else {
                    bossAttackTimer = 0;
                    bossAttackStep = 0;
                }
            }
        }
    }
    // Normal düşmanlar
    const takipHizi = 2.2;
    enemies.forEach((enemy, index) => {
        if (enemy.chaser) {
            // Takipçi düşman: y ekseninde oyuncuya yaklaş
            if (Math.abs(player.y - enemy.y) > 2) {
                enemy.y += Math.sign(player.y - enemy.y) * takipHizi;
            }
        } else {
            // Klasik dalga hareketi
            enemy.y = enemy.initialY + Math.sin(time + index) * 10;
        }
        enemy.x -= enemy.speed;
        ctx.drawImage(enemy.image, enemy.x, enemy.y, enemy.width, enemy.height);
        createEnemyBulletRandom();
        if (enemy.x + enemy.width < 0) {
            enemies.splice(index, 1);
            score += 10;
            player.hearts -= 0.25;
            if (player.hearts <= 0) {
                endGame();
            }
            playSound(4);
            if(enemiesRemaining > 0) {
                enemiesRemaining--;
            }
        }
        if (enemy.x < player.x + player.width && enemy.x + enemy.width > player.x &&
            enemy.y < player.y + player.height && enemy.y + enemy.height > player.y) {
            if (!player.shield) {
                takeDamage();
            }
            enemies.splice(index, 1);
            if(enemiesRemaining > 0) {
                enemiesRemaining--;
            }
        }
        player.bullets.forEach((bullet, bIndex) => {
            if (bullet.x < enemy.x + enemy.width && bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height && bullet.y + bullet.height > enemy.y) {
                createExplosion(enemy.x, enemy.y, enemy.width, enemy.height);
                enemies.splice(index, 1);
                player.bullets.splice(bIndex, 1);
                score += 20;
                playSound(1);
                if(enemiesRemaining > 0) {
                    enemiesRemaining--;
                }
            }
        });
    });
}

function drawExplosions() {
    explosions.forEach((explosion, index) => {
        ctx.drawImage(explosionImage, explosion.x, explosion.y, explosion.width, explosion.height);
        explosion.duration--;

        if (explosion.duration <= 0) {
            explosions.splice(index, 1);
        }
    });
}

function displayScore() {
    if(!gameOver) {
        ctx.fillStyle = 'white';
        ctx.font = "10px 'Press Start 2P'";
        ctx.fillText("Score: " + score, canvas.width - 150, 65);
    }
}

function displayHighScore() {
    if(!gameOver) {
        ctx.fillStyle = 'white';
        ctx.font = "10px 'Press Start 2P'";
        ctx.fillText("HI-Score: " + high_score, canvas.width - 150, 40);
    }
}

function endGame() {
    playSound(3);
    stopMusic();
    clearTimeout(musicID);
    if (typeof window.music_audio !== 'undefined') {
        window.music_audio.pause();
        window.music_audio.currentTime = 0;
    }
    if (typeof window.bossMusic !== 'undefined') {
        window.bossMusic.pause();
        window.bossMusic.currentTime = 0;
    }
    gameOver = true;
    document.getElementById('controls').style.display = 'none';
    cancelAnimationFrame(animationId);
    clearInterval(enemySpawnInterval);
    clearInterval(heartSpawnInterval);
    showHUDBar(false);
}

// Oyun kontrolleri
let enemySpawnInterval;
let heartSpawnInterval;
let animationId;

const restartButton = document.getElementById('restart');
if (restartButton) {
    restartButton.addEventListener('click', () => {
        // Ana menü animasyonunu tekrar başlat
        stopMenuAnimation();
        menuEnemies = [];
        menuTime = 0;
        startMenuAnimation();
        
        // Oyunu sıfırla
        window.location.reload();
    });
}

const startButton = document.getElementById('start');
if (startButton) {
    startButton.addEventListener('click', () => {
        startGame();
    });
}

let musicID;

// Oyun sırasında RPG UI barı göster/gizle
function showRPGUIBar(show) {
    if (typeof window !== 'undefined' && typeof window.showRPGUIBar === 'function') {
        window.showRPGUIBar(show);
    }
}

// displayHearts fonksiyonu ve çağrıları kaldırıldı.

function displayWaveInfo() {
    if(!gameOver && !waveTransition) {
        ctx.fillStyle = 'white';
        ctx.font = "10px 'Press Start 2P'";
        ctx.fillText("Wave: " + wave, canvas.width - 150, 90);
        ctx.fillText("Enemies: " + enemiesRemaining, canvas.width - 150, 115);
    }
}

function drawWaveTransition() {
    if (waveTransitionStep > 1 && waveDisplayText) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, canvas.height/2 - 50, canvas.width, 100);
        
        ctx.fillStyle = 'white';
        ctx.font = "30px 'Press Start 2P'";
        ctx.textAlign = "center";
        ctx.fillText(waveDisplayText, canvas.width/2, canvas.height/2 + 10);
        ctx.textAlign = "left";
    }
}

function waveTransitionAnimation() {
    if (waveTransitionStep === 0) {
        stopMusic();
        if (!victorySoundPlayed) {
            playSound(8);
            victorySoundPlayed = true;
        }
        waveTransitionStep = 1;
    } 
    else if (waveTransitionStep === 1) {
        let t = Math.min((player.x - 50) / (canvas.width + 100 - 50), 1);
        let ease = 1 + 4.5 * t * t; // quadratic ease-in
        starsSpeedMultiplier = ease;
        player.x += 8 * ease;
        if (player.x > canvas.width + 100) {
            waveTransitionStep = 2;
            showWaveMessage('WAVE ' + (wave-1) + ' COMPLETED!', 3200);
        }
    } 
    else if (waveTransitionStep === 2) {
        if (!waveTransitionAnimation._shown) {
            showWaveMessage('WAVE ' + wave, 3200);
            waveTransitionAnimation._shown = true;
        }
        setTimeout(() => {
            waveTransitionStep = 3;
            player.x = -100;
            player.y = canvas.height / 2 - 25;
            waveTransitionAnimation._shown = false;
        }, 1800);
    } 
    else if (waveTransitionStep === 3) {
        waveTransitionStep = 4;
    } 
    else if (waveTransitionStep === 4) {
        let t = Math.min((player.x + 100) / (50 + 100), 1);
        let ease = 1 + 7.5 * (1-t) * (1-t);
        starsSpeedMultiplier = ease;
        player.x += 8 * ease;
        if (player.x >= 50) {
            player.x = 50;
            waveTransition = false;
            waveTransitionStep = 0;
            waveCompleted = false;
            victorySoundPlayed = false;
            musicID = setTimeout(() => { gameMusic(); }, 500);
        }
    }
}

function completeWave() {
    wave++;
    enemiesInWave = Math.floor(30 * (1 + wave * 0.3));
    enemiesRemaining = enemiesInWave;
    enemySpawnRate = Math.max(250, 500 - wave * 15);
    enemySpeedMultiplier = 1 + wave * 0.1;
    
    player.bullets = [];
    
    waveTransition = true;
    waveTransitionStep = 0;
    showWaveMessage('WAVE ' + (wave-1) + ' COMPLETED!', 3200);
}

function drawPlayer() {
    if (!playerDead || !gameOver)
        ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);
}

function movePlayer() {
    if (playerDead || gameOver) return;
    let currentSpeed = player.speed;
    if (player.speedBoost) {
        currentSpeed *= 2; // Hız artırımı aktifse 2 kat hız
    }
    
    if (!waveTransition && keys['ArrowUp'] && player.y > 0) {
        player.y -= currentSpeed;
    }
    if (!waveTransition && keys['ArrowDown'] && player.y < canvas.height - player.height) {
        player.y += currentSpeed;
    }
}

function shoot() {
    const now = Date.now();
    if(gameOver || playerDead || waveTransition || (now - lastShotTime) <= shotCooldown) return;
    lastShotTime = now;
    
    const bulletW = 10, bulletH = 5;
    if (player.tripleShot) {
        const spread = 0.13;
        player.bullets.push({
            x: player.x + player.width,
            y: player.y + player.height / 2 - bulletH / 2 - 10, // yukarı çapraz
            width: bulletW,
            height: bulletH,
            speed: 25,
            angle: -spread
        });
        player.bullets.push({
            x: player.x + player.width,
            y: player.y + player.height / 2 - bulletH / 2, // düz
            width: bulletW,
            height: bulletH,
            speed: 25,
            angle: 0
        });
        player.bullets.push({
            x: player.x + player.width,
            y: player.y + player.height / 2 - bulletH / 2 + 10, // aşağı çapraz
            width: bulletW,
            height: bulletH,
            speed: 25,
            angle: spread
        });
    } else {
        player.bullets.push({
            x: player.x + player.width,
            y: player.y + player.height / 2 - bulletH / 2,
            width: bulletW,
            height: bulletH,
            speed: 25,
            angle: 0
        });
    }
    playSound(0);
}

function drawBullets() {
    player.bullets.forEach((bullet, index) => {
        // Açılı hareket için
        if (bullet.angle) {
            bullet.x += bullet.speed * Math.cos(bullet.angle);
            bullet.y += bullet.speed * Math.sin(bullet.angle);
        } else {
            bullet.x += bullet.speed;
        }
        // Sarı dikdörtgen mermi
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        ctx.strokeStyle = '#FFFF00';
        ctx.lineWidth = 1;
        ctx.strokeRect(bullet.x, bullet.y, bullet.width, bullet.height);
        // Ekrandan çıkan mermileri sil
        if (bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
            player.bullets.splice(index, 1);
        }
    });
}

function createEnemy() {
    // Boss dalgası kontrolü
    if (!waveTransition && !bossActive && !bossWave && (wave % 5 === 0) && wave > 0) {
        let bossImg = new Image();
        let bossIndex = Math.floor(Math.random() * bossImages.length);
        bossImg.src = bossImages[bossIndex];
        boss = {
            x: canvas.width + 40,
            y: canvas.height / 2 - 150,
            width: 300,
            height: 300,
            speed: 4,
            dir: 1,
            hp: 30 + wave * 10,
            maxHp: 30 + wave * 10,
            image: bossImg,
            entered: false
        };
        bossActive = true;
        bossWave = true;
        bossKilled = false;
        bossBullets = [];
        bossAttackTimer = 0;
        bossAttackStep = 0;
        stopMusic && stopMusic();
        bossMusic.currentTime = 0;
        bossMusic.play();
        showWaveMessage('BOSS WAVE', 2500);
        return;
    }
    // Normal düşmanlar
    if (!waveTransition && enemiesRemaining > 0 && !bossActive && !(wave % 5 === 0 && wave > 0)) {
        const createChance = Math.floor((Math.random() * 6) + 1);
        if (createChance >= 5) {
            let size = Math.random() * 20 + 45;
            let y = Math.random() * (canvas.height - size);
            let enemyImg = new Image();
            let randomEnemyIndex = Math.floor(Math.random() * enemys.length);
            enemyImg.src = enemys[randomEnemyIndex];
            enemies.push({
                x: canvas.width - enemies_spawn_x,
                y: y,
                width: size,
                height: size,
                speed: 2 * enemySpeedMultiplier,
                initialY: y,
                amplitude: 50,
                frequency: 0.05,
                image: enemyImg,
                chaser: Math.random() < 0.2 // %20 şansla takipçi
            });
            enemiesRemaining--;
        }
    }
    // Dalga bitti, boss yoksa ve boss dalgası değilse dalga tamamla
    if (enemiesRemaining <= 0 && enemies.length === 0 && !waveTransition && !bossActive && !(wave % 5 === 0 && wave > 0)) {
        completeWave();
    }
}

function drawEnemies() {
    if(gameOver || waveTransition) return;
    
    time += 0.05;
    // Boss varsa boss'u çiz
    if (bossActive && boss) {
        // Boss hareketi (yavaşça yukarı-aşağı)
        boss.y += boss.speed * boss.dir;
        if (boss.y < 0 || boss.y > canvas.height - boss.height) boss.dir *= -1;
        ctx.drawImage(boss.image, boss.x, boss.y, boss.width, boss.height);
        // Boss can barı
        ctx.save();
        ctx.fillStyle = '#222';
        ctx.fillRect(boss.x, boss.y - 18, boss.width, 12);
        ctx.fillStyle = '#FF1744';
        ctx.fillRect(boss.x, boss.y - 18, boss.width * (boss.hp / boss.maxHp), 12);
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(boss.x, boss.y - 18, boss.width, 12);
        ctx.restore();
        // Boss öldü mü?
        if (boss.hp <= 0 && !bossKilled) {
            bossActive = false;
            bossWave = false;
            bossKilled = true;
            boss = null;
            bossMusic.pause();
            bossMusic.currentTime = 0;
            bossMusic.loop = false;
            setTimeout(() => { gameMusic(); }, 500);
            completeWave();
        }
        // Boss mermi atış sistemi
        bossAttackTimer += 1/60;
        if (bossAttackTimer > 5) {
            if (bossAttackStep < 3) {
                fireBossBullets();
                bossAttackStep++;
                bossAttackTimer = bossAttackStep < 3 ? bossAttackTimer - 1 : bossAttackTimer;
            } else {
                bossAttackTimer = 0;
                bossAttackStep = 0;
            }
        }
    }
    // Normal düşmanlar
    const takipHizi = 2.2;
    enemies.forEach((enemy, index) => {
        if (enemy.chaser) {
            // Takipçi düşman: y ekseninde oyuncuya yaklaş
            if (Math.abs(player.y - enemy.y) > 2) {
                enemy.y += Math.sign(player.y - enemy.y) * takipHizi;
            }
        } else {
            // Klasik dalga hareketi
            enemy.y = enemy.initialY + Math.sin(time + index) * 10;
        }
        enemy.x -= enemy.speed;
        
        ctx.drawImage(enemy.image, enemy.x, enemy.y, enemy.width, enemy.height);
        
        // Düşman ateş etme
        createEnemyBulletRandom();

        if (enemy.x + enemy.width < 0) {
            enemies.splice(index, 1);
            score += 10;
            player.hearts -= 0.25; // Can 0.25 azalır
            if (player.hearts <= 0) {
                endGame();
            }
            playSound(4);
            
            if(enemiesRemaining > 0) {
                enemiesRemaining--;
            }
        }
        
        if (enemy.x < player.x + player.width && enemy.x + enemy.width > player.x &&
            enemy.y < player.y + player.height && enemy.y + enemy.height > player.y) {
            if (!player.shield) { // Kalkan yoksa hasar al
                takeDamage();
            }
            enemies.splice(index, 1);
            
            if(enemiesRemaining > 0) {
                enemiesRemaining--;
            }
        }

        player.bullets.forEach((bullet, bIndex) => {
            if (bullet.x < enemy.x + enemy.width && bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height && bullet.y + bullet.height > enemy.y) {
                createExplosion(enemy.x, enemy.y, enemy.width, enemy.height);
                enemies.splice(index, 1);
                player.bullets.splice(bIndex, 1);
                score += 20;
                playSound(1);
                
                if(enemiesRemaining > 0) {
                    enemiesRemaining--;
                }
            }
        });
    });
}

function drawExplosions() {
    explosions.forEach((explosion, index) => {
        ctx.drawImage(explosionImage, explosion.x, explosion.y, explosion.width, explosion.height);
        explosion.duration--;

        if (explosion.duration <= 0) {
            explosions.splice(index, 1);
        }
    });
}

function displayScore() {
    if(!gameOver) {
        ctx.fillStyle = 'white';
        ctx.font = "10px 'Press Start 2P'";
        ctx.fillText("Score: " + score, canvas.width - 150, 65);
    }
}

function displayHighScore() {
    if(!gameOver) {
        ctx.fillStyle = 'white';
        ctx.font = "10px 'Press Start 2P'";
        ctx.fillText("HI-Score: " + high_score, canvas.width - 150, 40);
    }
}

function endGame() {
    playSound(3);
    stopMusic();
    clearTimeout(musicID);
    if (typeof window.music_audio !== 'undefined') {
        window.music_audio.pause();
        window.music_audio.currentTime = 0;
    }
    if (typeof window.bossMusic !== 'undefined') {
        window.bossMusic.pause();
        window.bossMusic.currentTime = 0;
    }
    gameOver = true;
    playerImage.src = "images/null.png";
    document.getElementById('controls').style.display = 'none';
    cancelAnimationFrame(animationId);
    clearInterval(enemySpawnInterval);
    clearInterval(heartSpawnInterval);
    showHUDBar(false);
}

// Oyun kontrolleri
const keys = {};

// Klavye kontrolleri
window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.key === 'w' || e.key === 'W') keys['KeyW'] = true;
    if (e.key === 's' || e.key === 'S') keys['KeyS'] = true;
    if(e.code === "Space") {
        // Ana menüde mi yoksa oyunda mı kontrol et
        const titleScreen = document.getElementById('titleScreen');
        if (titleScreen && titleScreen.style.display !== 'none') {
            menuShoot(); // Ana menüde ateş et
        } else {
            shoot(); // Oyunda ateş et
        }
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    if (e.key === 'w' || e.key === 'W') keys['KeyW'] = false;
    if (e.key === 's' || e.key === 'S') keys['KeyS'] = false;
});

// Mobil kontroller (GÜNCELLENDİ)
upButton.addEventListener('touchstart', (e) => {
    e.preventDefault();
    keys['ArrowUp'] = true;
});

upButton.addEventListener('touchend', (e) => {
    e.preventDefault();
    keys['ArrowUp'] = false;
});

downButton.addEventListener('touchstart', (e) => {
    e.preventDefault();
    keys['ArrowDown'] = true;
});

downButton.addEventListener('touchend', (e) => {
    e.preventDefault();
    keys['ArrowDown'] = false;
});

document.getElementById('fireButton').addEventListener('click', (e) => {
    e.preventDefault();
    shoot();
});

document.getElementById('fireButton').addEventListener('touchstart', (e) => {
    e.preventDefault();
    shoot();
});

// Ses fonksiyonları
function playSound(index) {
    if (index >= 0 && index < sounds.length) {
        const audio = new Audio(sounds[index]);
        audio.play();
    }
}

const music_audio = new Audio(sounds[6]);

function stopMusic() {
    music_audio.pause();
}

function gameMusic() {
    if (gameOver) return;
    if (bossActive) return;
    music_audio.play();
    musicID = setTimeout(() => { gameMusic(); }, (85 * 1000));
}

// Ses ayarları
var soundButton = document.getElementById('soundButton');
if (soundButton) {
    soundButton.addEventListener('click', function() {
        if(music_audio.volume <= 0.0) {
            music_audio.volume = 1.0;
            soundButton.textContent = '🔊';
            set("sound_volume", music_audio.volume);
        } else {
            music_audio.volume = 0.0;
            soundButton.textContent = '🔈';
            set("sound_volume", music_audio.volume);
        }
    });
}

function iconUpdate() {
    if (soundButton) {
        if(music_audio.volume <= 0.0) {
            soundButton.textContent = '🔈';
        } else {
            soundButton.textContent = '🔊';
        }
    }
}

function loadDatas() {
    let data = get("high_score");
    if(data.length > 0) high_score = parseInt(data);
    
    data = get("sound_volume");
    if(data.length > 0) music_audio.volume = parseFloat(data);
}

// Ana menü için düşman oluşturma fonksiyonu
function createMenuEnemy() {
    if (menuEnemies.length < 8) { // Maksimum 8 düşman
        let size = Math.random() * 30 + 20;
        let y = Math.random() * (canvas.height - size);
        
        let enemyImg = new Image();
        let randomEnemyIndex = Math.floor(Math.random() * enemys.length);
        enemyImg.src = enemys[randomEnemyIndex];

        menuEnemies.push({
            x: canvas.width,
            y: y,
            width: size,
            height: size,
            speed: 2, // Daha yavaş hız
            initialY: y,
            amplitude: 30,
            frequency: 0.03,
            image: enemyImg
        });
    }
}

// Ana menü için oyuncu çizme fonksiyonu
function drawMenuPlayer() {
    ctx.drawImage(playerImage, menuPlayer.x, menuPlayer.y, menuPlayer.width, menuPlayer.height);
}

// Ana menü için oyuncu hareketi (tamamen otomatik)
function moveMenuPlayer() {
    // En yakın düşmanı bul
    let nearestEnemy = null;
    let minDistance = Infinity;
    
    menuEnemies.forEach(enemy => {
        let distance = Math.abs(enemy.y - menuPlayer.y);
        if (distance < minDistance) {
            minDistance = distance;
            nearestEnemy = enemy;
        }
    });
    
    // Düşman varsa ona doğru hareket et
    if (nearestEnemy && Math.abs(nearestEnemy.y - menuPlayer.y) > 5) {
        if (nearestEnemy.y > menuPlayer.y) {
            menuPlayer.y += menuPlayer.speed;
        } else {
            menuPlayer.y -= menuPlayer.speed;
        }
    }
    
    // Ekran sınırlarını kontrol et
    if (menuPlayer.y < 0) {
        menuPlayer.y = 0;
    }
    if (menuPlayer.y > canvas.height - menuPlayer.height) {
        menuPlayer.y = canvas.height - menuPlayer.height;
    }
}

// Ana menü için ateş etme fonksiyonu
function menuShoot() {
    const currentTime = Date.now();
    if (currentTime - menuLastShotTime > menuShotCooldown) {
        menuPlayer.bullets.push({
            x: menuPlayer.x + menuPlayer.width,
            y: menuPlayer.y + menuPlayer.height / 2 - 4,
            width: 10, // Mermi boyutunu büyüttüm
            height: 5, // Mermi boyutunu büyüttüm
            speed: 25 // Mermi hızını artırdım
        });
        menuLastShotTime = currentTime;
        playSound(0); // Ateş sesi
    }
}

// Ana menü için mermi çizme fonksiyonu
function drawMenuBullets() {
    menuPlayer.bullets.forEach((bullet, index) => {
        bullet.x += bullet.speed;
        bullet.width = 10;
        bullet.height = 5;
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        ctx.strokeStyle = '#FFFF00';
        ctx.lineWidth = 1;
        ctx.strokeRect(bullet.x, bullet.y, bullet.width, bullet.height);
        if (bullet.x > canvas.width) {
            menuPlayer.bullets.splice(index, 1);
        }
        menuEnemies.forEach((enemy, enemyIndex) => {
            if (bullet.x < enemy.x + enemy.width && bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height && bullet.y + bullet.height > enemy.y) {
                createExplosion(enemy.x, enemy.y, enemy.width, enemy.height);
                menuEnemies.splice(enemyIndex, 1);
                menuPlayer.bullets.splice(index, 1);
                playSound(1);
            }
        });
    });
}

// Ana menü için düşman çizme fonksiyonu
function drawMenuEnemies() {
    menuTime += 0.03;
    menuEnemies.forEach((enemy, index) => {
        // Sinüs dalgası ile yukarı-aşağı hareket
        enemy.y = enemy.initialY + Math.sin(menuTime + index) * enemy.amplitude;
        enemy.x -= enemy.speed;
        
        // Düşmanı çiz
        ctx.drawImage(enemy.image, enemy.x, enemy.y, enemy.width, enemy.height);

        // Ekrandan çıkan düşmanları sil
        if (enemy.x + enemy.width < 0) {
            menuEnemies.splice(index, 1);
        }
    });
}

// Ana menü animasyonu
function animateMenu() {
    ctx.save();
    ctx.globalAlpha = 0.22; // Arka planı daha şeffaf yap
    drawBackground();
    ctx.globalAlpha = 1.0;
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.45; // Bot oyununu daha şeffaf yap
    drawMenuPlayer();
    moveMenuPlayer();
    drawMenuBullets();
    drawMenuEnemies();
    drawExplosions();
    ctx.restore();
    // Akıllı otomatik ateş etme
    if (menuEnemies.length > 0) {
        // En yakın düşmanı bul
        let nearestEnemy = null;
        let minDistance = Infinity;
        
        menuEnemies.forEach(enemy => {
            let distance = Math.abs(enemy.y - menuPlayer.y);
            if (distance < minDistance) {
                minDistance = distance;
                nearestEnemy = enemy;
            }
        });
        
        // Düşman yakınsa ateş et
        if (nearestEnemy && Math.abs(nearestEnemy.y - menuPlayer.y) < 30) {
            if (Math.random() < 0.05) { // %5 şans ile ateş et
                menuShoot();
            }
        } else {
            // Genel ateş etme
            if (Math.random() < 0.02) { // %2 şans ile ateş et
                menuShoot();
            }
        }
    }
    
    // Yeni düşman oluştur
    if (Math.random() < 0.02) { // %2 şans ile yeni düşman
        createMenuEnemy();
    }
    
    menuAnimationId = requestAnimationFrame(animateMenu);
}

// Ana menü animasyonunu başlat
function startMenuAnimation() {
    // Oyuncu pozisyonunu sıfırla
    menuPlayer.y = canvas.height / 2 - 25;
    menuPlayer.bullets = [];
    menuEnemies = [];
    menuTime = 0;
    animateMenu();
}

// Ana menü animasyonunu durdur
function stopMenuAnimation() {
    if (menuAnimationId) {
        cancelAnimationFrame(menuAnimationId);
    }
}

// Düşman mermi oluşturma fonksiyonu
let lastEnemyShotTime = 0;
let enemyShotCooldown = 1200; // 1.2 saniyede bir ateş
function createEnemyBulletRandom() {
    const now = Date.now();
    if (
        enemies.length > 0 &&
        (now - lastEnemyShotTime) > enemyShotCooldown &&
        enemyBullets.length === 0 // Ekranda hiç düşman mermisi yoksa
    ) {
        lastEnemyShotTime = now;
        // Rastgele bir düşman seç
        const randomIndex = Math.floor(Math.random() * enemies.length);
        const enemy = enemies[randomIndex];
        enemyBullets.push({
            x: enemy.x,
            y: enemy.y + enemy.height / 2,
            width: 6,
            height: 6,
            speed: 7, // Daha hızlı mermi
            color: '#FF0000'
        });
    }
}

// Düşman mermilerini çizme fonksiyonu
function drawEnemyBullets() {
    enemyBullets.forEach((bullet, index) => {
        bullet.x -= bullet.speed;
        
        // Mermiyi çiz
        ctx.fillStyle = bullet.color;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        
        // Ekrandan çıkan mermileri sil
        if (bullet.x + bullet.width < 0) {
            enemyBullets.splice(index, 1);
        }
        
        // Oyuncuya çarpma kontrolü
        if (bullet.x < player.x + player.width && bullet.x + bullet.width > player.x &&
            bullet.y < player.y + player.height && bullet.y + bullet.height > player.y) {
            if (!player.shield) { // Kalkan yoksa hasar al
                takeDamage(0.25);
            }
            enemyBullets.splice(index, 1);
        }
    });
}

// Güçlendirici oluşturma fonksiyonu (her biri için ayrı spawn süresi)
let lastSpeedPowerUpTime = 0;
let lastShieldPowerUpTime = 0;
let lastTriplePowerUpTime = 0;
let speedPowerUpCooldown = 15000; // 15 sn
let shieldPowerUpCooldown = 20000; // 20 sn
let triplePowerUpCooldown = 25000; // 25 sn
function createPowerUp() {
    const now = Date.now();
    // Speed
    if (now - lastSpeedPowerUpTime > speedPowerUpCooldown) {
        lastSpeedPowerUpTime = now;
        spawnPowerUp('speed', speedBoostImage);
    }
    // Shield
    if (now - lastShieldPowerUpTime > shieldPowerUpCooldown) {
        lastShieldPowerUpTime = now;
        spawnPowerUp('shield', shieldImage);
    }
    // Triple Shot
    if (now - lastTriplePowerUpTime > triplePowerUpCooldown) {
        lastTriplePowerUpTime = now;
        spawnPowerUp('triple', tripleShotImage);
    }
}
function spawnPowerUp(type, image) {
    let size = 30;
    let y = Math.random() * (canvas.height - size);
    powerUps.push({
        x: canvas.width,
        y: y,
        width: size,
        height: size,
        speed: 2,
        type: type,
        image: image
    });
}

// Güçlendiricileri çizme fonksiyonu
function drawPowerUps() {
    powerUps.forEach((powerUp, index) => {
        powerUp.x -= powerUp.speed;
        ctx.drawImage(powerUp.image, powerUp.x, powerUp.y, powerUp.width, powerUp.height);
        
        if (powerUp.x + powerUp.width < 0) {
            powerUps.splice(index, 1);
        }
        
        // Oyuncu ile çarpışma kontrolü
        if (powerUp.x < player.x + player.width && powerUp.x + powerUp.width > player.x &&
            powerUp.y < player.y + player.height && powerUp.y + powerUp.height > player.y) {
            activatePowerUp(powerUp.type);
            powerUps.splice(index, 1);
            playSound(4); // Para sesi
        }
    });
}

// Güçlendirici aktivasyon fonksiyonu
function activatePowerUp(type) {
    const currentTime = Date.now();
    
    switch(type) {
        case 'speed':
            player.speedBoost = true;
            player.speedBoostTimeLeft = 10; // 10 saniye
            break;
        case 'shield':
            player.shield = true;
            player.shieldTimeLeft = 15; // 15 saniye
            break;
        case 'triple':
            player.tripleShot = true;
            player.tripleShotTimeLeft = 20; // 20 saniye
            break;
    }
}

// Güçlendirici durumlarını kontrol etme fonksiyonu
function checkPowerUpStatus() {
    if (!waveTransition) {
        if (player.speedBoost && player.speedBoostTimeLeft > 0) player.speedBoostTimeLeft -= 1/60;
        if (player.shield && player.shieldTimeLeft > 0) player.shieldTimeLeft -= 1/60;
        if (player.tripleShot && player.tripleShotTimeLeft > 0) player.tripleShotTimeLeft -= 1/60;
    }
    if (player.speedBoost && player.speedBoostTimeLeft <= 0) player.speedBoost = false;
    if (player.shield && player.shieldTimeLeft <= 0) player.shield = false;
    if (player.tripleShot && player.tripleShotTimeLeft <= 0) player.tripleShot = false;
}

// Güçlendirici durumlarını gösterme fonksiyonu
function displayPowerUpStatus() {
    if(!gameOver && !waveTransition) {
        ctx.fillStyle = 'white';
        ctx.font = "8px 'Press Start 2P'";
        
        let yPos = 140;
        if (player.speedBoost) {
            ctx.fillStyle = '#00FF00'; // Yeşil
            ctx.fillText("SPEED BOOST", canvas.width - 150, yPos);
            yPos += 15;
        }
        if (player.shield) {
            ctx.fillStyle = '#0080FF'; // Mavi
            ctx.fillText("SHIELD ACTIVE", canvas.width - 150, yPos);
            yPos += 15;
        }
        if (player.tripleShot) {
            ctx.fillStyle = '#FFD700'; // Altın sarısı
            ctx.fillText("TRIPLE SHOT", canvas.width - 150, yPos);
        }
    }
}

// Material UI barı güncelle
function getHeartsHTML() {
    let maxHearts = 3.0;
    let fullHearts = Math.floor(player.hearts);
    let halfHeart = (player.hearts % 1) >= 0.5 ? 1 : 0;
    let html = '';
    for (let i = 0; i < fullHearts; i++) html += '<span class="material-icons" style="color:#FF1744;">favorite</span>';
    if (halfHeart) html += '<span class="material-icons" style="color:#FF8A80;">favorite</span>';
    for (let i = fullHearts + halfHeart; i < maxHearts; i++) html += '<span class="material-icons" style="color:#BDBDBD;opacity:0.3;">favorite</span>';
    return html;
}
function getPowerupHTML() {
    if (player.speedBoost) return '<span class="material-icons" style="color:#00C853;">bolt</span> Speed';
    if (player.shield) return '<span class="material-icons" style="color:#2979FF;">shield</span> Shield';
    if (player.tripleShot) return '<span class="material-icons" style="color:#FFD600;">call_split</span> Triple';
    return '';
}

// Oyunu başlat
loadDatas();
drawBackground();
iconUpdate();
startMenuAnimation(); // Ana menü animasyonunu başlat

// Güçlendirici ve kalp spawn sistemi (30sn'de bir rastgele biri)
let lastPowerUpTime = 0;
let powerUpCooldown = 30000; // 30 saniye
function createRandomPowerUp() {
    const now = Date.now();
    if (now - lastPowerUpTime > powerUpCooldown && powerUps.length === 0 && hearts.length === 0) {
        lastPowerUpTime = now;
        // 4 güçlendiriciden birini rastgele seç
        const types = ['heart', 'speed', 'shield', 'triple'];
        const type = types[Math.floor(Math.random() * types.length)];
        let size = 30;
        let y = Math.random() * (canvas.height - size);
        if (type === 'heart') {
            hearts.push({
                x: canvas.width,
                y: y,
                width: size,
                height: size,
                speed: 2,
                image: heartImage
            });
        } else {
            let image = type === 'speed' ? speedBoostImage : type === 'shield' ? shieldImage : tripleShotImage;
            powerUps.push({
                x: canvas.width,
                y: y,
                width: size,
                height: size,
                speed: 2,
                type: type,
                image: image
            });
        }
    }
}

function resetGame() {
    player.hearts = 3.0;
    player.x = 50;
    player.y = canvas.height / 2 - 25;
    player.speedBoost = false;
    player.speedBoostTime = 0;
    player.shield = false;
    player.shieldTime = 0;
    player.tripleShot = false;
    player.tripleShotTime = 0;
    score = 0;
    enemies = [];
    enemyBullets = [];
    powerUps = [];
    player.bullets = [];
    hearts = [];
    explosions = [];
    gameOver = false;
    time = 0;
    waveTransition = false;
    waveTransitionStep = 0;
    waveDisplayTime = 0;
    waveDisplayText = "";
    playerDead = false;
    gameOverMusicPlayed = false;
}
function startGame() {
    const titleScreen = document.getElementById('titleScreen');
    if (titleScreen) {
        titleScreen.style.display = 'none';
    }
    if(!desktopUser()) {
        const controls = document.getElementById('controls');
        if (controls) {
            controls.style.display = 'flex';
        }
    }
    stopMenuAnimation();
    resetGame();
    wave = 1;
    enemiesInWave = 30;
    enemiesRemaining = enemiesInWave;
    enemySpawnRate = 350;
    enemySpeedMultiplier = 1;
    animate();
    clearInterval(enemySpawnInterval);
    enemySpawnInterval = setInterval(createEnemy, enemySpawnRate);
    heartSpawnInterval = setInterval(createHeart, (1000 * 10));
    playSound(5); // Start müziği (sounds/gamestart.mp3)
    if (typeof window.music_audio !== 'undefined') window.music_audio.pause();
    if (typeof window.bossMusic !== 'undefined') window.bossMusic.pause();
    musicID = setTimeout(() => { gameMusic(); }, 4800); // 4.900 sn sonra ana müzik
    showHUDBar(true);
}
window.startGame = startGame;

// animate fonksiyonunun hemen altına ekle
function animate() {
    showHUDBar(true);
    drawBackground();
    if (waveTransition) {
        waveTransitionAnimation();
        drawPlayer();
        drawWaveTransition();
    } else {
        drawPlayer();
        movePlayer();
        drawBullets();
        drawEnemies();
        drawEnemyBullets();
        drawBossBullets();
        drawExplosions();
        drawHearts();
        drawPowerUps();
        checkPowerUpStatus();
        createRandomPowerUp();
        updatePowerupBar();
    }
    if (gameOverMusicPlayed) {
        ctx.save();
        ctx.font = "bold 48px 'Press Start 2P', Arial";
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2);
        ctx.restore();
    }
    updateGameHUD();
    animationId = requestAnimationFrame(animate);
    if(high_score < score) {
        high_score = score;
        set("high_score", high_score);
    }
    // Müzik sayaç mantığı
    if (!bossActive && !gameOver && !waveTransition) {
        musicTimer++;
        if (!musicPlaying && musicTimer > 60*10) { // 10 saniye sonra tekrar başlat
            gameMusic();
            musicPlaying = true;
            musicTimer = 0;
        }
    }
    updateIconHUD();
}
window.animate = animate;

function updateGameHUD() {
    const lobbyScreen = document.getElementById('lobbyScreen');
    const scoreboardPanel = document.getElementById('scoreboardPanel');
    const currentWaveNumber = document.getElementById('currentWaveNumber');
    
    // Update the current wave display
    if (currentWaveNumber) {
        currentWaveNumber.textContent = typeof wave === 'number' ? wave : 1;
    }
    
    // Hide scoreboard when in lobby
    if (lobbyScreen && lobbyScreen.style.display !== 'none') {
        if (scoreboardPanel) scoreboardPanel.style.display = 'none';
        return;
    }
    
    // Update the scoreboard with player stats
    if (scoreboardPanel) {
        scoreboardPanel.style.display = 'block';
        updateScoreboardPanel();
    }
}
window.updateGameHUD = updateGameHUD;

function takeDamage(amount = 1.0) {
    if (waveTransition || playerDead || gameOver) return;
    player.hearts -= amount;
    playSound(2);
    if (player.hearts <= 0 && !playerDead && !gameOver) {
        // Patlama efekti karakterin ortasında ve sadece bir kez
        const explosionW = player.width;
        const explosionH = player.height;
        const explosionX = player.x + player.width / 2 - explosionW / 2;
        const explosionY = player.y + player.height / 2 - explosionH / 2;
        createExplosion(explosionX, explosionY, explosionW, explosionH); // default 10 frame
        playerDead = true;
        gameOver = true;
        // Arka plan müziğini durdur
        if (typeof window.music_audio !== 'undefined') {
            window.music_audio.pause();
            window.music_audio.currentTime = 0;
        }
        stopMusic && stopMusic();
        playerImage.src = "images/null.png";
        setTimeout(() => {
            if (!gameOverMusicPlayed) {
                let gameoverAudio = new Audio('sounds/gameover.mp3');
                gameoverAudio.play();
                gameOverMusicPlayed = true;
            }
        }, 3000);
        setTimeout(() => {
            window.location.reload();
        }, 17000);
    }
}
window.takeDamage = takeDamage;

function fireBossBullets() {
    // 3 dağınık mermi (biri düz, biri yukarı, biri aşağı)
    let centerY = boss.y + boss.height/2;
    let playerY = player.y + player.height/2;
    let angleToPlayer = Math.atan2(playerY - centerY, (player.x + player.width) - boss.x);
    let spread = 0.13;
    for (let i = -1; i <= 1; i++) {
        bossBullets.push({
            x: boss.x,
            y: centerY,
            width: 6,
            height: 16,
            speed: 10,
            angle: angleToPlayer + i * spread,
            color: '#00BFFF'
        });
    }
}

function drawBossBullets() {
    bossBullets.forEach((bullet, index) => {
        bullet.x += bullet.speed * Math.cos(bullet.angle);
        bullet.y += bullet.speed * Math.sin(bullet.angle);
        ctx.fillStyle = bullet.color;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(bullet.x, bullet.y, bullet.width, bullet.height);
        // Ekrandan çıkan mermileri sil
        if (bullet.x > canvas.width || bullet.x < 0 || bullet.y < 0 || bullet.y > canvas.height) {
            bossBullets.splice(index, 1);
        }
        // Oyuncuya çarpma kontrolü
        if (bullet.x < player.x + player.width && bullet.x + bullet.width > player.x &&
            bullet.y < player.y + player.height && bullet.y + bullet.height > player.y) {
            if (!player.shield) {
                takeDamage();
            }
            bossBullets.splice(index, 1);
        }
    });
}

function updatePowerupBar() {
    const bar = document.getElementById('powerup-bar');
    let html = '';
    if (player.speedBoost && player.speedBoostTimeLeft > 0) {
        html += `<div class='powerup-item'><img src='images/speed_boost.png' alt='Speed'><span>Speed</span><span class='powerup-timer'>${Math.ceil(player.speedBoostTimeLeft)}s</span></div>`;
    }
    if (player.shield && player.shieldTimeLeft > 0) {
        html += `<div class='powerup-item'><img src='images/shield.png' alt='Shield'><span>Shield</span><span class='powerup-timer'>${Math.ceil(player.shieldTimeLeft)}s</span></div>`;
    }
    if (player.tripleShot && player.tripleShotTimeLeft > 0) {
        html += `<div class='powerup-item'><img src='images/triple_shot.png' alt='Triple'><span>Triple</span><span class='powerup-timer'>${Math.ceil(player.tripleShotTimeLeft)}s</span></div>`;
    }
    bar.innerHTML = html;
}
window.updatePowerupBar = updatePowerupBar;

function showWaveMessage(text, duration = 1800) {
    const el = document.getElementById('wave-message');
    const textEl = document.getElementById('wave-message-text');
    textEl.textContent = text;
    el.classList.add('visible');
    setTimeout(() => {
        el.classList.remove('visible');
    }, duration);
}
window.showWaveMessage = showWaveMessage;

// === MULTIPLAYER ===
let ws;
let myPlayerId = null;
let myPlayerName = null;
let lobbyId = null;
let isLobbyOwner = false;
let allPlayers = {}; // {id: {x, y, ...}}

// === Material UI Hata Popup ===
function showMuiError(msg) {
    const popup = document.getElementById('muiErrorPopup');
    popup.textContent = msg;
    popup.style.display = 'block';
    setTimeout(() => { popup.style.display = 'none'; }, 2600);
}

let pendingLobbyAction = null;

function connectWebSocket() {
    ws = new WebSocket('ws://localhost:8080');
    ws.onopen = () => {
        // Bağlantı açıldıysa bekleyen lobi işlemini gönder
        if (pendingLobbyAction) {
            ws.send(JSON.stringify(pendingLobbyAction));
            pendingLobbyAction = null;
        }
    };
    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'lobby_created') {
            lobbyId = msg.lobbyId;
            isLobbyOwner = msg.owner;
            document.getElementById('lobbyInfo').textContent = `Lobi Kodu: ${lobbyId}`;
            document.getElementById('startGameBtn').style.display = 'block';
            showLobbyWaitingScreen();
        }
        if (msg.type === 'lobby_joined') {
            lobbyId = msg.lobbyId;
            isLobbyOwner = msg.owner;
            document.getElementById('lobbyInfo').textContent = `Lobiye katıldınız. Kod: ${lobbyId}`;
            showLobbyWaitingScreen();
        }
        if (msg.type === 'player_list') {
            updatePlayerList(msg.players);
        }
        if (msg.type === 'game_started') {
            document.getElementById('lobbyScreen').style.display = 'none';
            hideLobbyPanelOnGameStart();
            startGame();
        }
        if (msg.type === 'player_states') {
            allPlayers = {};
            // Update all players with their current states
            msg.players.forEach(p => {
                allPlayers[p.id] = p.state || {};
                allPlayers[p.id].name = p.name;
                
                // Update the lobbyPlayers array with the latest state for the scoreboard
                if (window.lobbyPlayers) {
                    const playerIndex = window.lobbyPlayers.findIndex(pl => pl.id === p.id);
                    if (playerIndex !== -1) {
                        window.lobbyPlayers[playerIndex] = {
                            ...window.lobbyPlayers[playerIndex],
                            state: p.state || { hearts: 0, score: 0, wave: 1 }
                        };
                        // Ensure the player's name is up to date
                        window.lobbyPlayers[playerIndex].name = p.name;
                    }
                }
            });
            
            // Force update the scoreboard with the latest player data
            if (typeof updateScoreboardPanel === 'function') {
                updateScoreboardPanel();
            }
        }
        if (msg.type === 'error') {
            // Check if this is a game start error to show a more specific message
            if (msg.message && msg.message.includes('en az 2 oyuncu')) {
                showMuiError('Oyun Başlatılamadı', msg.message);
                
                // Re-enable the start button with a visual cue
                const startBtn = document.getElementById('startGameBtn');
                const inGameStartBtn = document.getElementById('inGameStartBtn');
                
                if (startBtn) {
                    startBtn.disabled = false;
                    startBtn.style.opacity = '1';
                    startBtn.style.pointerEvents = 'auto';
                    startBtn.textContent = 'Oyunu Başlat (En az 2 oyuncu gerekli)';
                    startBtn.style.backgroundColor = '#f44336'; // Red color to indicate error
                    
                    // Revert the button after 3 seconds
                    setTimeout(() => {
                        if (startBtn) {
                            startBtn.textContent = 'Oyunu Başlat';
                            startBtn.style.backgroundColor = '';
                        }
                    }, 3000);
                }
                
                if (inGameStartBtn) {
                    inGameStartBtn.disabled = false;
                    inGameStartBtn.style.opacity = '1';
                    inGameStartBtn.style.pointerEvents = 'auto';
                    inGameStartBtn.textContent = 'Oyunu Başlat (En az 2 oyuncu gerekli)';
                    inGameStartBtn.style.backgroundColor = '#f44336';
                    
                    setTimeout(() => {
                        if (inGameStartBtn) {
                            inGameStartBtn.textContent = 'Oyunu Başlat';
                            inGameStartBtn.style.backgroundColor = '';
                        }
                    }, 3000);
                }
            } else {
                showMuiError(msg.message);
            }
        }
    };
}

// Lobi oluşturma ve katılma öncesi ws kontrolü
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('createLobbyBtn').onclick = () => {
        const name = document.getElementById('playerNameInput').value.trim();
        if (!name) {
            showMuiError('Lütfen bir isim girin.');
            return;
        }
        myPlayerName = name;
        const action = { type: 'create_lobby', name: myPlayerName };
        if (!ws || ws.readyState === 3) {
            connectWebSocket();
            pendingLobbyAction = action;
        } else if (ws.readyState === 0) {
            pendingLobbyAction = action;
        } else if (ws.readyState === 1) {
            ws.send(JSON.stringify(action));
        }
        myPlayerId = null;
    };
    document.getElementById('joinLobbyBtn').onclick = () => {
        const name = document.getElementById('playerNameInput').value.trim();
        if (!name) {
            showMuiError('Lütfen bir isim girin.');
            return;
        }
        myPlayerName = name;
        const code = document.getElementById('lobbyCodeInput').value;
        const action = { type: 'join_lobby', lobbyId: code, name: myPlayerName };
        if (!ws || ws.readyState === 3) {
            connectWebSocket();
            pendingLobbyAction = action;
        } else if (ws.readyState === 0) {
            pendingLobbyAction = action;
        } else if (ws.readyState === 1) {
            ws.send(JSON.stringify(action));
        }
        myPlayerId = null;
    };
});

// === LOBI PANELI ===
function showInGameLobbyPanel(show) {
    document.getElementById('inGameLobbyPanel').style.display = show ? 'block' : 'none';
}
function updateInGameLobbyPanel() {
    if (!lobbyId) return;
    document.getElementById('inGameLobbyCode').textContent = 'Lobi Kodu: ' + lobbyId;
    let html = '';
    if (window.lobbyPlayers && window.lobbyPlayers.length > 0) {
        window.lobbyPlayers.forEach(p => {
            html += `${p.name || 'Bilinmeyen'}${p.id === myPlayerId ? ' (Siz)' : ''}<br>`;
        });
    }
    document.getElementById('inGamePlayerList').innerHTML = html;
    // Sadece lobi sahibi ve oyun başlamadıysa göster
    document.getElementById('inGameStartBtn').style.display = (isLobbyOwner && !window.gameStarted) ? 'block' : 'none';
}

// Oyuncu listesi güncellemesini hem lobi ekranı hem oyun paneli için yap
function updatePlayerList(players) {
    if (!Array.isArray(players)) return;
    window.lobbyPlayers = players;
    const playerListDiv = document.getElementById('playerList');
    if (!playerListDiv || !document.body.contains(playerListDiv)) return;
    let html = '<b>Oyuncular:</b><br>';
    players.forEach(p => {
        html += `${p.name || 'Bilinmeyen'}${p.id === myPlayerId ? ' (Siz)' : ''}<br>`;
    });
    if (playerListDiv && document.body.contains(playerListDiv)) playerListDiv.innerHTML = html;
    if (typeof updateInGameLobbyPanel === 'function') updateInGameLobbyPanel();
    if (isLobbyOwner && document.getElementById('lobbyOwnerPanelModal') && document.getElementById('lobbyOwnerPanelModal').classList.contains('active')) {
        if (typeof updateLobbyOwnerPanel === 'function') updateLobbyOwnerPanel();
    }
    if (typeof updateScoreboardPanel === 'function') updateScoreboardPanel();
    if (typeof updateLobbyPlayerWaitingPanel === 'function') updateLobbyPlayerWaitingPanel();
}

// Lobiye katılınca veya oluşturunca sadece popup görünsün
function showLobbyWaitingScreen() {
    const lobbyScreen = document.getElementById('lobbyScreen');
    const inGameLobbyPanel = document.getElementById('inGameLobbyPanel');
    const scoreboardPanel = document.getElementById('scoreboardPanel');
    const gameHUD = document.getElementById('gameHUD');
    if (lobbyScreen) lobbyScreen.style.display = 'none';
    if (inGameLobbyPanel) inGameLobbyPanel.style.display = 'none';
    if (scoreboardPanel) scoreboardPanel.style.display = 'none';
    if (gameHUD) gameHUD.style.display = 'none';
    if (isLobbyOwner) {
        showLobbyOwnerPanel(true);
        updateLobbyOwnerPanel();
    } else {
        showLobbyPlayerWaitingPanel(true);
        updateLobbyPlayerWaitingPanel();
    }
}

// Oyun başlatılınca popup'ı kapat
function hideLobbyPanelOnGameStart() {
    showLobbyOwnerPanel(false);
    let modal = document.getElementById('lobbyPlayerWaitingModal');
    if (modal) modal.style.display = 'none';
    window.gameStarted = true;
    showInGameLobbyPanel(false);
    updateLeftPlayerListPanel();
}

// Oyun başladığında kendi id'mizi bulmak için ilk state gönderiminde id'yi kaydet
function sendPlayerState() {
    if (!ws || ws.readyState !== 1 || !lobbyId) return;
    const state = {
        x: player.x,
        y: player.y,
        hearts: player.hearts,
        score: score,
        wave: wave
    };
    ws.send(JSON.stringify({ type: 'player_update', state }));
}

// Oyun döngüsünde state gönder (60 FPS)
setInterval(() => {
    if (lobbyId && document.getElementById('lobbyScreen') && document.getElementById('lobbyScreen').style.display === 'none') {
        sendPlayerState();
    }
}, 1000/60); // 60 FPS

// Çok oyunculu karakter çizimi
drawOtherPlayers = function() {
    if (!allPlayers) return;
    Object.keys(allPlayers).forEach(pid => {
        if (pid === myPlayerId) return; // Kendini çizme (zaten var)
        const p = allPlayers[pid];
        if (!p || typeof p.x !== 'number' || typeof p.y !== 'number') return;
        ctx.save();
        ctx.globalAlpha = 0.4; // Saydamlık
        ctx.drawImage(playerImage, p.x, p.y, player.width, player.height);
        ctx.globalAlpha = 1.0;
        // İsim etiketi
        ctx.font = "10px 'Press Start 2P'";
        ctx.fillStyle = '#fff';
        ctx.fillText(p.name || 'Bilinmeyen', p.x, p.y - 8);
        ctx.restore();
    });
};

// drawPlayer fonksiyonunu güncelle
const originalDrawPlayer = drawPlayer;
drawPlayer = function() {
    originalDrawPlayer();
    drawOtherPlayers();
};

// === ODA LISTESI POPUP ===
let lobbyListWs = null;
function showLobbyListModal() {
    const modal = document.getElementById('lobbyListModal');
    modal.classList.add('active');
    document.getElementById('lobbyListContainer').innerHTML = 'Yükleniyor...';
    if (!lobbyListWs || lobbyListWs.readyState !== 1) {
        lobbyListWs = new WebSocket('ws://localhost:8080');
        lobbyListWs.onopen = () => {
            lobbyListWs.send(JSON.stringify({ type: 'list_lobbies' }));
        };
        lobbyListWs.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.type === 'lobby_list') {
                renderLobbyList(msg.lobbies);
            }
        };
    } else {
        lobbyListWs.send(JSON.stringify({ type: 'list_lobbies' }));
    }
}
function hideLobbyListModal() {
    document.getElementById('lobbyListModal').classList.remove('active');
}
function renderLobbyList(lobbies) {
    const container = document.getElementById('lobbyListContainer');
    if (!lobbies || lobbies.length === 0) {
        container.innerHTML = '<i>Hiç açık oda yok.</i>';
        return;
    }
    container.innerHTML = '';
    lobbies.forEach(lobby => {
        const div = document.createElement('div');
        div.className = 'lobby-list-item';
        let dolu = lobby.players.length >= 4;
        div.innerHTML = `<b>Oda:</b> ${lobby.id} <br><b>Sahibi:</b> ${lobby.owner || 'Bilinmeyen'}<br><b>Oyuncular:</b> ${lobby.players.length}/4 ${dolu ? '<span style=\'color:#ff5252\'>(Dolu)</span>' : ''}`;
        div.style.opacity = dolu ? '0.5' : '1';
        div.style.pointerEvents = dolu ? 'none' : 'auto';
        div.onclick = () => {
            if (!dolu) {
                document.getElementById('lobbyCodeInput').value = lobby.id;
                hideLobbyListModal();
            }
        };
        container.appendChild(div);
    });
}
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('showLobbyListBtn').onclick = showLobbyListModal;
    document.getElementById('closeLobbyListModal').onclick = hideLobbyListModal;
    // Çarpı butonları lobiden çıkış yapsın
    document.getElementById('closeLobbyOwnerPanel').onclick = leaveLobby;
    document.getElementById('ownerPanelStartBtn').onclick = () => {
        ws.send(JSON.stringify({ type: 'start_game' }));
    };
    document.getElementById('leaveLobbyBtn').onclick = leaveLobby;
    const ownerLeaveBtn = document.getElementById('ownerPanelLeaveBtn');
    if (ownerLeaveBtn) ownerLeaveBtn.onclick = leaveLobby;
});

// === ODA YÖNETİM PANELİ ===
function showLobbyOwnerPanel(show) {
    const modal = document.getElementById('lobbyOwnerPanelModal');
    if (show) modal.classList.add('active');
    else modal.classList.remove('active');
}
function updateLobbyOwnerPanel() {
    const roomCodeDiv = document.getElementById('ownerPanelRoomCode');
    const ownerNameDiv = document.getElementById('ownerPanelOwnerName');
    const playerListDiv = document.getElementById('ownerPanelPlayerList');
    if (!roomCodeDiv || !ownerNameDiv || !playerListDiv) return;
    if (!document.body.contains(roomCodeDiv) || !document.body.contains(ownerNameDiv) || !document.body.contains(playerListDiv)) return;
    if (roomCodeDiv && document.body.contains(roomCodeDiv)) roomCodeDiv.innerHTML = `<b>Oda Kodu:</b> ${lobbyId}`;
    if (ownerNameDiv && document.body.contains(ownerNameDiv)) ownerNameDiv.innerHTML = `<b>Sahibi:</b> ${myPlayerName}`;
    let html = '<b>Oyuncular:</b><br>';
    if (window.lobbyPlayers && window.lobbyPlayers.length > 0) {
        window.lobbyPlayers.forEach(p => {
            html += `${p.name || 'Bilinmeyen'}${p.id === myPlayerId ? ' (Siz)' : ''}<br>`;
        });
    }
    if (playerListDiv && document.body.contains(playerListDiv)) playerListDiv.innerHTML = html;
    // Sadece çarpı butonu
    const panel = playerListDiv.parentElement;
    let row = document.getElementById('ownerPanelLeaveBtnRow');
    if (!row) {
        row = document.createElement('div');
        row.id = 'ownerPanelLeaveBtnRow';
        row.style.display = 'flex';
        row.style.justifyContent = 'flex-end';
        row.style.alignItems = 'center';
        row.innerHTML = `<button class="close-btn" id="closeLobbyOwnerPanel">×</button>`;
        panel.appendChild(row);
        document.getElementById('closeLobbyOwnerPanel').onclick = leaveLobby;
    }
}
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('closeLobbyOwnerPanel').onclick = () => showLobbyOwnerPanel(false);
    document.getElementById('ownerPanelStartBtn').onclick = () => {
        ws.send(JSON.stringify({ type: 'start_game' }));
    };
    document.getElementById('leaveLobbyBtn').onclick = leaveLobby;
    const ownerLeaveBtn = document.getElementById('ownerPanelLeaveBtn');
    if (ownerLeaveBtn) ownerLeaveBtn.onclick = leaveLobby;
});
// Oyuncu için bekleme popup'ı fonksiyonları
function showLobbyPlayerWaitingPanel(show) {
    let modal = document.getElementById('lobbyPlayerWaitingModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'lobbyPlayerWaitingModal';
        modal.className = 'mui-modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <button class="close-btn" id="playerWaitingCloseBtn">×</button>
                <h3 style="margin-top:10px;">Lobiye Katıldınız</h3>
                <div id="playerWaitingRoomCode" style="margin-bottom:8px;"></div>
                <div id="playerWaitingPlayerList" style="margin-bottom:16px;"></div>
            </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('playerWaitingCloseBtn').onclick = leaveLobby;
    }
    modal.style.display = show ? 'flex' : 'none';
}
function updateLobbyPlayerWaitingPanel() {
    const codeDiv = document.getElementById('playerWaitingRoomCode');
    const listDiv = document.getElementById('playerWaitingPlayerList');
    if (!codeDiv || !listDiv || !document.body.contains(codeDiv) || !document.body.contains(listDiv)) return;
    if (codeDiv && document.body.contains(codeDiv) && lobbyId) codeDiv.innerHTML = `<b>Oda Kodu:</b> ${lobbyId}`;
    if (listDiv && document.body.contains(listDiv) && window.lobbyPlayers) {
        let html = '<b>Oyuncular:</b><br>';
        window.lobbyPlayers.forEach(p => {
            html += `${p.name || 'Bilinmeyen'}<br>`;
        });
        listDiv.innerHTML = html;
    }
}
// Oyun başlatılınca popup'ı kapat
function hideLobbyPanelOnGameStart() {
    showLobbyOwnerPanel(false);
    let modal = document.getElementById('lobbyPlayerWaitingModal');
    if (modal) modal.style.display = 'none';
    window.gameStarted = true;
    showInGameLobbyPanel(false);
    updateLeftPlayerListPanel();
}
// Oyuncu listesi güncellemesinde bekleme popup'ını da güncelle
function updatePlayerList(players) {
    if (!Array.isArray(players)) return;
    window.lobbyPlayers = players;
    const playerListDiv = document.getElementById('playerList');
    if (!playerListDiv || !document.body.contains(playerListDiv)) return;
    let html = '<b>Oyuncular:</b><br>';
    players.forEach(p => {
        html += `${p.name || 'Bilinmeyen'}${p.id === myPlayerId ? ' (Siz)' : ''}<br>`;
    });
    if (playerListDiv && document.body.contains(playerListDiv)) playerListDiv.innerHTML = html;
    updateInGameLobbyPanel && updateInGameLobbyPanel();
    if (isLobbyOwner && document.getElementById('lobbyOwnerPanelModal') && document.getElementById('lobbyOwnerPanelModal').classList.contains('active')) {
        updateLobbyOwnerPanel && updateLobbyOwnerPanel();
    }
    updateScoreboardPanel && updateScoreboardPanel();
    updateLobbyPlayerWaitingPanel && updateLobbyPlayerWaitingPanel();
}

// Lobiden ayrıl fonksiyonu
function leaveLobby() {
    if (ws) {
        ws.close();
        ws = null;
    }
    const lobbyScreen = document.getElementById('lobbyScreen');
    if (lobbyScreen) lobbyScreen.style.display = 'flex';
    const lobbyInfo = document.getElementById('lobbyInfo');
    if (lobbyInfo) lobbyInfo.textContent = '';
    const startGameBtn = document.getElementById('startGameBtn');
    if (startGameBtn) startGameBtn.style.display = 'none';
    const inGameLobbyPanel = document.getElementById('inGameLobbyPanel');
    if (inGameLobbyPanel) inGameLobbyPanel.style.display = 'none';
    const scoreboardPanel = document.getElementById('scoreboardPanel');
    if (scoreboardPanel) scoreboardPanel.style.display = 'none';
    const gameHUD = document.getElementById('gameHUD');
    if (gameHUD) gameHUD.style.display = 'none';
    let modal = document.getElementById('lobbyPlayerWaitingModal');
    if (modal) modal.style.display = 'none';
    showLobbyOwnerPanel(false);
}

// Oyun sırasında sol minimal oyuncu listesi
function updateLeftPlayerListPanel() {
    const panel = document.getElementById('leftPlayerListPanel');
    const list = document.getElementById('leftPlayerList');
    if (panel && !window.lobbyPlayers || window.lobbyPlayers.length === 0 || document.getElementById('lobbyScreen').style.display !== 'none') {
        panel.style.display = 'none';
        return;
    }
    let html = '';
    window.lobbyPlayers.forEach(p => {
        html += `<div class='left-player-item'><span class='left-player-avatar'>${p.name ? p.name[0].toUpperCase() : '?'}</span>${p.name || 'Bilinmeyen'}</div>`;
    });
    if (list && panel) {
        list.innerHTML = html;
        panel.style.display = 'block';
    }
}

// Skor tablosunu güncelleyen fonksiyon
function updateScoreboardPanel() {
    const panel = document.getElementById('scoreboardPanel');
    const list = document.getElementById('scoreboardList');
    const lobbyScreen = document.getElementById('lobbyScreen');
    
    // Check if required elements exist
    if (!panel || !list || !lobbyScreen) return;
    
    // Don't show scoreboard in lobby
    if (lobbyScreen.style.display !== 'none') {
        panel.style.display = 'none';
        return;
    }
    
    // Make sure we have player data
    if (!window.lobbyPlayers || !Array.isArray(window.lobbyPlayers) || window.lobbyPlayers.length === 0) {
        panel.style.display = 'none';
        return;
    }
    
    // Update local player state if this is the current player
    window.lobbyPlayers = window.lobbyPlayers.map(p => {
        // If this is the current player, ensure we have the latest state
        if (p.id === myPlayerId) {
            return {
                ...p,
                state: {
                    x: player?.x || 0,
                    y: player?.y || 0,
                    hearts: player?.hearts ?? 0,
                    score: typeof score === 'number' ? score : 0,
                    wave: typeof wave === 'number' ? wave : 1
                }
            };
        }
        // For other players, ensure we have valid state data
        return {
            ...p,
            state: {
                hearts: typeof p.state?.hearts === 'number' ? p.state.hearts : 0,
                score: typeof p.state?.score === 'number' ? p.state.score : 0,
                wave: typeof p.state?.wave === 'number' ? p.state.wave : 1,
                ...p.state // Keep any other state properties
            }
        };
    });
    
    // Sort players by score (highest first)
    const sortedPlayers = [...window.lobbyPlayers].sort((a, b) => {
        const aScore = a.state?.score || 0;
        const bScore = b.state?.score || 0;
        return bScore - aScore;
    });
    
    // Generate the scoreboard HTML
    let html = '';
    sortedPlayers.forEach((p, index) => {
        const isMe = p.id === myPlayerId;
        const playerState = p.state || {};
        const hearts = typeof playerState.hearts === 'number' ? playerState.hearts.toFixed(1) : '0.0';
        const score = playerState.score || 0;
        const wave = playerState.wave || 1;
        
        // Add a crown emoji for the top player
        const rankEmoji = index === 0 ? '👑 ' : '';
        
        html += `
        <div style="display: flex; ${isMe ? 'background: rgba(255, 255, 255, 0.1); border-radius: 6px;' : ''} padding: 6px 8px; margin: 2px 0; align-items: center;">
            <div style="flex: 0.5; text-align: center; font-weight: bold;">${index + 1}</div>
            <div style="flex: 3; padding-left: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${rankEmoji}${p.name || 'Bilinmeyen'}
            </div>
            <div style="flex: 1.5; text-align: center; color: #FF5252; font-weight: 500;">${hearts} ❤️</div>
            <div style="flex: 1.5; text-align: center; font-weight: 500;">${score}</div>
            <div style="flex: 1; text-align: center; color: #4CAF50;">${wave}</div>
        </div>`;
    });
    
    // Update the DOM
    if (list && document.body.contains(list)) {
        list.innerHTML = html;
    }
    
    // Make sure the panel is visible
    if (panel && document.body.contains(panel)) {
        panel.style.display = 'block';
    }
    // Lobi sahibi tek başına ise Oyunu Başlat butonunu pasif yap
    const startBtn = document.getElementById('startGameBtn');
    const inGameStartBtn = document.getElementById('inGameStartBtn');
    const isOwner = isLobbyOwner;
    const enoughPlayers = window.lobbyPlayers.length > 1;
    if (startBtn) {
        startBtn.disabled = !enoughPlayers;
        startBtn.style.opacity = enoughPlayers ? '1' : '0.5';
        startBtn.style.pointerEvents = enoughPlayers ? 'auto' : 'none';
    }
    if (inGameStartBtn) {
        inGameStartBtn.disabled = !enoughPlayers;
        inGameStartBtn.style.opacity = enoughPlayers ? '1' : '0.5';
        inGameStartBtn.style.pointerEvents = enoughPlayers ? 'auto' : 'none';
    }
}

function updateIconHUD() {
    const hud = document.getElementById('iconHUD');
    const hearts = document.getElementById('iconHUDHearts');
    const scoreSpan = document.getElementById('iconHUDScore');
    const waveSpan = document.getElementById('iconHUDWave');
    const lobbyScreen = document.getElementById('lobbyScreen');
    if (!hud || !hearts || !scoreSpan || !waveSpan || !lobbyScreen) return;
    if (lobbyScreen.style.display !== 'none') {
        hud.style.display = 'none';
        return;
    }
    hud.style.display = 'flex';
    hearts.textContent = player.hearts.toFixed(1);
    scoreSpan.textContent = score;
    waveSpan.textContent = wave;
}
// animate fonksiyonunda updateIconHUD çağrısı ekle
const originalAnimate = animate;
animate = function() {
    originalAnimate();
    updateIconHUD();
}