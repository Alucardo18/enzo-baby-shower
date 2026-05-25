/* ==========================================================================
   ENZO BABY CELEBRATION - APP LOGIC (app.js)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    // --- 📅 CONFIGURACIÓN DE FECHA EVENTO 📅 ---
    // Fec objetivo: Sábado 06 de Junio de 2026 a las 17:30 hrs.
    const EVENT_DATE = new Date('June 6, 2026 17:30:00').getTime();

    // --- 🎵 DUAL AUDIO SYSTEM (LOCAL MP3 & PROCEDURAL LO-FI SYNTH) 🎵 ---
    let audioContext = null;
    let localAudio = null;
    let isSynthPlaying = false;
    let isAudioPlaying = false;
    let synthTimer = null;
    let currentChordIndex = 0;
    let isUsingSynth = false;

    // Chords para el Sintetizador Lofi (Cmaj7, Am7, Fmaj7, G7 - Frecuencias Hz)
    const CHORDS = [
        [130.81, 164.81, 196.00, 246.94], // C3, E3, G3, B3 (Cmaj7 - Cálido)
        [110.00, 130.81, 164.81, 196.00], // A2, C3, E3, G3 (Am7 - Nostálgico)
        [87.31, 130.81, 174.61, 220.00],  // F2, C3, F3, A3 (Fmaj7 - Soñador)
        [98.00, 146.83, 196.00, 246.94]   // G2, D3, G3, B3 (G7 - Brillante)
    ];

    // Inicializar el sistema de audio
    function initAudio() {
        if (localAudio || audioContext) return; // Ya inicializado

        localAudio = new Audio();
        localAudio.src = 'audio.mp3';
        localAudio.loop = true;
        localAudio.volume = 0.6;

        // Intentar reproducir el MP3 local
        localAudio.play().then(() => {
            isAudioPlaying = true;
            isUsingSynth = false;
            updatePlayerUI('Around The World (Santti Remix)', 'REPRODUCIENDO');
        }).catch((err) => {
            // Si falla o no existe (GitHub Pages 404), activamos el sintetizador procedural
            console.log('Audio local no encontrado o bloqueado, activando Sintetizador Lofi Procedural...');
            setupProceduralSynth();
        });
    }

    // Configuración del sintetizador retro con Web Audio API
    function setupProceduralSynth() {
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            audioContext = new AudioContextClass();
            isUsingSynth = true;
            isSynthPlaying = true;
            
            // Iniciar secuenciador de acordes
            playNextChord();
            synthTimer = setInterval(playNextChord, 3000); // Acorde cada 3 segundos

            updatePlayerUI('Procedural Lofi Synth', 'REPRODUCIENDO');
        } catch (e) {
            console.error('Web Audio API no soportado en este navegador:', e);
            updatePlayerUI('Audio Inactivo', 'ERROR');
        }
    }

    // Sintetizar un acorde cálido de lo-fi
    function playNextChord() {
        if (!isSynthPlaying || !audioContext) return;

        // Si el contexto está suspendido, lo reanudamos
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        const now = audioContext.currentTime;
        const chord = CHORDS[currentChordIndex];

        // Filtro pasabajos común (para el sonido opaco "lo-fi")
        const filter = audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, now);
        filter.frequency.exponentialRampToValueAtTime(750, now + 2.5); // Barrido de filtro lento
        filter.Q.setValueAtTime(1, now);

        // Nivel de volumen / Envolvente ganancia
        const masterGain = audioContext.createGain();
        masterGain.gain.setValueAtTime(0, now);
        masterGain.gain.linearRampToValueAtTime(0.2, now + 0.5); // Fade in suave
        masterGain.gain.exponentialRampToValueAtTime(0.001, now + 2.9); // Fade out antes del sig. acorde

        // LFO (Oscilador de baja frecuencia) para crear el efecto "trémolo / tape wobble"
        const lfo = audioContext.createOscillator();
        const lfoGain = audioContext.createGain();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(4, now); // 4Hz oscilación
        lfoGain.gain.setValueAtTime(8, now); // Intensidad de desafinación en Hz

        // Conectar LFO y Filtro a la salida
        lfo.connect(lfoGain);
        filter.connect(masterGain);
        masterGain.connect(audioContext.destination);

        // Crear osciladores individuales para las notas del acorde
        chord.forEach((freq, idx) => {
            const osc = audioContext.createOscillator();
            
            // Usamos ondas triangulares para un tono suave y retro tipo flauta/órgano
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);
            
            // Modulamos la frecuencia levemente con el LFO para simular cinta retro analógica desafinada
            lfoGain.connect(osc.frequency);

            osc.connect(filter);
            
            osc.start(now);
            osc.stop(now + 3.0);
        });

        lfo.start(now);
        lfo.stop(now + 3.0);

        // Avanzar al siguiente acorde
        currentChordIndex = (currentChordIndex + 1) % CHORDS.length;
    }

    // Actualizar interfaz del reproductor de vinilo
    function updatePlayerUI(name, status) {
        document.getElementById('track-name').textContent = name;
        document.getElementById('track-status').textContent = status;
    }

    // Toggle de Play/Pause
    function toggleAudio() {
        const vinylPlayer = document.getElementById('vinyl-player');
        const vinylDisc = document.getElementById('vinyl-disc');
        const playPauseIcon = document.getElementById('play-pause-icon');

        if (isUsingSynth) {
            if (isSynthPlaying) {
                isSynthPlaying = false;
                vinylDisc.classList.remove('playing');
                vinylPlayer.classList.remove('playing-arm');
                playPauseIcon.className = 'fa-solid fa-play';
                updatePlayerUI('Procedural Lofi Synth', 'PAUSADO');
            } else {
                isSynthPlaying = true;
                if (audioContext && audioContext.state === 'suspended') {
                    audioContext.resume();
                }
                playNextChord(); // Reproducir inmediatamente
                vinylDisc.classList.add('playing');
                vinylPlayer.classList.add('playing-arm');
                playPauseIcon.className = 'fa-solid fa-pause';
                updatePlayerUI('Procedural Lofi Synth', 'REPRODUCIENDO');
            }
        } else if (localAudio) {
            if (isAudioPlaying) {
                localAudio.pause();
                isAudioPlaying = false;
                vinylDisc.classList.remove('playing');
                vinylPlayer.classList.remove('playing-arm');
                playPauseIcon.className = 'fa-solid fa-play';
                updatePlayerUI('Around The World (Santti Remix)', 'PAUSADO');
            } else {
                localAudio.play();
                isAudioPlaying = true;
                vinylDisc.classList.add('playing');
                vinylPlayer.classList.add('playing-arm');
                playPauseIcon.className = 'fa-solid fa-pause';
                updatePlayerUI('Around The World (Santti Remix)', 'REPRODUCIENDO');
            }
        }
    }

    // Evento de clic en reproductor
    document.getElementById('btn-play-pause').addEventListener('click', toggleAudio);


    // --- 🚪 EVENTO PANTALLA DE BIENVENIDA / UNLOCK GATE 🚪 ---
    document.getElementById('btn-enter').addEventListener('click', () => {
        // Inicializar el sistema de audio por interacción
        initAudio();

        // Transición de salida para la pantalla de bienvenida
        const gate = document.getElementById('welcome-gate');
        gate.classList.add('fade-out');

        // Mostrar reproductor flotante
        const player = document.getElementById('vinyl-player');
        player.classList.remove('hidden');
        player.classList.add('playing-arm');
        document.getElementById('vinyl-disc').classList.add('playing');

        // Quitar blur de fondo en la página
        setTimeout(() => {
            document.getElementById('main-content').classList.remove('blur-load');
        }, 300);
    });


    // --- 🕰️ LOGICA CUENTA REGRESIVA 🕰️ ---
    function updateCountdown() {
        const now = new Date().getTime();
        const distance = EVENT_DATE - now;

        if (distance < 0) {
            document.querySelector('.countdown-title').textContent = '¡LA FIESTA HA COMENZADO! 🪐';
            document.getElementById('days').textContent = '00';
            document.getElementById('hours').textContent = '00';
            document.getElementById('minutes').textContent = '00';
            document.getElementById('seconds').textContent = '00';
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        document.getElementById('days').textContent = String(days).padStart(2, '0');
        document.getElementById('hours').textContent = String(hours).padStart(2, '0');
        document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
        document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');
    }

    // Actualizar cuenta regresiva cada segundo
    updateCountdown();
    setInterval(updateCountdown, 1000);


    // --- 📅 ANIMACIÓN SCROLL-DRIVEN EN ITINERARIO (AGENDA) 📅 ---
    const timelineItems = document.querySelectorAll('.timeline-item');
    const timelineProgress = document.querySelector('.timeline-progress');
    const agendaSection = document.getElementById('agenda');

    function animateTimeline() {
        if (!agendaSection || timelineItems.length === 0) return;

        const sectionRect = agendaSection.getBoundingClientRect();
        const windowHeight = window.innerHeight;

        // Calcular porcentaje de scroll dentro de la sección de agenda
        const startOffset = windowHeight * 0.7;
        const totalHeight = sectionRect.height;
        const relativeScroll = startOffset - sectionRect.top;
        
        let percentage = Math.max(0, Math.min(100, (relativeScroll / totalHeight) * 100));
        timelineProgress.style.height = `${percentage}%`;

        // Activar bloques individuales basados en su entrada al Viewport
        timelineItems.forEach((item) => {
            const itemRect = item.getBoundingClientRect();
            // Si el bloque está en el tercio medio de la pantalla
            if (itemRect.top < windowHeight * 0.65) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    window.addEventListener('scroll', animateTimeline);
    animateTimeline(); // Ejecución inicial


    // --- ✍️ MURO DE DESEOS INTERACTIVO Y ARRASTRABLE (DRAG & DROP) ✍️ ---
    const wishesCanvas = document.getElementById('wishes-canvas');
    const wishForm = document.getElementById('wish-form');
    
    // Lista inicial de deseos semilla
    const DEFAULT_WISHES = [
        { author: 'Sofía y Diego', badge: '👾', text: '¡Muchísimas felicidades! Enzo va a ser el más cool del vecindario con esos papás increíbles. Ya queremos que empiece el modo multijugador en vivo. 🎮' },
        { author: 'Tío Carlos', badge: '🚀', text: 'Bienvenido al universo, pequeño Enzo. Que tu vida sea una gran aventura llena de descubrimientos, cohetes y risas espaciales. ¡Abrazos!' },
        { author: 'DJ Mateo', badge: '🎧', text: 'Que el ritmo de tu vida siempre sea alegre y lleno de buena vibra retro. ¡Preparando los beats para festejar tu llegada, Enzo!' }
    ];

    // Cargar deseos guardados o sembrar por defecto
    let wishes = JSON.parse(localStorage.getItem('enzo_wishes')) || DEFAULT_WISHES;

    // Renderizar todos los deseos
    function renderWishes() {
        // Limpiar lienzo manteniendo la cuadrícula de fondo
        const grid = wishesCanvas.querySelector('.canvas-grid-lines');
        wishesCanvas.innerHTML = '';
        wishesCanvas.appendChild(grid);

        wishes.forEach((wish, index) => {
            createWishElement(wish, index);
        });
    }

    // Crear elemento de deseo físico flotante
    function createWishElement(wish, index) {
        const wishEl = document.createElement('div');
        wishEl.className = 'floating-wish';
        
        // Asignar clase de brillo neón aleatoria basada en el índice
        const glows = ['cyan-glow', 'pink-glow', 'purple-glow'];
        wishEl.classList.add(glows[index % glows.length]);

        wishEl.innerHTML = `
            <div class="wish-header">
                <span class="wish-name">${wish.author}</span>
                <span class="wish-icon">${wish.badge}</span>
            </div>
            <div class="wish-body">${wish.text}</div>
        `;

        // Posicionamiento inicial aleatorio dentro del canvas
        // Evitamos las esquinas extremas
        const canvasWidth = wishesCanvas.clientWidth || 300;
        const canvasHeight = wishesCanvas.clientHeight || 300;

        // Calcular rangos seguros
        const maxX = Math.max(10, canvasWidth - 270);
        const maxY = Math.max(10, canvasHeight - 160);

        // Si es el primer render, asignamos posiciones pseudo-aleatorias
        if (!wish.x || wish.x > canvasWidth || wish.y > canvasHeight) {
            wish.x = Math.floor(Math.random() * maxX) + 10;
            wish.y = Math.floor(Math.random() * maxY) + 10;
            wishes[index].x = wish.x;
            wishes[index].y = wish.y;
        }

        wishEl.style.left = `${wish.x}px`;
        wishEl.style.top = `${wish.y}px`;

        // Hacer arrastrable
        makeDraggable(wishEl, index);

        wishesCanvas.appendChild(wishEl);
    }

    // Lógica física de arrastre (Soporta Mouse y Touch para Celular)
    function makeDraggable(element, index) {
        let active = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = wishes[index].x || 0;
        let yOffset = wishes[index].y || 0;

        // Soporte Mouse
        element.addEventListener('mousedown', dragStart);
        wishesCanvas.addEventListener('mousemove', drag);
        wishesCanvas.addEventListener('mouseup', dragEnd);
        wishesCanvas.addEventListener('mouseleave', dragEnd);

        // Soporte Celular (Táctil)
        element.addEventListener('touchstart', dragStart, { passive: true });
        wishesCanvas.addEventListener('touchmove', drag, { passive: false });
        wishesCanvas.addEventListener('touchend', dragEnd);

        function dragStart(e) {
            // Traer tarjeta al frente aumentando el z-index
            document.querySelectorAll('.floating-wish').forEach(el => el.style.zIndex = '10');
            element.style.zIndex = '99';

            let clientX, clientY;
            if (e.type === 'touchstart') {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }

            initialX = clientX - xOffset;
            initialY = clientY - yOffset;

            active = true;
        }

        function drag(e) {
            if (!active) return;
            
            // Prevenir scroll en celular al arrastrar dentro del canvas
            if (e.type === 'touchmove') {
                e.preventDefault();
            }

            let clientX, clientY;
            if (e.type === 'touchmove') {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }

            currentX = clientX - initialX;
            currentY = clientY - initialY;

            // Restringir el arrastre dentro de los bordes del lienzo
            const canvasWidth = wishesCanvas.clientWidth;
            const canvasHeight = wishesCanvas.clientHeight;
            const cardWidth = element.offsetWidth;
            const cardHeight = element.offsetHeight;

            // Límites
            currentX = Math.max(5, Math.min(currentX, canvasWidth - cardWidth - 5));
            currentY = Math.max(5, Math.min(currentY, canvasHeight - cardHeight - 5));

            xOffset = currentX;
            yOffset = currentY;

            element.style.left = `${currentX}px`;
            element.style.top = `${currentY}px`;
        }

        function dragEnd() {
            if (!active) return;
            initialX = currentX;
            initialY = currentY;
            active = false;

            // Guardar nueva posición física en el arreglo global y almacenamiento local
            wishes[index].x = currentX;
            wishes[index].y = currentY;
            localStorage.setItem('enzo_wishes', JSON.stringify(wishes));
        }
    }

    // Enviar nuevo deseo desde formulario
    wishForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const author = document.getElementById('wish-author').value.trim();
        const badge = document.getElementById('wish-badge').value;
        const text = document.getElementById('wish-text').value.trim();

        if (!author || !text) return;

        const newWish = {
            author: author,
            badge: badge,
            text: text
        };

        // Agregar al arreglo, renderizar y guardar
        wishes.push(newWish);
        localStorage.setItem('enzo_wishes', JSON.stringify(wishes));
        
        renderWishes();

        // Reiniciar formulario
        wishForm.reset();
    });

    // Renderizar deseos en carga inicial
    renderWishes();
    // Ajustar posiciones en cambio de tamaño de pantalla
    window.addEventListener('resize', renderWishes);


    // --- 🎟️ FORMULARIO RSVP CON INTEGRACIÓN DIRECTA A WHATSAPP 🎟️ ---
    const rsvpForm = document.getElementById('rsvp-form');
    // Número de teléfono de los papás en formato internacional
    const WA_PHONE = '529993380373'; 

    rsvpForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const name = document.getElementById('rsvp-name').value.trim();
        const status = document.getElementById('rsvp-status').value;
        const guests = document.getElementById('rsvp-guests').value;
        const message = document.getElementById('rsvp-message').value.trim();

        // 1. Guardar localmente para registro visual rápido si es necesario
        const rsvpData = { name, status, guests, message, date: new Date().toISOString() };
        localStorage.setItem('enzo_rsvp_check', JSON.stringify(rsvpData));

        // 2. Redactar el mensaje espacial para WhatsApp
        let waMessage = `✨ *CONFIRMACIÓN ESPACIAL - BABY CELEBRATION* ✨\n\n`;
        waMessage += `🛸 *Invitado(s):* ${name}\n`;
        
        if (status === 'si') {
            waMessage += `✅ *Asistencia:* ¡Confirmadísimo! Voy a celebrar por Enzo 🥂\n`;
            
            const accompanied = parseInt(guests);
            if (accompanied === 0) {
                waMessage += `👥 *Acompañantes:* Voy solo (+0)\n`;
            } else if (accompanied === 1) {
                waMessage += `👥 *Acompañantes:* Voy con pareja/amigo (+1)\n`;
            } else {
                waMessage += `👥 *Acompañantes:* Confirmamos ${accompanied + 1} personas en total (+${accompanied})\n`;
            }
        } else {
            waMessage += `❌ *Asistencia:* Lo siento mucho, no podré ir físicamente. ¡Pero los acompaño de corazón! ✨\n`;
        }

        if (message) {
            waMessage += `\n💬 *Mensaje:* "${message}"\n`;
        }

        waMessage += `\n🛸 _Mensaje generado automáticamente desde la invitación estelar de Enzo._`;

        // 3. Crear enlace y abrir en pestaña nueva
        const encodedText = encodeURIComponent(waMessage);
        const waUrl = `https://wa.me/${WA_PHONE}?text=${encodedText}`;

        // Abrir WhatsApp en nueva pestaña
        window.open(waUrl, '_blank');
        
        alert('🎉 ¡Pase generado! Redirigiéndote a WhatsApp para confirmar asistencia directa con los papás.');
    });

});
