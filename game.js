const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let isShooted = 0;

let playerImage = new Image();
playerImage.src = 'images/player.png';  // Karakterin resmi

const enemys = [
	"images/enemy_1.png",
	"images/enemy_2.png",
	"images/enemy_3.png",
	"images/enemy_4.png",
	"images/enemy_5.png"
];    // Düşmanın resmi

let enemyImage = new Image();
enemyImage.src = enemys[Math.floor(Math.random() * (enemys.length +1))];

let bulletImage = new Image();
bulletImage.src = 'images/bullet.png';  // Merminin resmi

let fireButtonImage = new Image();
fireButtonImage.src = 'images/fire.png'; // Ateş etme butonu resmi

let upButtonImage = new Image();
upButtonImage.src = 'images/up.png'; // Yukarı butonu

let downButtonImage = new Image();
downButtonImage.src = 'images/down.png'; // Aşağı butonu

let heartImage = new Image();
heartImage.src = 'images/heart.png'; // Kalp resmi

let hearts = []; // Kalp nesnelerini saklamak için bir dizi

// Kalp oluşturma fonksiyonu
function createHeart() {
    const createChance = Math.floor((Math.random() * 4) + 1);
    if (createChance === 2) { // Belirli bir şansa göre kalp oluştur
        let size = 30; // Kalp boyutu
        let y = Math.random() * (canvas.height - size); // Rastgele y pozisyonu
        
        // Kalp özellikleri
        hearts.push({
            x: canvas.width,
            y: y,
            width: size,
            height: size,
            speed: 2, // Kalp hareket hızı
            image: heartImage
        });
    }
}

// Kalpleri çizme fonksiyonu
function drawHearts() {
    hearts.forEach((heart, index) => {
        heart.x -= heart.speed; // Kalbi sola kaydır
        
        // Kalbi çiz
        ctx.drawImage(heart.image, heart.x, heart.y, heart.width, heart.height);
        
        // Kalp canvas dışına çıktığında sil
        if (heart.x + heart.width < 0) {
            hearts.splice(index, 1);
        }
        
        // Oyuncuyla çarpışma kontrolü
        if (heart.x < player.x + player.width && heart.x + heart.width > player.x &&
            heart.y < player.y + player.height && heart.y + heart.height > player.y) {
            player.hearts++; // Oyuncunun kalp sayısını artır
            hearts.splice(index, 1); // Kalbi sil
            playSound(7); // Kalp alma sesini çal
        }
    });
}

let explosionImage = new Image();
explosionImage.src = 'images/explosion.png'; // Patlama efekti resmi

let explosions = []; // Patlama efektlerini saklamak için bir dizi

function createExplosion(x, y, w, h) {
    explosions.push({
        x: x,
        y: y,
        width: w, // Patlama genişliği
        height: h, // Patlama yüksekliği
        duration: 10 // Patlama süresi
    });
}

const sounds = [
    "sounds/shoot.wav",
    "sounds/dead.wav",
    "sounds/hurt.wav",
    "sounds/gameover.mp3",
    "sounds/coin.wav",
    "sounds/gamestart.mp3",
    "sounds/gamemusic.mp3",
    "sounds/heart.mp3"
];

function desktopUser() {
    const userAgent = navigator.userAgent;
    return !/Mobi|Android/i.test(userAgent);
}

function displayHearts() {
    for (let i = 0; i < player.hearts; i++) {
        ctx.drawImage(heartImage, 20 + i * 30, 25, 28, 28); // Kalp resmini yan yana çiz
    }
}

let player = {
    x: 50,
    y: canvas.height / 2 - 25,
    width: 50,
    height: 50,
    speed: 5,
    bullets: [],
    hearts: 3
};

let enemies = [];
let score = 0;
let gameOver = false;
let time = 0;
let imagesLoaded = false;

function drawBackground() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 100; i++) {
        let x = Math.random() * canvas.width;
        let y = Math.random() * canvas.height;
        ctx.fillStyle = 'white';
        ctx.fillRect(x, y, 2, 2);
    }
}

function drawPlayer() {
    ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);
}

function movePlayer() {
    if (keys['ArrowUp'] && player.y > 0) {
        player.y -= player.speed;
    }
    if (keys['ArrowDown'] && player.y < canvas.height - player.height) {
        player.y += player.speed;
    }
}

function shoot() {
	if(!gameOver && !isShooted) {
		isShooted = 1;
   	 player.bullets.push({ x: player.x + player.width, y: player.y + player.height / 2 - 15, width: 40, height: 30, speed: 4 });
   	 playSound(0, 0);
   	 
   	 if(!desktopUser()) {
   	 	setTimeout(() => { isShooted = 0; }, 50);
    	}
	}
}

function drawBullets() {
    player.bullets.forEach((bullet, index) => {
        bullet.x += bullet.speed;
        ctx.drawImage(bulletImage, bullet.x, bullet.y, bullet.width, bullet.height);
        if (bullet.x > canvas.width) {
            player.bullets.splice(index, 1);
        }
    });
}

// Düşman oluşturma fonksiyonu
function createEnemy() {
    const createChance = Math.floor((Math.random() * 6) + 1);
    if (createChance == 3) {
        let size = Math.random() * 30 + 20;
        let y = Math.random() * (canvas.height - size);
        
        // Her düşman için rastgele bir resim seç
        let enemyImg = new Image();
        let randomEnemyIndex = Math.floor(Math.random() * enemys.length);  // 0 ile (enemys.length - 1) arasında rastgele bir sayı
        enemyImg.src = enemys[randomEnemyIndex];

        // Düşman özelliklerine resim ekle
        enemies.push({
            x: canvas.width,
            y: y,
            width: size,
            height: size,
            speed: 3,
            initialY: y,
            amplitude: 50,
            frequency: 0.05,
            image: enemyImg  // Düşmana resim ekleniyor
        });
    }
}

// Düşmanları çizme fonksiyonu
function drawEnemies() {
	if(gameOver) return;
	
    time += 0.05;  // Zamanı artırarak düşman hareketini kontrol et
    enemies.forEach((enemy, index) => {
        // Düşman y pozisyonunu yukarı-aşağı hareket ettir
        enemy.y = enemy.initialY + Math.sin(time + index) * 10;  // Yukarı aşağı hareket
        enemy.x -= enemy.speed;  // Düşmanı sola kaydır
        
        // Düşmanın kendi resmini kullanarak çiz
        ctx.drawImage(enemy.image, enemy.x, enemy.y, enemy.width, enemy.height);

        // Düşman canvas dışına çıktığında sil
        if (enemy.x + enemy.width < 0) {
            enemies.splice(index, 1);
            score += 10;
            playSound(4, 0);
        }
        
        // Çarpışma kontrolü
        if (enemy.x < player.x + player.width && enemy.x + enemy.width > player.x &&
            enemy.y < player.y + player.height && enemy.y + enemy.height > player.y) {
            takeDamage(); // Hasar al
    		enemies.splice(index, 1); // Düşmanı sil
        }

        // Mermi çarpışma kontrolü
        player.bullets.forEach((bullet, bIndex) => {
            if (bullet.x < enemy.x + enemy.width && bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height && bullet.y + bullet.height > enemy.y) {
                createExplosion(enemy.x, enemy.y, enemy.width, enemy.height);
                enemies.splice(index, 1);
                player.bullets.splice(bIndex, 1);
                score += 20;
                playSound(1, 0);
            }
        });
    });
}

function drawExplosions() {
    explosions.forEach((explosion, index) => {
        ctx.drawImage(explosionImage, explosion.x, explosion.y, explosion.width, explosion.height);
        explosion.duration--;

        // Patlama süresi dolduğunda patlamayı diziden çıkar
        if (explosion.duration <= 0) {
            explosions.splice(index, 1);
        }
    });
}

function displayScore() {
	if(!gameOver) {
  	  ctx.fillStyle = 'white';
    	ctx.font = "10px 'Press Start 2P'"; // 8-bit pixel font
  	  ctx.fillText("Score: " + score, canvas.width - 110, 45);
    }
}

function removeScore() {
    ctx.fillStyle = 'white';
    ctx.font = "10px 'Press Start 2P'"; // 8-bit pixel font
    ctx.fillText("", canvas.width - 110, 45);
}

function endGame() {
    playSound(3);
    removeScore();
    stopMusic();
    clearTimeout(musicID);
    
    gameOver = true;
    document.getElementById('finalScore').innerText = "Final Score: " + score;
    document.getElementById('gameOver').style.display = 'block';
    
    document.getElementById('controls').style.display = 'none'; 
    
    cancelAnimationFrame(animationId);
    clearInterval(enemySpawnInterval);
    clearInterval(heartSpawnInterval);
}

document.getElementById('restart').addEventListener('click', () => {
    window.location.reload();
});

let enemySpawnInterval; // Düşman yaratma aralığı için değişken
let heartSpawnInterval; // Kalp yaratma aralığı için değişken
let animationId; // Animasyon kimliği

// Başlat butonuna tıklama olayı
document.getElementById('start').addEventListener('click', () => {
    startGame();  // Oyunu başlat
});

let musicID

// Oyun başlama fonksiyonu
function startGame() {
    // Başlangıç ekranını gizle
    document.getElementById('titleScreen').style.display = 'none'; 
    
    if(!desktopUser()) {
    	// Kontrol butonlarını göster
   	 document.getElementById('controls').style.display = 'flex'; 
    }
    
    resetGame();  // Oyunu sıfırla
    animate();  // Animasyonu başlat
    enemySpawnInterval = setInterval(createEnemy, 350);  // Düşman oluşturma
    heartSpawnInterval = setInterval(createHeart, (1000 * 10)); // Kalp oluşturma
    playSound(5, 0);
    
    musicID = setTimeout(() => { gameMusic(); }, 6000);
}

// Oyun sıfırlama fonksiyonu
function resetGame() {
    player.hearts = 3; // Oyuncunun kalp sayısını sıfırla
    score = 0; // Skoru sıfırla
    enemies = []; // Düşmanları sıfırla
    player.bullets = []; // Mermileri sıfırla
    hearts = []; // Kalpleri sıfırla
    gameOver = false; // Oyun bitmedi
    time = 0; // Zamanı sıfırla
}


let damageImage = new Image();
damageImage.src = 'images/damage.png'; // Hasar efekti resmi

let isDamaged = false; // Hasar durumu

// Hasar alma fonksiyonu
function takeDamage() {
    player.hearts--;
    
    if(!isDamaged)
    	ctx.filter = 'brightness(1.75)';
    
    isDamaged = true; // Hasar durumu aktif
    playSound(2, 0); // Hasar sesi çal
	
    if (player.hearts === 0) {
        endGame(); // Oyun biter
    }
}

// Hasar efektini çizme fonksiyonu
function drawDamageEffect() {
    if (isDamaged) {
        ctx.drawImage(damageImage, player.x, player.y, player.width, player.height);
        // Hasar efektini sadece belirli bir süre göstermek için timeout kullanabilirsin
        setTimeout(() => {
        	ctx.filter = 'none';
            isDamaged = false; // Efekt sonrası hasar durumunu sıfırla
        }, 100); // 60ms süre
    }
}

function animate() {
    if (!gameOver) {
        drawBackground(); // Arka planı çiz
        drawPlayer(); // Oyuncuyu çiz
        movePlayer(); // Oyuncuyu hareket ettir
        drawBullets(); // Mermileri çiz
        drawEnemies(); // Düşmanları çiz
        drawExplosions(); // Patlama efektlerini çiz
        drawHearts(); // Uçuşan kalpleri çiz
        displayScore(); // Skoru göster
        displayHearts(); // Kalp sayısını göster
        drawDamageEffect(); // Hasar efektini çiz
        animationId = requestAnimationFrame(animate); // Animasyonu devam ettir
    }
}

// Klavye olayları
const keys = {};

window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    
    if(e.code === "Space") {
    	shoot();
    }
});
window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    
    if(e.code === "Space") {
    	isShooted = 0;
    }
});

upButton.addEventListener('touchstart', () => {
    keys['ArrowUp'] = true;
});

upButton.addEventListener('touchend', () => {
    keys['ArrowUp'] = false;
});

downButton.addEventListener('touchstart', () => {
    keys['ArrowDown'] = true;
});

downButton.addEventListener('touchend', () => {
    keys['ArrowDown'] = false;
});

document.getElementById('fireButton').addEventListener('click', () => {
    shoot(); // Ateş et
});

function playSound(index) {
    if (index >= 0 && index < sounds.length) {
        const audio = new Audio(sounds[index]); // Yeni bir Audio objesi oluştur
        audio.play()
    }
}

function stopSound(index) {
    if (index >= 0 && index < sounds.length) {
        const audio = new Audio(sounds[index]); // Yeni bir Audio objesi oluştur
        audio.pause()
    }
}

const music_audio = new Audio(sounds[6]); // Yeni bir Audio objesi oluştur

function stopMusic() {
	music_audio.pause()
}

function gameMusic() {
	music_audio.play();
	musicID = setTimeout(() => { gameMusic(); }, 162000);
}

drawBackground();